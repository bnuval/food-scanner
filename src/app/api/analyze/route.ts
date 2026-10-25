import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Detect image regardless of casing, pluralization, or naming convention
    let rawImage =
      body.imagesbase64 ||
      body.imageBase64 ||
      body.image ||
      body.images ||
      body.imageData ||
      body.photo ||
      body.dataUrl ||
      null;

    // If an array of images is passed, pick the first image string
    if (Array.isArray(rawImage) && rawImage.length > 0) {
      rawImage = rawImage[0];
    }

    const rawQuery =
      body.query ||
      body.productQuery ||
      body.text ||
      body.ingredients ||
      null;

    if (!rawImage && !rawQuery) {
      console.warn("Received empty request body keys:", Object.keys(body));
      return NextResponse.json(
        { error: "No image or product text received. Received keys: " + Object.keys(body).join(", ") },
        { status: 400 }
      );
    }

    const apiKey = (process.env.GEMINI_API_KEY || process.env["GEMINI_API_KEY"])?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in Netlify environment variables." },
        { status: 500 }
      );
    }

    const promptText = `You are a nutrition and ingredient safety specialist. Analyze this product packaging, label, or ingredients list.
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

    if (rawImage && typeof rawImage === "string") {
      const base64Data = rawImage.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
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

    const candidateModels = [
      "gemini-2.0-flash",
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash",
    ];

    let apiData = null;
    let lastStatus = 503;

    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            cache: "no-store",
          });

          if (res.ok) {
            apiData = await res.json();
            break;
          }

          lastStatus = res.status;
          if (res.status === 503 || res.status === 429) {
            await new Promise((r) => setTimeout(r, 600));
          } else {
            break;
          }
        } catch (fetchErr) {
          console.warn(`Error on ${model}:`, fetchErr);
        }
      }

      if (apiData) break;
    }

    if (!apiData) {
      return NextResponse.json(
        { error: "AI service is temporarily busy. Please hold steady and retry." },
        { status: lastStatus }
      );
    }

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
    console.error("Scanner execution error:", error);
    return NextResponse.json(
      { error: "Unable to complete scan. Please hold steady and try again." },
      { status: 500 }
    );
  }
}
