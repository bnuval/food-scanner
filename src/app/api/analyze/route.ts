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
    console.warn("Using fallback priority models.");
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

    const promptText = `You are an expert nutritional analyst and food toxicologist.
Score this product using the exact Yuka 3-Pillar Public Health Standard so results match Yuka.

USER BROWSING MARKET:
- Country: "${detectedCountry}" (Timezone: ${detectedTz})

YUKA EXACT SCORING ARCHITECTURE (0 to 100):
1. Nutritional Quality (60% of total score):
   - Evaluated via the international Nutri-Score / FSA system.
   - For condiments/sauces, factor the realistic serving size (15g-30g RACC) against Daily Values.
2. Food Additives & Toxicological Impact (30% of total score):
   - Evaluate all additives, preservatives, emulsifiers, and colors.
   - Zero penalty if no chemical additives/preservatives are present.
3. Organic & Natural Certification (10% of total score):
   - Award 10 points for verified organic ingredients, unrefined whole-food sweetening (dates, jaggery), or minimal culinary processing.

CALCULATE FINAL HEALTH SCORE (0 to 100):
- "BUY" if healthScore >= 65
- "AVOID" if healthScore < 65

LANGUAGE RULES:
${
  isIndiaMarket
    ? `- Provide "primaryReason" in English AND "primaryReasonHindi" in Hindi.
       - Provide "complianceNotes" in English AND "complianceNotesHindi" in Hindi.
       - In "flaggedIngredients", provide "concern" in English AND "concernHindi" in Hindi.`
    : `- Provide all text strictly in English. Leave "primaryReasonHindi", "complianceNotesHindi", and "concernHindi" as empty strings ("").`
}

ALTERNATIVES:
- Provide 2 to 3 real commercial alternatives in this category available in ${detectedCountry}.
- Estimate their scores using this exact Yuka standard.`;

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
          healthScore: {
            type: Type.INTEGER,
            description: "Yuka standard calculated health score from 0 to 100",
          },
          verdict: {
            type: Type.STRING,
            enum: ["BUY", "AVOID"],
          },
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
        required: [
          "isReadable",
          "verdict",
          "healthScore",
          "primaryReason",
          "alternatives",
        ],
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
            const cleanTitle = `${alt.brand} ${alt.productName}`;
            const encodedTitle = encodeURIComponent(cleanTitle);
            
            // Site-targeted exact link resolution
            const purchaseUrl = isIndiaMarket
              ? `https://www.google.com/search?q=site:amazon.in+${encodedTitle}`
              : `https://www.google.com/search?tbm=shop&q=${encodedTitle}`;

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
