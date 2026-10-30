import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const rawImage =
      body.imagesbase64?.[0] ||
      body.image ||
      body.imageBase64 ||
      body.photo ||
      null;

    const rawQuery =
      body.query ||
      body.productQuery ||
      body.text ||
      body.ingredients ||
      null;

    if (!rawImage && !rawQuery) {
      return NextResponse.json(
        { error: "Please provide a product image or ingredient text to analyze." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const promptText = `Analyze this product packaging, label, or ingredients list.
Return ONLY a valid, raw JSON object with this exact structure:
{
  "productName": "Name of product or 'Unknown Product'",
  "category": "Food",
  "score": 85,
  "verdict": "Safe",
  "harmfulIngredients": [],
  "positives": [],
  "summary": "Brief 1-2 sentence assessment."
}
Verdict must be one of: "Safe", "Caution", "Hazardous".
Do NOT include markdown formatting, backticks, or prose. Return only pure JSON.`;

    const parts: any[] = [{ text: promptText }];

    if (rawImage && typeof rawImage === "string" && rawImage.length > 50) {
      const base64Data = rawImage.replace(/^data:image\/[a-zA-Z]+;base64,/, "").trim();
      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: base64Data,
        },
      });
    }

    if (rawQuery) {
      parts.push({ text: `Product query or ingredients: ${rawQuery}` });
    }

    const payload = {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 800,
      },
    };

    const url = `[https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$](https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$){apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API Error:", res.status, errText);
      return NextResponse.json(
        { error: "AI service is temporarily busy. Please hold steady and retry." },
        { status: res.status }
      );
    }

    const apiData = await res.json();
    const rawText = apiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    const cleanJson = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(cleanJson);
      return NextResponse.json(parsed);
    } catch {
      const match = cleanJson.match(/\{[\s\S]*\}/);
      if (match) return NextResponse.json(JSON.parse(match[0]));
      throw new Error("Unable to parse model output as JSON");
    }
  } catch (error: any) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: "Unable to complete scan. Please try again." },
      { status: 500 }
    );
  }
}
