import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

function getCleanEnv(val: string | undefined): string | undefined {
  if (!val) return undefined;
  return val.trim().replace(/^["']|["']$/g, "");
}

function getRedisClient() {
  const url = getCleanEnv(process.env.UPSTASH_REDIS_REST_URL);
  const token = getCleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN);

  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function POST(req: NextRequest) {
  try {
    const { path, country } = await req.json();
    const detectedCountry = country || "India";
    const visitedPath = path || "/";
    const today = new Date().toISOString().split("T")[0];

    const redis = getRedisClient();

    if (redis) {
      await Promise.all([
        redis.incr("analytics:total_visits"),
        redis.hincrby("analytics:countries", detectedCountry, 1),
        redis.hincrby("analytics:pages", visitedPath, 1),
        redis.hincrby("analytics:daily_visits", today, 1),
        redis.hincrby(`analytics:day:${today}:countries`, detectedCountry, 1),
        redis.lpush(
          "analytics:recent_visitors",
          JSON.stringify({
            timestamp: new Date().toISOString(),
            country: detectedCountry,
            path: visitedPath,
          })
        ),
      ]);
      await redis.ltrim("analytics:recent_visitors", 0, 99);
    }

    return NextResponse.json({ success: true, connected: !!redis });
  } catch (err: any) {
    console.error("Track error:", err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
