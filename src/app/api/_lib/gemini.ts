import { generateOpenAIJson, OPENAI_MODEL } from "./openai";

// Gemini over its REST API (no SDK), with pinned models and a timeout per attempt.

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Flash-Lite keeps synchronous hosting runtimes within their request deadline.
const PRIMARY_MODEL = "gemini-3.5-flash-lite";
const FALLBACK_MODEL = "gemini-3.1-flash-lite";
const LAST_RESORT_MODEL = "gemini-3.8-flash";

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
  /** One timeout per model attempt. */
  timeoutsMs: readonly number[];
  /** Return the first valid model result and cancel remaining requests. */
  raceModels?: boolean;
};
type ModelResult = { provider: "gemini" | "openai"; attempt: number; result: unknown };

/**
 * Tries configured models sequentially or races them, depending on the route's cost/latency
 * policy. Throws when no attempt produces valid JSON.
 */
export async function generateJson(opts: GenerateJsonOptions): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new GeminiNotConfiguredError("GEMINI_API_KEY is not set");

  const modelCandidates = [
    process.env.GEMINI_MODEL?.trim() || PRIMARY_MODEL,
    process.env.GEMINI_FALLBACK_MODEL?.trim() || FALLBACK_MODEL,
    process.env.GEMINI_LAST_RESORT_MODEL?.trim() || LAST_RESORT_MODEL,
  ];
  const models = modelCandidates
    .filter((model, index) => modelCandidates.indexOf(model) === index)
    .slice(0, opts.timeoutsMs.length);
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

  const controllers = models.map(() => new AbortController());
  let lastError: unknown;

  const attemptModel = async (attempt: number) => {
    const model = models[attempt];
    const controller = controllers[attempt];
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, opts.timeoutsMs[attempt]);
    const startedAt = Date.now();

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
      return { provider: "gemini", attempt, result: JSON.parse(text) } satisfies ModelResult;
    } catch (err) {
      if (!controller.signal.aborted || timedOut) {
        const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
        console.error(
          `[gemini] ${opts.label} ${opts.requestId}: ${model} failed after ${Date.now() - startedAt}ms: ${detail}`
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  };

  if (opts.raceModels) {
    const attempts: Array<Promise<ModelResult>> = models.map((_model, attempt) => attemptModel(attempt));
    const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
    const openAiController = openAiApiKey ? new AbortController() : null;
    let openAiTimedOut = false;
    const openAiTimeoutMs = opts.timeoutsMs.reduce((max, timeout) => Math.max(max, timeout), 0);
    const openAiTimer = openAiController
      ? setTimeout(() => {
          openAiTimedOut = true;
          openAiController.abort();
        }, openAiTimeoutMs)
      : null;

    if (openAiApiKey && openAiController) {
      const startedAt = Date.now();
      attempts.push(
        generateOpenAIJson({
          apiKey: openAiApiKey,
          systemInstruction: opts.systemInstruction,
          parts: opts.parts,
          responseSchema: opts.responseSchema,
          maxOutputTokens: opts.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
          signal: openAiController.signal,
        })
          .then((result): ModelResult => ({ provider: "openai", attempt: -1, result }))
          .catch((error: unknown) => {
            if (!openAiController.signal.aborted || openAiTimedOut) {
              const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
              console.error(
                `[openai] ${opts.label} ${opts.requestId}: ${OPENAI_MODEL} failed after ${Date.now() - startedAt}ms: ${detail}`
              );
            }
            throw error;
          })
          .finally(() => {
            if (openAiTimer) clearTimeout(openAiTimer);
          })
      );
    }

    try {
      const winner = await Promise.any(attempts);
      controllers.forEach((controller, attempt) => {
        if (winner.provider !== "gemini" || attempt !== winner.attempt) controller.abort();
      });
      if (winner.provider !== "openai") openAiController?.abort();
      return winner.result;
    } catch (error) {
      throw new Error("All AI attempts failed", { cause: error });
    } finally {
      if (openAiTimer) clearTimeout(openAiTimer);
    }
  }

  for (let attempt = 0; attempt < models.length; attempt += 1) {
    try {
      return (await attemptModel(attempt)).result;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error("All AI attempts failed", { cause: lastError });
}
