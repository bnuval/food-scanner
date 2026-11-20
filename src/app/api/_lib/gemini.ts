import { generateOpenAIJson, OPENAI_MODEL } from "./openai";
import { generateGroqJson, GROQ_MODEL } from "./groq";
import type { ExternalModelRequest } from "./model-schema";

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
type ModelResult = { provider: "gemini" | "openai" | "groq"; attempt: number; result: unknown };
type ExternalProvider = {
  provider: "openai" | "groq";
  model: string;
  apiKey: string;
  generate: (opts: ExternalModelRequest) => Promise<unknown>;
};

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
    const externalProviders: ExternalProvider[] = [];
    const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
    const groqApiKey = process.env.GROQ_API_KEY?.trim();
    if (openAiApiKey) {
      externalProviders.push({
        provider: "openai",
        model: OPENAI_MODEL,
        apiKey: openAiApiKey,
        generate: generateOpenAIJson,
      });
    }
    if (groqApiKey) {
      externalProviders.push({
        provider: "groq",
        model: GROQ_MODEL,
        apiKey: groqApiKey,
        generate: generateGroqJson,
      });
    }

    const externalControllers = externalProviders.map(() => new AbortController());
    const externalTimeoutMs = opts.timeoutsMs.reduce((max, timeout) => Math.max(max, timeout), 0);
    externalProviders.forEach((provider, attempt) => {
      const controller = externalControllers[attempt];
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, externalTimeoutMs);
      const startedAt = Date.now();
      attempts.push(
        provider.generate({
          apiKey: provider.apiKey,
          systemInstruction: opts.systemInstruction,
          parts: opts.parts,
          responseSchema: opts.responseSchema,
          maxOutputTokens: opts.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
          signal: controller.signal,
        })
          .then((result): ModelResult => ({ provider: provider.provider, attempt, result }))
          .catch((error: unknown) => {
            if (!controller.signal.aborted || timedOut) {
              const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
              console.error(
                `[${provider.provider}] ${opts.label} ${opts.requestId}: ${provider.model} failed after ${Date.now() - startedAt}ms: ${detail}`
              );
            }
            throw error;
          })
          .finally(() => clearTimeout(timer))
      );
    });

    try {
      const winner = await Promise.any(attempts);
      controllers.forEach((controller, attempt) => {
        if (winner.provider !== "gemini" || attempt !== winner.attempt) controller.abort();
      });
      externalControllers.forEach((controller, attempt) => {
        if (winner.provider !== externalProviders[attempt].provider || attempt !== winner.attempt) {
          controller.abort();
        }
      });
      return winner.result;
    } catch (error) {
      throw new Error("All AI attempts failed", { cause: error });
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
