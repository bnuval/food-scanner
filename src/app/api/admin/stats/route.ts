import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const expectedPassword = process.env.ADMIN_PASSWORD || "PureBiteAdmin2026";

    if (!password || password !== expectedPassword) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // Direct lookup supporting standard and NEXT_PUBLIC fallbacks
    const url = (process.env.UPSTASH_REDIS_REST_URL || process.env["UPSTASH_REDIS_REST_URL"])?.trim();
    const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env["UPSTASH_REDIS_REST_TOKEN"])?.trim();

    if (!url || !token) {
      return NextResponse.json({
        totalVisits: 0,
        countryCounts: {},
        pageCounts: {},
        dailyVisits: {},
        recentVisitors: [],
        notice: `Variables detected in environment: URL: ${url ? "Found" : "Missing"}, Token: ${token ? "Found" : "Missing"}.`,
      });
    }

    // Helper to query Upstash REST API directly
    const runRedisCommand = async (command: string[]) => {
      const res = await fetch(`${url}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
        cache: "no-store",
      });
      const data = await res.json();
      return data.result;
    };

    // Helper to parse Redis HGETALL array into an object
    const parseHashArray = (arr: any): Record<string, number> => {
      if (!arr || !Array.isArray(arr)) return {};
      const obj: Record<string, number> = {};
      for (let i = 0; i < arr.length; i += 2) {
        obj[arr[i]] = Number(arr[i + 1]) || 0;
      }
      return obj;
    };

    const [totalVisits, countriesRaw, pagesRaw, dailyVisitsRaw, recentRaw] = await Promise.all([
      runRedisCommand(["GET", "analytics:total_visits"]),
      runRedisCommand(["HGETALL", "analytics:countries"]),
      runRedisCommand(["HGETALL", "analytics:pages"]),
      runRedisCommand(["HGETALL", "analytics:daily_visits"]),
      runRedisCommand(["LRANGE", "analytics:recent_visitors", "0", "40"]),
    ]);

    const recentVisitors = (recentRaw || []).map((item: any) => {
      try {
        return typeof item === "string" ? JSON.parse(item) : item;
      } catch {
        return item;
      }
    });

    return NextResponse.json({
      totalVisits: Number(totalVisits) || 0,
      countryCounts: parseHashArray(countriesRaw),
      pageCounts: parseHashArray(pagesRaw),
      dailyVisits: parseHashArray(dailyVisitsRaw),
      recentVisitors,
    });
  } catch (err: any) {
    console.error("Stats fetch error:", err);
    return NextResponse.json(
      { error: `Connection failed: ${err?.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
