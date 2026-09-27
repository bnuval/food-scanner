import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// Graceful fallback to memory if env keys aren't added yet
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

export async function POST(req: NextRequest) {
  try {
    const { path, country } = await req.json();
    const detectedCountry = country || "Unknown";
    const visitedPath = path || "/";

    // Format current date key: YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0];

    if (redis) {
      // 1. Increment total lifetime visits
      await redis.incr("analytics:total_visits");

      // 2. Increment lifetime country count
      await redis.hincrby("analytics:countries", detectedCountry, 1);

      // 3. Increment lifetime page hits
      await redis.hincrby("analytics:pages", visitedPath, 1);

      // 4. DAY-WISE TRACKING: Store daily visits
      await redis.hincrby("analytics:daily_visits", today, 1);

      // 5. DAY-WISE COUNTRY BREAKDOWN: Store country counts per day (analytics:day:2026-09-27:countries)
      await redis.hincrby(`analytics:day:${today}:countries`, detectedCountry, 1);

      // 6. Push to persistent recent visitors list (capped at last 100)
      const visitorEntry = JSON.stringify({
        timestamp: new Date().toISOString(),
        country: detectedCountry,
        path: visitedPath,
      });
      await redis.lpush("analytics:recent_visitors", visitorEntry);
      await redis.ltrim("analytics:recent_visitors", 0, 99);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Track error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
