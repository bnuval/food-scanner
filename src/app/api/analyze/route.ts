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
- All product recommendations MUST strictly reflect commercial availability in the ${detectedCountry} consumer market.

1. Legibility:
   If photos are unreadable, cut off, or miss the ingredient list, set isReadable: false.

2. Regulatory Compliance Check:
   - Check compliance based on the regulations of ${detectedCountry}:
     * For India: Benchmark against FSSAI guidelines (e.g., hidden sugars, maltodextrin, edible vegetable oil/palm oil declarations, permitted INS numbers, class II preservatives).
     * For EU/UK: Flag additives or artificial colors restricted under EFSA (e.g., Southampton Six dyes).
     * For US: Review against FDA GRAS safety limits, high-fructose corn syrup, and trans-fats.
   - Note any regulatory warning flags in "complianceNotes".

3. Binary Verdict & Health Scoring:
   - Calculate healthScore (0 to 100).
   - If healthScore >= 70, verdict is "BUY".
   - If healthScore < 70, verdict is "AVOID".
   - Primary Reason: Provide 1-2 punchy sentences justifying the verdict.

4. LOCAL MARKET ALTERNATIVES (STRICT):
   - Recommend 2-3 healthier alternatives commercially available in the retail or quick-commerce market of ${detectedCountry}.
     (e.g., if India: recommend popular Indian clean-label brands like The Whole Truth, Yogabar, Epigamia, Slurrp Farm, Farmley, True Elements, etc.)
   - Assign an estimated healthScore (0-100) to each alternative.
   - CRITICAL: EVERY suggested alternative MUST have a higher healthScore than the scanned product. Skip any product that scores equal or lower.`;

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
          complianceNotes: { type: Type.STRING, description: "Regulatory observation based on local food authority rules (FSSAI/FDA/EFSA)" },
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
                marketCountry: { type: Type.STRING, description: "Country market where it is sold" },
              },
            },
          },
        },
        required: ["isReadable", "verdict", "healthScore", "primaryReason"],
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

        // Filter: only keep alternatives that outscore the scanned product
        if (result.alternatives && Array.isArray(result.alternatives)) {
          result.alternatives = result.alternatives.filter(
            (alt: any) => alt.estimatedScore > result.healthScore
          );
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
