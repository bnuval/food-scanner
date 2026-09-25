import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Helper: Query Google API to get all currently active models dynamically
async function getAvailableVisionModels(): Promise<string[]> {
  try {
    const list = await ai.models.list();
    const candidateModels: string[] = [];

    for await (const m of list) {
      const name = m.name?.replace(/^models\//, "") || "";
      // Match models that support content generation and multimodal input
      const supportsGenerate = m.supportedActions?.includes("generateContent") ?? true;
      if (supportsGenerate && (name.includes("flash") || name.includes("pro"))) {
        candidateModels.push(name);
      }
    }

    // Sort order: prioritize flash models for fast image inference, then pro models
    candidateModels.sort((a, b) => {
      const aIsFlash = a.includes("flash") ? 1 : 0;
      const bIsFlash = b.includes("flash") ? 1 : 0;
      return bIsFlash - aIsFlash;
    });

    if (candidateModels.length > 0) return candidateModels;
  } catch (err) {
    console.warn("Could not fetch dynamic model list, using fallback priority list.");
  }

  // Safe fallback priority list across supported 3.x and 2.5 generations
  return [
    "gemini-3.8-flash",
    "gemini-3.1-pro-preview",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-flash-latest"
  ];
}

export async function POST(req: NextRequest) {
  try {
    const { imagesBase64 } = await req.json();

    if (!imagesBase64 || !Array.isArray(imagesBase64) || imagesBase64.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    const imageParts = imagesBase64.map((base64: string) => ({
      inlineData: {
        mimeType: "image/jpeg",
        data: base64.replace(/^data:image\/\w+;base64,/, ""),
      },
    }));

    const promptText = `You are a clinical food scientist and consumer advocate. Analyze this packaged food product label carefully.

1. Legibility:
   If photos are unreadable, out of focus, or lack ingredients, set isReadable to false.

2. Health Scoring (0 to 100):
   - Calculate an objective healthScore (0-100) based on nutritional density, UPF markers, artificial additives, palm oil, refined sugars, and sodium.
   - If healthScore >= 70, verdict is "BUY".
   - If healthScore < 70, verdict is "AVOID".

3. Reasons:
   - Provide a clear, primary 1-2 sentence core reason for this verdict.
   - Highlight positive highlights and flagged harmful ingredients.

4. Recommendation Rules (STRICT):
   - Suggest 2 to 3 commercially available healthier alternatives in the exact same food category.
   - Assign an estimated healthScore (0 to 100) to each alternative.
   - CRITICAL: EVERY suggested alternative MUST have a higher healthScore than the scanned product. If an alternative has an equal or lower score, EXCLUDE it entirely. If no better alternatives exist, return an empty array.`;

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
          healthScore: { type: Type.INTEGER, description: "Score from 0 to 100" },
          primaryReason: { type: Type.STRING, description: "Detailed 1-2 sentence justification" },
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
              },
            },
          },
        },
        required: ["isReadable", "verdict", "healthScore", "primaryReason"],
      },
    };

    // Get live models from Google
    const modelsToTry = await getAvailableVisionModels();
    console.log("Active candidate models:", modelsToTry);

    let lastError: any = null;

    // Loop through all active models until one succeeds
    for (const model of modelsToTry) {
      try {
        console.log(`Attempting analysis with model: ${model}...`);
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

        // Filter alternatives to ensure strictly better scores
        if (result.alternatives && Array.isArray(result.alternatives)) {
          result.alternatives = result.alternatives.filter(
            (alt: any) => alt.estimatedScore > result.healthScore
          );
        }

        console.log(`Success using model: ${model}`);
        return NextResponse.json(result);
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code;
        const msg = err?.message || "";
        console.warn(`Model ${model} failed (Status: ${status}). Checking next available model...`);

        // If it's a 503 (high demand) or 429 (rate limit), pause briefly before trying next model
        if (status === 503 || status === 429 || msg.includes("503") || msg.includes("high demand")) {
          await delay(1200);
        }
        continue;
      }
    }

    throw lastError;
  } catch (error: any) {
    console.error("All candidate models failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to analyze image with available models." },
      { status: 500 }
    );
  }
}
