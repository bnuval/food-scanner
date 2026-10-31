import { scryptSync, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse, readJsonBody } from "../../_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1024;
const PASSWORD_HASH_RE = /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/i;

function passwordMatches(candidate: string, storedHash: unknown): boolean {
  if (typeof storedHash !== "string") return false;
  const match = PASSWORD_HASH_RE.exec(storedHash);
  if (!match) return false;

  const salt = Buffer.from(match[1], "hex");
  const expected = Buffer.from(match[2], "hex");
  const actual = scryptSync(candidate, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody(req, MAX_BODY_BYTES);
    if ("failure" in body) return errorResponse(body.failure, "INVALID_REQUEST");
    const password =
      typeof body.data === "object" && body.data !== null && "password" in body.data
        ? body.data.password
        : undefined;

    if (typeof password !== "string" || !password || password.length > 1024) {
      return errorResponse(401, "UNAUTHORIZED");
    }

    const apiKey = process.env.JSONBIN_API_KEY?.trim();
    const binId = process.env.JSONBIN_BIN_ID?.trim();
    if (!apiKey || !binId) {
      console.error("[admin] JSONBIN_API_KEY or JSONBIN_BIN_ID is not set");
      return errorResponse(503, "SERVICE_UNAVAILABLE");
    }

    const res = await fetch(`https://api.jsonbin.io/v3/b/${encodeURIComponent(binId)}/latest`, {
      headers: { "X-Master-Key": apiKey },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`JSONBin error status: ${res.status}`);
    }

    const json = await res.json();
    const data = json.record || {};
    if (typeof data.adminPasswordHash !== "string" || !PASSWORD_HASH_RE.test(data.adminPasswordHash)) {
      console.error("[admin] JSONBin record has no valid adminPasswordHash");
      return errorResponse(503, "SERVICE_UNAVAILABLE");
    }

    if (!passwordMatches(password, data.adminPasswordHash)) {
      return errorResponse(401, "UNAUTHORIZED");
    }

    return NextResponse.json({
      totalVisits: data.totalVisits || 0,
      countryCounts: data.countryCounts || {},
      pageCounts: data.pageCounts || {},
      dailyVisits: data.dailyVisits || {},
    });
  } catch (err) {
    console.error("[admin] stats fetch error:", err);
    return errorResponse(500, "STATS_FAILED");
  }
}
