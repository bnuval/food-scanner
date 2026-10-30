import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    let rawImageData: any = null;
    for (const key of Object.keys(body)) {
      const lower = key.toLowerCase();
      if (lower.includes("image") || lower.includes("photo") || lower.includes("dataurl") || lower.includes("file")) {
        if (body[key]) {
          rawImageData = body[key];
          break;
        }
      }
    }

    if (Array.isArray(rawImageData)) {
      rawImageData = rawImageData.find((img) => typeof img === "string" && img.trim().length > 0) || null;
    }

    const rawQuery = body.query || body.productQuery || body.text || body.ingredients || body.search || null;
    const hasValidImage = typeof rawImageData === "string" && rawImageData.trim().length > 30;
    const hasValidQuery = typeof rawQuery === "string" && rawQuery.trim().length > 0;

    if (!hasValidImage && !hasValidQuery) {
      return NextResponse.json(
        { error: "Please provide a product image or ingredient text to analyze." },
        { status: 400 }
      );
    }

    const apiKey = (process.env.GEMINI_API_KEY || process.env["GEMINI_API_KEY"])?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not defined in Netlify environment variables." },
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

    if (hasValidImage) {
      const base64Data = rawImageData.replace(/^data:image\/[a-zA-Z]+;base64,/, "").trim();
      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: base64Data,
        },
      });
    }

    if (hasValidQuery) {
      parts.push({ text: `Product query or ingredients: ${rawQuery}` });
    }

    const payload = {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 800,
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Google API Error (HTTP ${res.status}): ${errText}` },
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
    return NextResponse.json(
      { error: "Scanner internal error: " + (error?.message || error) },
      { status: 500 }
    );
  }
}
