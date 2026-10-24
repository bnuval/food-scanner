import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest, NextResponse } from "next/server";
import { errorResponse, getClientIp, hashIdentifier, ipBucket, type RequestMeta } from "./http";

type Rule = { name: string; tokens: number; window: Duration };
type RatelimitResponse = Awaited<ReturnType<Ratelimit["limit"]>>;

function envLimit(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

// Every rule applies separately to the client IP and, when the app sends one, its X-Install-Id.
// The global cap is a fixed UTC-day budget per route that bounds the Gemini bill.
const POLICIES = {
  analyze: {
    perClient: [
      { name: "min", tokens: 5, window: "1 m" },
      { name: "day", tokens: 30, window: "1 d" },
    ] as Rule[],
    globalDaily: () => envLimit("GLOBAL_DAILY_ANALYZE_LIMIT", 1000),
  },
  search: {
    perClient: [
      { name: "min", tokens: 10, window: "1 m" },
      { name: "day", tokens: 100, window: "1 d" },
    ] as Rule[],
    globalDaily: () => envLimit("GLOBAL_DAILY_SEARCH_LIMIT", 3000),
  },
  track: {
    perClient: [{ name: "min", tokens: 30, window: "1 m" }] as Rule[],
    globalDaily: null,
  },
};

export type LimitScope = keyof typeof POLICIES;

const ADMIN_FAILURES_PER_IP: Rule = { name: "admin-ip", tokens: 5, window: "15 m" };
const ADMIN_FAILURES_GLOBAL: Rule = { name: "admin-all", tokens: 30, window: "1 h" };

// Upstash answers in well under a second; past this the check counts as failed, not passed.
const REDIS_TIMEOUT_MS = 3000;

let redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redis === undefined) {
    const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL)?.trim();
    const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)?.trim();
    redis = url && token ? new Redis({ url, token }) : null;
  }
  return redis;
}

// Kept at module scope so warm instances reuse each limiter's in-memory block cache.
const limiters = new Map<string, Ratelimit>();

function limiter(scope: string, rule: Rule, fixed = false): Ratelimit {
  const key = `${scope}:${rule.name}:${rule.tokens}`;
  let instance = limiters.get(key);
  if (!instance) {
    instance = new Ratelimit({
      redis: getRedis()!,
      limiter: fixed ? Ratelimit.fixedWindow(rule.tokens, rule.window) : Ratelimit.slidingWindow(rule.tokens, rule.window),
      prefix: `purebite:rl:${scope}:${rule.name}`,
      timeout: REDIS_TIMEOUT_MS,
    });
    limiters.set(key, instance);
  }
  return instance;
}

let warnedUnconfigured = false;

/** Whether requests should go ahead without Redis: only outside production, or when asked to. */
function allowWithoutRedis(failOpen: boolean): boolean {
  if (failOpen || process.env.NODE_ENV !== "production") {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.warn("[ratelimit] Upstash Redis is not configured; rate limiting is off");
    }
    return true;
  }
  console.error("[ratelimit] Upstash Redis is not configured; refusing rate-limited requests");
  return false;
}

function retryAfterSeconds(reset: number): number {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

function clientIpKey(req: NextRequest): string {
  const ip = getClientIp(req);
  return `ip:${hashIdentifier(ip ? ipBucket(ip) : "unknown")}`;
}

/**
 * Applies the route's per-client and global limits. Returns the 429 (with Retry-After) or 503
 * response to send, or null when the request may proceed. Fails closed in production when
 * Redis is missing or unreachable, unless `failOpen` is set.
 */
export async function enforceRateLimit(
  scope: LimitScope,
  req: NextRequest,
  meta: RequestMeta,
  { failOpen = false }: { failOpen?: boolean } = {}
): Promise<NextResponse | null> {
  const headers = { "X-Request-Id": meta.requestId };
  if (!getRedis()) {
    return allowWithoutRedis(failOpen) ? null : errorResponse(503, "SERVICE_UNAVAILABLE", headers);
  }

  const policy = POLICIES[scope];
  const subjects = [clientIpKey(req)];
  if (meta.installId) subjects.push(`install:${hashIdentifier(meta.installId)}`);

  // Rules run shortest window first and stop at the first one that blocks, so a client
  // hammering the per-minute limit doesn't also burn its daily quota or the global budget.
  const stages: Array<() => Promise<RatelimitResponse[]>> = policy.perClient.map(
    (rule) => () => Promise.all(subjects.map((subject) => limiter(scope, rule).limit(subject)))
  );
  if (policy.globalDaily) {
    const rule: Rule = { name: "global", tokens: policy.globalDaily(), window: "1 d" };
    stages.push(async () => [await limiter(scope, rule, true).limit("all")]);
  }

  try {
    for (const stage of stages) {
      const results = await stage();
      if (results.some((r) => r.reason === "timeout") && !failOpen) {
        console.error(`[ratelimit] ${scope} ${meta.requestId}: Redis timed out`);
        return errorResponse(503, "SERVICE_UNAVAILABLE", headers);
      }
      const blocked = results.filter((r) => !r.success);
      if (blocked.length > 0) {
        const retryAfter = Math.max(...blocked.map((r) => retryAfterSeconds(r.reset)));
        console.warn(`[ratelimit] ${scope} ${meta.requestId}: limited for ${retryAfter}s`);
        return errorResponse(429, "RATE_LIMITED", { ...headers, "Retry-After": String(retryAfter) });
      }
    }
    return null;
  } catch (err) {
    console.error(`[ratelimit] ${scope} ${meta.requestId}: Redis error`, err);
    return failOpen ? null : errorResponse(503, "SERVICE_UNAVAILABLE", headers);
  }
}

/**
 * Seconds the caller must wait before another admin login attempt (0 = may try now), or null
 * when the limiter is unavailable and the attempt must be refused. Only failures are counted
 * (see recordAdminLoginFailure), so a signed-in admin can keep refreshing.
 */
export async function adminLoginRetryAfter(req: NextRequest): Promise<number | null> {
  if (!getRedis()) return allowWithoutRedis(false) ? 0 : null;
  try {
    const [perIp, global] = await Promise.all([
      limiter("admin", ADMIN_FAILURES_PER_IP).getRemaining(clientIpKey(req)),
      limiter("admin", ADMIN_FAILURES_GLOBAL).getRemaining("all"),
    ]);
    const exhausted = [perIp, global].filter((r) => r.remaining <= 0);
    return exhausted.length ? Math.max(...exhausted.map((r) => retryAfterSeconds(r.reset))) : 0;
  } catch (err) {
    console.error("[ratelimit] admin: Redis error", err);
    return null;
  }
}

export async function recordAdminLoginFailure(req: NextRequest): Promise<void> {
  if (!getRedis()) return;
  try {
    await Promise.all([
      limiter("admin", ADMIN_FAILURES_PER_IP).limit(clientIpKey(req)),
      limiter("admin", ADMIN_FAILURES_GLOBAL).limit("all"),
    ]);
  } catch (err) {
    console.error("[ratelimit] admin: Redis error", err);
  }
}
