import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "../_lib/http";
import { MARKETS } from "../_lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2 * 1024;
// Page paths become keys in the stored document, so only short, plain paths are kept as-is.
const PATH_RE = /^\/[A-Za-z0-9\-_/]{0,63}$/;

function normalizePath(value: unknown): string {
  if (value === undefined || value === null || value === "") return "/";
  return typeof value === "string" && PATH_RE.test(value) ? value : "/other";
}

function normalizeCountry(value: unknown): string {
  if (value === undefined || value === null || value === "") return "India";
  return typeof value === "string" && (MARKETS as readonly string[]).includes(value) ? value : "Other";
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody(req, MAX_BODY_BYTES);
    if ("failure" in body) return NextResponse.json({ success: false }, { status: body.failure });
    const { path, country } = (body.data ?? {}) as { path?: unknown; country?: unknown };

    const apiKey = process.env.JSONBIN_API_KEY?.trim();
    const binId = process.env.JSONBIN_BIN_ID?.trim();

    if (!apiKey || !binId) {
      console.error("[track] JSONBIN_API_KEY or JSONBIN_BIN_ID is not set");
      return NextResponse.json(
        { success: false, reason: "Analytics storage is not configured" },
        { status: 503 }
      );
    }

    const detectedCountry = normalizeCountry(country);
    const visitedPath = normalizePath(path);
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // 1. Fetch the current records
    const getRes = await fetch(`https://api.jsonbin.io/v3/b/${encodeURIComponent(binId)}/latest`, {
      headers: {
        "X-Master-Key": apiKey,
      },
      cache: "no-store",
    });

    if (!getRes.ok) {
      throw new Error(`JSONBin get failed: ${getRes.status}`);
    }

    const json = await getRes.json();
    const data = json.record || {
      totalVisits: 0,
      countryCounts: {},
      pageCounts: {},
      dailyVisits: {},
      recentVisitors: [],
    };

    // 2. Dynamic Calculation: Always increment total visits
    data.totalVisits = (Number(data.totalVisits) || 0) + 1;

    data.countryCounts = data.countryCounts || {};
    data.countryCounts[detectedCountry] = (data.countryCounts[detectedCountry] || 0) + 1;

    data.pageCounts = data.pageCounts || {};
    data.pageCounts[visitedPath] = (data.pageCounts[visitedPath] || 0) + 1;

    data.dailyVisits = data.dailyVisits || {};
    data.dailyVisits[today] = (data.dailyVisits[today] || 0) + 1;

    // Drop the per-visit log used by older versions; analytics now stores aggregates only.
    data.recentVisitors = [];

    // 3. Update the JSONBin document
    const putRes = await fetch(`https://api.jsonbin.io/v3/b/${encodeURIComponent(binId)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": apiKey,
      },
      body: JSON.stringify(data),
      cache: "no-store",
    });

    if (!putRes.ok) {
      throw new Error(`JSONBin put failed: ${putRes.status}`);
    }

    return NextResponse.json({ success: true, totalVisits: data.totalVisits });
  } catch (err) {
    console.error("[track] error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
