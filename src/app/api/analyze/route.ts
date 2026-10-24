import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { image, query } = await req.json();

    const apiKey = (process.env.GEMINI_API_KEY || process.env["GEMINI_API_KEY"])?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY in environment variables." }, { status: 500 });
    }

    if (!image && !query) {
      return NextResponse.json({ error: "Missing image or product query" }, { status: 400 });
    }

    const systemPrompt = `Analyze this food or cosmetic product packaging/ingredients list concisely for health and cosmetic safety.
Return a strict JSON object with:
- productName (string)
- category ("Food" | "Cosmetic" | "Other")
- score (number from 0 to 100, where 100 is completely safe/wholesome and 0 is hazardous)
- verdict ("Safe" | "Caution" | "Hazardous")
- harmfulIngredients (array of strings)
- positives (array of strings)
- summary (2 sentences max)
Return RAW JSON only. Do not wrap in markdown fences.`;

    const parts: any[] = [{ text: systemPrompt }];

    if (image) {
      // Strip base64 header if present
      const base64Data = image.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: base64Data,
        },
      });
    }

    if (query) {
      parts.push({ text: `Product query or ingredients: ${query}` });
    }

    const payload = {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 850,
      },
    };

    // Use Gemini 1.5 Flash via native REST API (No npm SDK required)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API error:", errText);
      return NextResponse.json({ error: "Gemini API rejected request" }, { status: res.status });
    }

    const result = await res.json();
    const rawOutput = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";
    const cleanJson = rawOutput.replace(/^```json\s*|\s*```$/g, "");
    const parsedData = JSON.parse(cleanJson);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: "Scan analysis timed out or could not read label. Please hold steady and retry." },
      { status: 500 }
    );
  }
}
