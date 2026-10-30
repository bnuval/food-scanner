import { Platform } from 'react-native';

import { getAttestationHeaders } from '@/security/attestation';
import {
  AnalysisResultSchema,
  SearchResponseSchema,
  type AnalysisResult,
  type AnalyzeRequest,
  type SearchRequest,
  type SearchResponse,
} from '@/shared/api-schema';

import { config } from './config';

// Current backend routes. When the hardened, versioned routes ship (/api/v1/...),
// only these two constants change.
const ANALYZE_PATH = '/api/analyze';
const SEARCH_PATH = '/api/search-products';

/**
 * Longest wait for the analysis once the upload has finished or stopped reporting progress.
 * Upload time doesn't count: every upload progress event pushes this deadline back.
 */
const ANALYZE_SERVER_TIMEOUT_MS = 60_000;
/** Hard cap for the whole analyze call from send, however slowly the upload trickles. */
const ANALYZE_MAX_MS = 150_000;
const SEARCH_TIMEOUT_MS = 30_000;

export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'rate_limited'
  | 'too_large'
  | 'upgrade_required'
  | 'bad_request'
  | 'server'
  | 'invalid_response'
  | 'not_configured';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  /** Seconds to wait before retrying (from Retry-After), when the server said so. */
  readonly retryAfter: number | null;

  constructor(kind: ApiErrorKind, opts: { status?: number | null; retryAfter?: number | null } = {}) {
    super(kind);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = opts.status ?? null;
    this.retryAfter = opts.retryAfter ?? null;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(Math.ceil(seconds), 3600);
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.max(0, Math.min(Math.ceil((date - Date.now()) / 1000), 3600));
  return null;
}

function errorForStatus(status: number, retryAfterHeader: string | null): ApiError {
  if (status === 408) return new ApiError('timeout', { status });
  if (status === 413) return new ApiError('too_large', { status });
  if (status === 426) return new ApiError('upgrade_required', { status });
  if (status === 429) return new ApiError('rate_limited', { status, retryAfter: parseRetryAfter(retryAfterHeader) });
  if (status >= 400 && status < 500) return new ApiError('bad_request', { status });
  return new ApiError('server', { status });
}

function newRequestId(): string {
  // Not security-sensitive: correlates client retries with server logs.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function headers(requestId: string): Promise<Record<string, string>> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-App-Version': config.appVersion,
    'X-Platform': Platform.OS,
    'X-Request-Id': requestId,
    ...(await getAttestationHeaders()),
  };
}

function endpoint(path: string): string {
  if (!config.apiBaseUrl) throw new ApiError('not_configured');
  return `${config.apiBaseUrl}${path}`;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError('invalid_response');
  }
}

/**
 * Uploads label photos for analysis. Uses XMLHttpRequest (not fetch) to get real upload
 * progress, with explicit timeouts because the native HTTP client has none by default:
 * ANALYZE_SERVER_TIMEOUT_MS for the server once the upload goes quiet, so a slow uplink
 * doesn't eat into the AI's time, and ANALYZE_MAX_MS for the call as a whole.
 */
export async function analyzeLabel(
  body: AnalyzeRequest,
  opts: { signal?: AbortSignal; onUploadProgress?: (fraction: number) => void } = {},
): Promise<AnalysisResult> {
  const url = endpoint(ANALYZE_PATH);
  const requestHeaders = await headers(newRequestId());
  const payload = JSON.stringify(body);

  const responseText = await new Promise<string>((resolve, reject) => {
    if (opts.signal?.aborted) return reject(new ApiError('cancelled'));
    const xhr = new XMLHttpRequest();
    // Enforced here rather than via xhr.timeout alone: on Android, OkHttp's call timeout
    // reaches XHR as a generic `error`, which would be misreported as "offline".
    let timedOut = false;
    const sentAt = Date.now();
    const hardDeadline = sentAt + ANALYZE_MAX_MS;
    let serverDeadline = sentAt + ANALYZE_SERVER_TIMEOUT_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      const due = Math.min(serverDeadline, hardDeadline);
      timer = setTimeout(
        () => {
          // Upload progress moved the deadline since this timer was set: wait for the new one.
          if (Date.now() < Math.min(serverDeadline, hardDeadline)) {
            schedule();
            return;
          }
          timedOut = true;
          xhr.abort();
        },
        Math.max(0, due - Date.now()),
      );
    };
    const onAbort = () => xhr.abort();
    opts.signal?.addEventListener('abort', onAbort);
    const cleanup = () => {
      clearTimeout(timer);
      opts.signal?.removeEventListener('abort', onAbort);
    };

    xhr.open('POST', url);
    xhr.timeout = ANALYZE_MAX_MS + 15_000; // native backstop only
    for (const [name, value] of Object.entries(requestHeaders)) xhr.setRequestHeader(name, value);
    const report = opts.onUploadProgress;
    xhr.upload.onprogress = (event) => {
      // Still uploading: the server's time only starts once the upload goes quiet.
      serverDeadline = Date.now() + ANALYZE_SERVER_TIMEOUT_MS;
      if (report && event.lengthComputable && event.total > 0) report(Math.min(1, event.loaded / event.total));
    };
    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.responseText);
      else reject(errorForStatus(xhr.status, xhr.getResponseHeader('Retry-After')));
    };
    xhr.onerror = () => {
      cleanup();
      reject(new ApiError(timedOut ? 'timeout' : 'network'));
    };
    xhr.ontimeout = () => {
      cleanup();
      reject(new ApiError('timeout'));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new ApiError(timedOut ? 'timeout' : 'cancelled'));
    };
    schedule();
    xhr.send(payload);
  });

  const parsed = AnalysisResultSchema.safeParse(parseJson(responseText));
  if (!parsed.success) throw new ApiError('invalid_response');
  return parsed.data;
}

/** Finds clean-label products. Cancels on `signal` or after SEARCH_TIMEOUT_MS. */
export async function searchProducts(body: SearchRequest, opts: { signal?: AbortSignal } = {}): Promise<SearchResponse> {
  const url = endpoint(SEARCH_PATH);
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, SEARCH_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onAbort);

  try {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: await headers(newRequestId()),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      if (timedOut) throw new ApiError('timeout');
      if (controller.signal.aborted) throw new ApiError('cancelled');
      throw new ApiError('network');
    }
    const text = await response.text();
    // Server error text is never shown to users; the status decides the message.
    if (!response.ok) throw errorForStatus(response.status, response.headers.get('Retry-After'));
    const parsed = SearchResponseSchema.safeParse(parseJson(text));
    if (!parsed.success) throw new ApiError('invalid_response');
    return parsed.data;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}
