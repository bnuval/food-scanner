import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    // Set your secure admin password here (or use process.env.ADMIN_PASSWORD)
    const expectedPassword = process.env.ADMIN_PASSWORD || "PureBiteAdmin2026";

    if (!password || password !== expectedPassword) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const stats = globalThis.__purebite_analytics || {
      totalVisits: 0,
      countryCounts: {},
      pageCounts: {},
      recentVisitors: [],
    };

    return NextResponse.json({
      totalVisits: stats.totalVisits,
      countryCounts: stats.countryCounts,
      pageCounts: stats.pageCounts,
      recentVisitors: stats.recentVisitors.slice(0, 30),
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
