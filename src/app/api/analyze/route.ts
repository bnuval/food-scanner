import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";
export const maxDuration = 25; // Expands execution window on supported runtimes

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const { image, query } = await req.json();

    if (!image && !query) {
      return NextResponse.json({ error: "Missing image or product query" }, { status: 400 });
    }

    // Flash provides fast sub-2s responses ideal for mobile networks
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 850,
      },
    });

    let prompt = `Analyze this product packaging/ingredients list concisely for health and cosmetic safety.
Return a strict JSON object with:
- productName (string)
- category ("Food" | "Cosmetic" | "Other")
- score (number from 0 to 100)
- verdict ("Safe" | "Caution" | "Hazardous")
- harmfulIngredients (array of strings)
- positives (array of strings)
- summary (2 sentences max)
Return RAW JSON only, no markdown backticks.`;

    let result;

    if (image) {
      // Clean base64 prefix
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg",
        },
      };

      result = await model.generateContent([prompt, imagePart]);
    } else {
      result = await model.generateContent(`${prompt}\nProduct query: ${query}`);
    }

    const text = result.response.text().trim();
    const cleanJson = text.replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(cleanJson);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Scanner execution error:", error);
    return NextResponse.json(
      { error: "Scan analysis timed out or could not read label. Please try holding the camera closer." },
      { status: 500 }
    );
  }
}
