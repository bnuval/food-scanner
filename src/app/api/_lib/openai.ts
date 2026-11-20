import { toJsonSchema, type ExternalModelRequest } from "./model-schema";

const API_URL = "https://api.openai.com/v1/responses";
export const OPENAI_MODEL = "gpt-6.1-terra";

export async function generateOpenAIJson(opts: ExternalModelRequest): Promise<unknown> {
  const userContent = opts.parts.map((part) =>
    "text" in part
      ? { type: "input_text", text: part.text }
      : {
          type: "input_image",
          image_url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
          detail: "high",
        }
  );
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        { role: "system", content: opts.systemInstruction },
        { role: "user", content: userContent },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "label_analysis",
          strict: true,
          schema: toJsonSchema(opts.responseSchema),
        },
      },
      max_output_tokens: opts.maxOutputTokens,
      reasoning: { effort: "low" },
      store: false,
    }),
    cache: "no-store",
    signal: opts.signal,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  const text = (data.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text" && typeof content.text === "string")
    .map((content) => content.text)
    .join("");
  if (!text) throw new Error("OpenAI returned no text");
  return JSON.parse(text);
}
