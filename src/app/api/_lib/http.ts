import { createHash, createHmac, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export type ErrorCode =
  | "INVALID_REQUEST"
  | "PAYLOAD_TOO_LARGE"
  | "UNAUTHORIZED"
  | "SERVICE_UNAVAILABLE"
  | "ANALYSIS_FAILED"
  | "SEARCH_FAILED"
  | "STATS_FAILED";

// Static, user-safe text. The web pages show `error` as-is; the mobile app only looks at the status.
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  INVALID_REQUEST: "Invalid request.",
  PAYLOAD_TOO_LARGE: "Upload is too large. Use up to 3 smaller photos.",
  UNAUTHORIZED: "Unauthorized access",
  SERVICE_UNAVAILABLE: "Service is temporarily unavailable. Please try again later.",
  ANALYSIS_FAILED: "Could not analyze this label. Please try again with clearer photos.",
  SEARCH_FAILED: "Could not find products right now. Please try again.",
  STATS_FAILED: "Failed to load stats.",
};

export function errorResponse(
  status: number,
  code: ErrorCode,
  headers?: Record<string, string>
): NextResponse {
  return NextResponse.json({ code, error: ERROR_MESSAGES[code] }, { status, headers });
}

/** Per-request metadata from optional mobile app headers. */
export type RequestMeta = {
  requestId: string;
  appVersion: string | null;
  platform: string | null;
};

const TOKEN_RE = /^[A-Za-z0-9._-]{1,64}$/;

function headerToken(req: NextRequest, name: string): string | null {
  const value = req.headers.get(name)?.trim();
  return value && TOKEN_RE.test(value) ? value : null;
}

export function requestMeta(req: NextRequest): RequestMeta {
  return {
    requestId: headerToken(req, "x-request-id") ?? randomUUID(),
    appVersion: headerToken(req, "x-app-version"),
    platform: headerToken(req, "x-platform"),
  };
}

/**
 * Reads and parses a JSON body, refusing anything over `maxBytes` before it is buffered in
 * full: Content-Length is checked first, and the stream is cut off once it passes the limit
 * (chunked uploads carry no length).
 */
export async function readJsonBody(
  req: NextRequest,
  maxBytes: number
): Promise<{ data: unknown } | { failure: 400 | 413 }> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return { failure: 413 };
  if (!req.body) return { failure: 400 };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel().catch(() => {});
      return { failure: 413 };
    }
    chunks.push(value);
  }

  try {
    return { data: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
  } catch {
    return { failure: 400 };
  }
}

/**
 * The connecting client's address, read only from the header the hosting platform itself sets.
 * Vercel overwrites x-real-ip / x-forwarded-for with the real client address; Netlify sets
 * x-nf-client-connection-ip. Elsewhere (local dev) the left-most x-forwarded-for entry is used.
 */
export function getClientIp(req: NextRequest): string | null {
  const h = req.headers;
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  if (process.env.VERCEL) return h.get("x-real-ip")?.trim() || forwarded;
  return h.get("x-nf-client-connection-ip")?.trim() || forwarded;
}

/**
 * Rate-limit key for an address. IPv6 clients are bucketed by their /64, since a single device
 * can rotate through addresses inside its prefix.
 */
export function ipBucket(ip: string): string {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) return mapped[1];
  if (!ip.includes(":")) return ip;
  const [left, right] = ip.split("%")[0].split("::");
  const head = left ? left.split(":") : [];
  const tail = right ? right.split(":") : [];
  const groups =
    right === undefined ? head : [...head, ...Array(Math.max(0, 8 - head.length - tail.length)).fill("0"), ...tail];
  return `${groups.slice(0, 4).map((g) => g.toLowerCase() || "0").join(":")}::/64`;
}

/** One-way identifier for storage keys, so raw addresses never reach analytics storage. */
export function hashIdentifier(value: string): string {
  const secret = process.env.IP_HASH_SECRET?.trim();
  const digest = secret
    ? createHmac("sha256", secret).update(value).digest("hex")
    : createHash("sha256").update(`purebite:${value}`).digest("hex");
  return digest.slice(0, 32);
}
