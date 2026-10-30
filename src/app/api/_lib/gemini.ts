// Gemini over its REST API (no SDK), with pinned models and a timeout per attempt.

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Flash-Lite keeps synchronous hosting runtimes within their request deadline.
const PRIMARY_MODEL = "gemini-3.5-flash-lite";
const FALLBACK_MODEL = "gemini-3.1-flash-lite";

// Bounds the cost of a single call; leaves room for the model's thinking tokens plus the JSON.
const MAX_OUTPUT_TOKENS = 8192;

export class GeminiNotConfiguredError extends Error {}

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

type GenerateJsonOptions = {
  /** Route name and request id, for logs only. */
  label: string;
  requestId: string;
  systemInstruction: string;
  parts: GeminiPart[];
  responseSchema: object;
  maxOutputTokens?: number;
  /** Timeout for the primary attempt and for the fallback attempt. */
  timeoutsMs: [number, number];
};

/**
 * Starts the primary and fallback models together, returns the first valid JSON answer, and
 * aborts the other request. Throws when neither attempt produces valid JSON.
 */
export async function generateJson(opts: GenerateJsonOptions): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new GeminiNotConfiguredError("GEMINI_API_KEY is not set");

  const models = [
    process.env.GEMINI_MODEL?.trim() || PRIMARY_MODEL,
    process.env.GEMINI_FALLBACK_MODEL?.trim() || FALLBACK_MODEL,
  ];
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: opts.systemInstruction }] },
    contents: [{ role: "user", parts: opts.parts }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: opts.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
      responseMimeType: "application/json",
      responseSchema: opts.responseSchema,
    },
  });

  const uniqueModels = models.filter((model, index) => models.indexOf(model) === index);
  const controllers = uniqueModels.map(() => new AbortController());

  return new Promise((resolve, reject) => {
    let settled = false;
    let failures = 0;

    uniqueModels.forEach((model, attempt) => {
      const controller = controllers[attempt];
      const startedAt = Date.now();
      const timeout = setTimeout(() => controller.abort(), opts.timeoutsMs[attempt]);

      void (async () => {
        try {
          const res = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body,
            cache: "no-store",
            signal: controller.signal,
          });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
          }

          const data = await res.json();
          const candidate = data?.candidates?.[0];
          const text = (candidate?.content?.parts ?? [])
            .filter((part: { text?: unknown; thought?: boolean }) => typeof part?.text === "string" && !part.thought)
            .map((part: { text: string }) => part.text)
            .join("");
          if (!text) {
            const reason = candidate?.finishReason ?? data?.promptFeedback?.blockReason ?? "unknown";
            throw new Error(`no text in response (${reason})`);
          }

          const result = JSON.parse(text);
          if (settled) return;
          settled = true;
          controllers.forEach((other, index) => {
            if (index !== attempt) other.abort();
          });
          resolve(result);
        } catch (err) {
          if (settled) return;
          const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
          console.error(
            `[gemini] ${opts.label} ${opts.requestId}: ${model} failed after ${Date.now() - startedAt}ms: ${detail}`
          );
          failures++;
          if (failures === uniqueModels.length) {
            settled = true;
            reject(new Error("All Gemini attempts failed"));
          }
        } finally {
          clearTimeout(timeout);
        }
      })();
    });
  });
}
