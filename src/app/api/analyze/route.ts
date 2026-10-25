import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Find any key that matches image-related names (case-insensitive)
    const allKeys = Object.keys(body);
    let rawImageData: any = null;

    for (const key of allKeys) {
      const lower = key.toLowerCase();
      if (
        lower.includes("image") ||
        lower.includes("photo") ||
        lower.includes("dataurl") ||
        lower.includes("file")
      ) {
        if (body[key]) {
          rawImageData = body[key];
          break;
        }
      }
    }

    // Handle array of images (e.g., imagesbase64: ["..."])
    if (Array.isArray(rawImageData)) {
      rawImageData = rawImageData.find((img) => typeof img === "string" && img.trim().length > 0) || null;
    }

    // Handle search text query fallback
    let rawQuery =
      body.query ||
      body.productQuery ||
      body.text ||
      body.ingredients ||
      body.search ||
      null;

    // Check if the image value is actually populated
    const hasValidImage = typeof rawImageData === "string" && rawImageData.trim().length > 50;
    const hasValidQuery = typeof rawQuery === "string" && rawQuery.trim().length > 0;

    if (!hasValidImage && !hasValidQuery) {
      console.warn("Payload validation failed. Keys:", allKeys);
      return NextResponse.json(
        {
          error: `Image data was empty or invalid. Found keys: [${allKeys.join(", ")}], image type: ${typeof rawImageData}, length: ${typeof rawImageData === "string" ? rawImageData.length : 0}`
        },
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
