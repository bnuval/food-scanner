import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

function getRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const expectedPassword = process.env.ADMIN_PASSWORD || "PureBiteAdmin2026";

    if (!password || password !== expectedPassword) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const redis = getRedisClient();

    if (!redis) {
      return NextResponse.json({
        totalVisits: 0,
        countryCounts: {},
        pageCounts: {},
        dailyVisits: {},
        recentVisitors: [],
        notice: "Upstash Redis environment variables not yet connected.",
      });
    }

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
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
