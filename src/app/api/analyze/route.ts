import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function getAvailableVisionModels(): Promise<string[]> {
  try {
    const list = await ai.models.list();
    const candidateModels: string[] = [];

    for await (const m of list) {
      const name = m.name?.replace(/^models\//, "") || "";
      const supportsGenerate = m.supportedActions?.includes("generateContent") ?? true;
      if (supportsGenerate && (name.includes("flash") || name.includes("pro"))) {
        candidateModels.push(name);
      }
    }

    candidateModels.sort((a, b) => {
      const aIsFlash = a.includes("flash") ? 1 : 0;
      const bIsFlash = b.includes("flash") ? 1 : 0;
      return bIsFlash - aIsFlash;
    });

    if (candidateModels.length > 0) return candidateModels;
  } catch (err) {
    console.warn("Could not fetch model list, using fallback priority list.");
  }

  return [
    "gemini-3.8-flash",
    "gemini-3.1-pro-preview",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
  ];
}

export async function POST(req: NextRequest) {
  try {
    const { imagesBase64, userCountry, userTimezone } = await req.json();

    if (!imagesBase64 || !Array.isArray(imagesBase64) || imagesBase64.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    const detectedCountry = userCountry || "India";
    const detectedTz = userTimezone || "Asia/Kolkata";
    const isIndiaMarket = detectedCountry.toLowerCase() === "india";

    const imageParts = imagesBase64.map((base64: string) => ({
      inlineData: {
        mimeType: "image/jpeg",
        data: base64.replace(/^data:image\/\w+;base64,/, ""),
      },
    }));

    const promptText = `You are an international food regulatory compliance auditor, clinical food scientist, and consumer health advocate.

USER LOCATION CONTEXT:
- Detected User Country: "${detectedCountry}" (Timezone: ${detectedTz}).
- All product recommendations MUST strictly be real, branded products commercially available in the ${detectedCountry} retail/online market.

LANGUAGE RULES (STRICT):
${
  isIndiaMarket
    ? `- Since the user is browsing from India:
       * Provide "primaryReason" in English AND provide "primaryReasonHindi" in natural Hindi.
       * Provide "complianceNotes" in English AND provide "complianceNotesHindi" in Hindi.
       * In "flaggedIngredients", provide "concern" in English AND provide "concernHindi" in Hindi.`
    : `- Since the user is NOT in India (they are in "${detectedCountry}"):
       * Provide ALL responses exclusively in English.
       * Leave "primaryReasonHindi", "complianceNotesHindi", and "concernHindi" as empty strings (""). Do NOT generate any Hindi text.`
}

1. Legibility:
   If photos are unreadable, cut off, or miss the ingredient list, set isReadable: false.

2. DETERMINISTIC HEALTH SCORING (Start at 100 points, apply strict math):
   A. Harmful Additives (Major Deductions):
      - Artificial Preservatives (Sodium Benzoate / INS 211, Potassium Sorbate): -30 pts.
      - Hydrogenated Oils / Palm Oil / Fractionated Fat: -25 pts.
      - Synthetic Food Dyes / Artificial Colors: -25 pts.
      - Artificial Sweeteners (Sucralose, Aspartame, Acesulfame K): -20 pts.
   B. Nutritional Balance (Minor Deductions):
      - High Added Sugar (>20g / 100g): Deduct 15 pts.
      - Moderate Added Sugar (10g - 20g / 100g): Deduct 8 pts.
      - High Sodium (>600mg / 100g): Deduct 10 pts.
   C. Whole Food Bonus:
      - If sweetened using unrefined sources (like jaggery, dates, honey) instead of refined white sugar: Add back +5 pts.
      - Minimally processed / No chemical additives: Add back +5 pts.

   FINAL VERDICT RULE:
   - healthScore >= 70: "BUY"
   - healthScore < 70: "AVOID"

3. Compliance Check:
   - Check compliance based on regulations of ${detectedCountry} (e.g., FSSAI in India, EFSA in Europe, FDA in the US).

4. Alternatives:
   - Provide 2 to 3 real alternative brands available in ${detectedCountry} with estimated scores.`;

    const config = {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isReadable: { type: Type.BOOLEAN },
          productName: { type: Type.STRING },
          brandName: { type: Type.STRING },
          category: { type: Type.STRING },
          verdict: { type: Type.STRING, enum: ["BUY", "AVOID"] },
          healthScore: { type: Type.INTEGER },
          primaryReason: { type: Type.STRING },
          primaryReasonHindi: { type: Type.STRING },
          complianceNotes: { type: Type.STRING },
          complianceNotesHindi: { type: Type.STRING },
          flaggedIngredients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                concern: { type: Type.STRING },
                concernHindi: { type: Type.STRING },
              },
            },
          },
          positiveHighlights: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          alternatives: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                brand: { type: Type.STRING },
                productName: { type: Type.STRING },
                estimatedScore: { type: Type.INTEGER },
                whyBetter: { type: Type.STRING },
                marketCountry: { type: Type.STRING },
              },
            },
          },
        },
        required: ["isReadable", "verdict", "healthScore", "primaryReason", "alternatives"],
      },
    };

    const modelsToTry = await getAvailableVisionModels();
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [...imageParts, { text: promptText }],
            },
          ],
          config,
        });

        const result = JSON.parse(response.text || "{}");

        if (result.alternatives && Array.isArray(result.alternatives)) {
          result.alternatives = result.alternatives.map((alt: any) => {
            const query = encodeURIComponent(`${alt.brand} ${alt.productName}`);
            const purchaseUrl = isIndiaMarket
              ? `https://www.amazon.in/s?k=${query}`
              : `https://www.google.com/search?q=${query}+buy+online`;
            return {
              ...alt,
              purchaseUrl,
            };
          });

          if (result.verdict === "AVOID") {
            result.alternatives = result.alternatives.filter(
              (alt: any) => alt.estimatedScore >= result.healthScore
            );
          }
        }

        return NextResponse.json(result);
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code;
        if (status === 503 || status === 429) {
          await delay(1200);
        }
        continue;
      }
    }

    throw lastError;
  } catch (error: any) {
    console.error("Analysis Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to analyze image with available models." },
      { status: 500 }
    );
  }
}
