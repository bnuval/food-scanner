import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Accept any common field name for the image or search query
    const rawImage =
      body.image ||
      body.imageBase64 ||
      body.imageData ||
      body.photo ||
      body.dataUrl ||
      null;

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

    const promptText = `Analyze this product packaging, label, or ingredients.
Return a RAW JSON object with this exact shape:
{
  "productName": "Product Name",
  "category": "Food",
  "score": 80,
  "verdict": "Safe",
  "harmfulIngredients": [],
  "positives": [],
  "summary": "Brief 1-2 sentence assessment."
}
Return ONLY pure JSON. No markdown backticks.`;

    const parts: any[] = [{ text: promptText }];

    if (rawImage) {
      // Clean data URL prefix if present
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
      throw new Error("Unable to parse model JSON output");
    }
  } catch (error: any) {
    console.error("Scanner execution error:", error);
    return NextResponse.json(
      { error: "Unable to complete scan. Please hold steady and try again." },
      { status: 500 }
    );
  }
}
