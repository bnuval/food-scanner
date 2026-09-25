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

1. Legibility:
   If photos are unreadable, cut off, or miss the ingredient list, set isReadable: false.

2. Regulatory Compliance Check:
   - Check compliance based on regulations of ${detectedCountry}:
     * For India: Benchmark against FSSAI guidelines (e.g., added sugar levels, edible vegetable oil/palm oil declarations, permitted INS numbers, preservatives like INS 211).
     * For EU/UK: Flag additives restricted under EFSA (e.g., synthetic food dyes).
     * For US: Review against FDA GRAS limits and high-fructose corn syrup.
   - Note any regulatory observation in "complianceNotes".

3. Binary Verdict & Health Scoring:
   - Calculate healthScore (0 to 100).
   - If healthScore >= 70, verdict is "BUY".
   - If healthScore < 70, verdict is "AVOID".
   - Primary Reason: Provide 1-2 punchy sentences justifying the verdict.

4. LOCAL MARKET ALTERNATIVES (ALWAYS PROVIDE 2-3 OPTIONS):
   - You MUST ALWAYS provide 2 to 3 real alternative products in the same exact food category from the ${detectedCountry} market.
   - If Verdict is "AVOID": Suggest strictly cleaner alternatives that score HIGHER than the scanned product.
   - If Verdict is "BUY" (already high scoring): Suggest top-tier peer clean-label brands that are also great healthy options in this category (for example, in India for ketchup: The Whole Truth Dates Ketchup, Two Brothers Organic Farms Tomato Sauce, Slurrp Farm Ketchup, etc.). Give realistic scores for each.`;

    const config = {
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
          complianceNotes: { type: Type.STRING },
          flaggedIngredients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                concern: { type: Type.STRING },
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

        // Logic check:
        // If AVOID, ensure alternatives score higher.
        // If BUY, allow peer options (equal or higher, or within 5 points of top tier).
        if (result.alternatives && Array.isArray(result.alternatives)) {
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
