import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const expectedPassword = process.env.ADMIN_PASSWORD || "PureBiteAdmin2026";

    if (!password || password !== expectedPassword) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

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

    const redis = new Redis({ url, token });

    const [
      totalVisits,
      countryCounts,
      pageCounts,
      dailyVisits,
      recentRaw,
    ] = await Promise.all([
      redis.get<number>("analytics:total_visits"),
      redis.hgetall<Record<string, number>>("analytics:countries"),
      redis.hgetall<Record<string, number>>("analytics:pages"),
      redis.hgetall<Record<string, number>>("analytics:daily_visits"),
      redis.lrange<string>("analytics:recent_visitors", 0, 40),
    ]);

    const recentVisitors = (recentRaw || []).map((item) => {
      try {
        return typeof item === "string" ? JSON.parse(item) : item;
      } catch {
        return item;
      }
    });

    return NextResponse.json({
      totalVisits: Number(totalVisits) || 0,
      countryCounts: countryCounts || {},
      pageCounts: pageCounts || {},
      dailyVisits: dailyVisits || {},
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
