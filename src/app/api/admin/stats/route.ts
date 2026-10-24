import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse, readJsonBody } from "../../_lib/http";
import { adminLoginRetryAfter, recordAdminLoginFailure } from "../../_lib/rate-limit";
import { scrubVisitor } from "../../_lib/visitors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1024;

// Hashing both sides first gives equal-length buffers, so neither the comparison time nor an
// early length check reveals anything about the expected password.
function passwordMatches(candidate: string, expected: string): boolean {
  const a = createHash("sha256").update(candidate).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  try {
    const expectedPassword = process.env.ADMIN_PASSWORD;
    if (!expectedPassword?.trim()) {
      console.error("[admin] ADMIN_PASSWORD is not set; admin access is disabled");
      return errorResponse(503, "SERVICE_UNAVAILABLE");
    }

    const retryAfter = await adminLoginRetryAfter(req);
    if (retryAfter === null) return errorResponse(503, "SERVICE_UNAVAILABLE");
    if (retryAfter > 0) return errorResponse(429, "RATE_LIMITED", { "Retry-After": String(retryAfter) });

    const body = await readJsonBody(req, MAX_BODY_BYTES);
    const password = "data" in body ? (body.data as { password?: unknown } | null)?.password : undefined;

    if (typeof password !== "string" || !password || !passwordMatches(password, expectedPassword)) {
      await recordAdminLoginFailure(req);
      return errorResponse(401, "UNAUTHORIZED");
    }

    const apiKey = process.env.JSONBIN_API_KEY?.trim();
    const binId = process.env.JSONBIN_BIN_ID?.trim();

    if (!apiKey || !binId) {
      return NextResponse.json({
        totalVisits: 0,
        countryCounts: {},
        pageCounts: {},
        dailyVisits: {},
        recentVisitors: [],
        notice: `JSONBin keys missing: API_KEY: ${apiKey ? "Found" : "Missing"}, BIN_ID: ${binId ? "Found" : "Missing"}. Verify them in Netlify -> Site configuration -> Environment variables.`,
      });
    }

    const res = await fetch(`https://api.jsonbin.io/v3/b/${encodeURIComponent(binId)}/latest`, {
      headers: {
        "X-Master-Key": apiKey,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`JSONBin error status: ${res.status}`);
    }

    const json = await res.json();
    const data = json.record || {};

    return NextResponse.json({
      totalVisits: data.totalVisits || 0,
      countryCounts: data.countryCounts || {},
      pageCounts: data.pageCounts || {},
      dailyVisits: data.dailyVisits || {},
      // Entries written before IPs stopped being stored may still hold one; never serve it.
      recentVisitors: Array.isArray(data.recentVisitors) ? data.recentVisitors.map(scrubVisitor) : [],
    });
  } catch (err) {
    console.error("[admin] stats fetch error:", err);
    return errorResponse(500, "STATS_FAILED");
  }
}
