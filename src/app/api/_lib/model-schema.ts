import type { GeminiPart } from "./gemini";

export type ExternalModelRequest = {
  apiKey: string;
  systemInstruction: string;
  parts: GeminiPart[];
  responseSchema: object;
  maxOutputTokens: number;
  signal: AbortSignal;
};

export function toJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toJsonSchema);
  if (value === null || typeof value !== "object") return value;

  const source = value as Record<string, unknown>;
  const schema: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(source)) {
    schema[key] = key === "type" && typeof child === "string" ? child.toLowerCase() : toJsonSchema(child);
  }
  if (source.type === "OBJECT") schema.additionalProperties = false;
  return schema;
}
