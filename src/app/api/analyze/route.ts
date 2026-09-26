import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Official FSA / Ofcom / Nutri-Score Algorithm for 100g solid foods
function computeOfficialNutriScore(metrics: {
  energyKcalPer100g?: number;
  totalSugarGPer100g?: number;
  satFatGPer100g?: number;
  sodiumMgPer100g?: number;
  fruitVegPerc?: number;
  fiberGPer100g?: number;
  proteinGPer100g?: number;
  hasSyntheticPreservativeOrDye?: boolean;
  hasIndustrialPalmFat?: boolean;
}): { score: number; verdict: "BUY" | "AVOID" } {
  // 1. Calculate N Points (Negative Nutrients)
  // Energy (kJ)
  const energyKj = (metrics.energyKcalPer100g || 0) * 4.184;
  let energyPts = 0;
  if (energyKj > 3350) energyPts = 10;
  else if (energyKj > 3015) energyPts = 9;
  else if (energyKj > 2680) energyPts = 8;
  else if (energyKj > 2345) energyPts = 7;
  else if (energyKj > 2010) energyPts = 6;
  else if (energyKj > 1675) energyPts = 5;
  else if (energyKj > 1340) energyPts = 4;
  else if (energyKj > 1005) energyPts = 3;
  else if (energyKj > 670) energyPts = 2;
  else if (energyKj > 335) energyPts = 1;

  // Sugars (g/100g)
  const sugars = metrics.totalSugarGPer100g || 0;
  let sugarPts = 0;
  if (sugars > 45) sugarPts = 10;
  else if (sugars > 40) sugarPts = 9;
  else if (sugars > 36) sugarPts = 8;
  else if (sugars > 31) sugarPts = 7;
  else if (sugars > 27) sugarPts = 6;
  else if (sugars > 22.5) sugarPts = 5;
  else if (sugars > 18) sugarPts = 4;
  else if (sugars > 13.5) sugarPts = 3;
  else if (sugars > 9) sugarPts = 2;
  else if (sugars > 4.5) sugarPts = 1;

  // Saturated Fat (g/100g)
  const satFat = metrics.satFatGPer100g || 0;
  let satFatPts = 0;
  if (satFat > 10) satFatPts = 10;
  else if (satFat > 9) satFatPts = 9;
  else if (satFat > 8) satFatPts = 8;
  else if (satFat > 7) satFatPts = 7;
  else if (satFat > 6) satFatPts = 6;
  else if (satFat > 5) satFatPts = 5;
  else if (satFat > 4) satFatPts = 4;
  else if (satFat > 3) satFatPts = 3;
  else if (satFat > 2) satFatPts = 2;
  else if (satFat > 1) satFatPts = 1;

  // Sodium (mg/100g)
  const sodium = metrics.sodiumMgPer100g || 0;
  let sodiumPts = 0;
  if (sodium > 900) sodiumPts = 10;
  else if (sodium > 810) sodiumPts = 9;
  else if (sodium > 720) sodiumPts = 8;
  else if (sodium > 630) sodiumPts = 7;
  else if (sodium > 540) sodiumPts = 6;
  else if (sodium > 450) sodiumPts = 5;
  else if (sodium > 360) sodiumPts = 4;
  else if (sodium > 270) sodiumPts = 3;
  else if (sodium > 180) sodiumPts = 2;
  else if (sodium > 90) sodiumPts = 1;

  const totalN = energyPts + sugarPts + satFatPts + sodiumPts;

  // 2. Calculate P Points (Positive Nutrients)
  // Fruit / Veg %
  const fv = metrics.fruitVegPerc || 0;
  let fvPts = 0;
  if (fv > 80) fvPts = 5;
  else if (fv > 60) fvPts = 2;
  else if (fv > 40) fvPts = 1;

  // Fiber (g/100g)
  const fiber = metrics.fiberGPer100g || 0;
  let fiberPts = 0;
  if (fiber > 4.7) fiberPts = 5;
  else if (fiber > 3.7) fiberPts = 4;
  else if (fiber > 2.8) fiberPts = 3;
  else if (fiber > 1.9) fiberPts = 2;
  else if (fiber > 0.9) fiberPts = 1;

  // Protein (g/100g)
  const protein = metrics.proteinGPer100g || 0;
  let proteinPts = 0;
  if (protein > 8.0) proteinPts = 5;
  else if (protein > 6.4) proteinPts = 4;
  else if (protein > 4.8) proteinPts = 3;
  else if (protein > 3.2) proteinPts = 2;
  else if (protein > 1.6) proteinPts = 1;

  const totalP = fvPts + fiberPts + proteinPts;

  // Raw FSA score: lower is healthier (-15 best, +40 worst)
  let rawScore = totalN - totalP;

  // UPF / Additive modifier (NOVA 4 penalty)
  if (metrics.hasSyntheticPreservativeOrDye) rawScore += 8;
  if (metrics.hasIndustrialPalmFat) rawScore += 6;

  // Map to 0-100 scale:
  // -15 maps to 100
  // +40 maps to 0
  const normalized = Math.round(100 - ((rawScore + 15) / 55) * 100);
  const score = Math.max(5, Math.min(98, normalized));
  const verdict = score >= 65 ? "BUY" : "AVOID";

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

    const promptText = `You are a certified food labeling OCR parser and nutritionist.
Parse the exact nutritional values per 100g and check ingredients on this label.

USER COUNTRY: "${detectedCountry}"

LANGUAGE RULES:
${
  isIndiaMarket
    ? `- Provide "primaryReason" in English AND "primaryReasonHindi" in Hindi.
       - Provide "complianceNotes" in English AND "complianceNotesHindi" in Hindi.
       - In "flaggedIngredients", provide "concern" in English AND "concernHindi" in Hindi.`
    : `- Leave "primaryReasonHindi", "complianceNotesHindi", and "concernHindi" as empty strings ("").`
}

NUTRITIONAL EXTRACTION (PER 100g STRICT):
- energyKcalPer100g: number
- totalSugarGPer100g: number
- satFatGPer100g: number (if not listed, use 0)
- sodiumMgPer100g: number
- fruitVegPerc: percentage of fruit/vegetable/tomato paste content (e.g. 28% tomato paste = 28)
- fiberGPer100g: number
- proteinGPer100g: number
- hasSyntheticPreservativeOrDye: boolean (true if Sodium Benzoate, INS 211, Sorbates, Tartrazine, Red 40, etc. are present)
- hasIndustrialPalmFat: boolean (true if palm oil, palmolein, or hydrogenated fat is present)

ALTERNATIVES:
- Suggest 2 to 3 real alternative products in this food category available in ${detectedCountry}.
- Estimate their nutritional scores using this same standard.`;

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
          fsaMetrics: {
            type: Type.OBJECT,
            properties: {
              energyKcalPer100g: { type: Type.NUMBER },
              totalSugarGPer100g: { type: Type.NUMBER },
              satFatGPer100g: { type: Type.NUMBER },
              sodiumMgPer100g: { type: Type.NUMBER },
              fruitVegPerc: { type: Type.NUMBER },
              fiberGPer100g: { type: Type.NUMBER },
              proteinGPer100g: { type: Type.NUMBER },
              hasSyntheticPreservativeOrDye: { type: Type.BOOLEAN },
              hasIndustrialPalmFat: { type: Type.BOOLEAN },
            },
            required: [
              "energyKcalPer100g",
              "totalSugarGPer100g",
              "sodiumMgPer100g",
              "hasSyntheticPreservativeOrDye",
              "hasIndustrialPalmFat",
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
        required: ["isReadable", "fsaMetrics", "primaryReason", "alternatives"],
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

        // Run the official Nutri-Score / FSA Profiling Algorithm
        const { score, verdict } = computeOfficialNutriScore(result.fsaMetrics || {});
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
