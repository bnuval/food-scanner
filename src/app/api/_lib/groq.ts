import { toJsonSchema, type ExternalModelRequest } from "./model-schema";

const API_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_MODEL = process.env.GROQ_MODEL?.trim() || "qwen/qwen3.8-27b";

export async function generateGroqJson(opts: ExternalModelRequest): Promise<unknown> {
  const userContent = opts.parts.map((part) =>
    "text" in part
      ? { type: "text", text: part.text }
      : {
          type: "image_url",
          image_url: {
            url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
          },
        }
  );
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: opts.systemInstruction },
        { role: "user", content: userContent },
      ],
      temperature: 0,
      max_completion_tokens: opts.maxOutputTokens,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "label_analysis",
          strict: true,
          schema: toJsonSchema(opts.responseSchema),
        },
      },
    }),
    cache: "no-store",
    signal: opts.signal,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no text");
  return JSON.parse(text);
}
