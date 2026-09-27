import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { path, country } = await req.json();
    const detectedCountry = country || "India";
    const visitedPath = path || "/";
    const today = new Date().toISOString().split("T")[0];

    const url = (process.env.UPSTASH_REDIS_REST_URL || process.env["UPSTASH_REDIS_REST_URL"])?.trim();
    const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env["UPSTASH_REDIS_REST_TOKEN"])?.trim();

    if (url && token) {
      const visitorEntry = JSON.stringify({
        timestamp: new Date().toISOString(),
        country: detectedCountry,
        path: visitedPath,
      });

      // Pipeline all updates via Upstash REST /pipeline endpoint in a single HTTP roundtrip
      await fetch(`${url}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", "analytics:total_visits"],
          ["HINCRBY", "analytics:countries", detectedCountry, 1],
          ["HINCRBY", "analytics:pages", visitedPath, 1],
          ["HINCRBY", "analytics:daily_visits", today, 1],
          ["HINCRBY", `analytics:day:${today}:countries`, detectedCountry, 1],
          ["LPUSH", "analytics:recent_visitors", visitorEntry],
          ["LTRIM", "analytics:recent_visitors", 0, 99],
        ]),
        cache: "no-store",
      });
    }

    return NextResponse.json({ success: true, logged: Boolean(url && token) });
  } catch (err: any) {
    console.error("Track error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
