import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Deterministic Standard Nutrition Scoring Engine (NutriScore / Clean-Label Standard)
function calculateDeterministicHealthScore(data: {
  addedSugarPer100g?: number;
  sodiumMgPer100g?: number;
  hasPalmOil?: boolean;
  hasSyntheticPreservatives?: boolean;
  hasArtificialDyes?: boolean;
  hasArtificialSweeteners?: boolean;
  isNaturallySweetened?: boolean;
  isCleanLabelWholeFood?: boolean;
}): { score: number; verdict: "BUY" | "AVOID" } {
  let score = 100;

  // 1. Harmful Additives & UPF Markers (Deterministic Penalties)
  if (data.hasSyntheticPreservatives) score -= 30; // INS 211, Potassium Sorbate, etc.
  if (data.hasPalmOil) score -= 25;
  if (data.hasArtificialDyes) score -= 25;
  if (data.hasArtificialSweeteners) score -= 20;

  // 2. Macronutrient Thresholds (Exact per 100g standard)
  const sugar = data.addedSugarPer100g || 0;
  if (sugar > 5) {
    // Deduct 1 point per 1.5g excess added sugar above 5g/100g (capped at 25)
    const sugarDeduction = Math.min(25, Math.round((sugar - 5) / 1.5));
    score -= sugarDeduction;
  }

  const sodium = data.sodiumMgPer100g || 0;
  if (sodium > 200) {
    // Deduct 1 point per 75mg excess sodium above 200mg/100g (capped at 15)
    const sodiumDeduction = Math.min(15, Math.round((sodium - 200) / 75));
    score -= sodiumDeduction;
  }

  // 3. Whole Food Bonuses
  if (data.isNaturallySweetened && !data.hasArtificialSweeteners) score += 3;
  if (data.isCleanLabelWholeFood && !data.hasSyntheticPreservatives && !data.hasPalmOil) score += 4;

  // Clamp score strictly between 0 and 100
  score = Math.max(5, Math.min(98, score));
  const verdict = score >= 70 ? "BUY" : "AVOID";

  return { score, verdict };
}

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

    const promptText = `You are a certified food quality auditor and OCR parser. Extract exact nutritional facts and identify ingredients from this packaging label.

USER LOCATION: "${detectedCountry}" (Timezone: ${detectedTz}).

LANGUAGE INSTRUCTIONS:
${
  isIndiaMarket
    ? `- Provide "primaryReason" in English AND "primaryReasonHindi" in Hindi.
       - Provide "complianceNotes" in English AND "complianceNotesHindi" in Hindi.
       - In "flaggedIngredients", provide "concern" in English AND "concernHindi" in Hindi.`
    : `- Leave "primaryReasonHindi", "complianceNotesHindi", and "concernHindi" as empty strings ("").`
}

EXTRACTION RULES:
1. Extract addedSugarPer100g (number in grams, or calculate per 100g if listed per serving).
2. Extract sodiumMgPer100g (number in mg, or calculate per 100g if listed per serving).
3. Check for Palm Oil / Hydrogenated fat (boolean).
4. Check for Synthetic Preservatives like Sodium Benzoate / INS 211, Potassium Sorbate (boolean).
5. Check for Synthetic Food Dyes (Red 40, Tartrazine, Sunset Yellow, etc.) (boolean).
6. Check for Artificial Sweeteners (Sucralose, Aspartame, Acesulfame K) (boolean).
7. Check if naturally sweetened with jaggery, honey, dates (boolean).
8. Check if ingredient list is clean / free from chemical emulsifiers (boolean).

9. RECOMMENDATIONS:
   - Provide 2 to 3 real alternative products in the same category commercially available in ${detectedCountry}.
   - Give realistic benchmark scores.`;

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
          nutritionMetrics: {
            type: Type.OBJECT,
            properties: {
              addedSugarPer100g: { type: Type.NUMBER },
              sodiumMgPer100g: { type: Type.NUMBER },
              hasPalmOil: { type: Type.BOOLEAN },
              hasSyntheticPreservatives: { type: Type.BOOLEAN },
              hasArtificialDyes: { type: Type.BOOLEAN },
              hasArtificialSweeteners: { type: Type.BOOLEAN },
              isNaturallySweetened: { type: Type.BOOLEAN },
              isCleanLabelWholeFood: { type: Type.BOOLEAN },
            },
            required: [
              "addedSugarPer100g",
              "sodiumMgPer100g",
              "hasPalmOil",
              "hasSyntheticPreservatives",
              "hasArtificialDyes",
              "hasArtificialSweeteners",
            ],
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
        required: ["isReadable", "nutritionMetrics", "primaryReason", "alternatives"],
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

        if (!result.isReadable) {
          return NextResponse.json(result);
        }

        // Run the deterministic scoring engine in TypeScript code
        const { score, verdict } = calculateDeterministicHealthScore(result.nutritionMetrics || {});
        result.healthScore = score;
        result.verdict = verdict;

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
