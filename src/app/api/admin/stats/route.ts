import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const expectedPassword = process.env.ADMIN_PASSWORD || "PureBiteAdmin2026";

    if (!password || password !== expectedPassword) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const apiKey = (process.env.JSONBIN_API_KEY || process.env["JSONBIN_API_KEY"])?.trim();
    const binId = (process.env.JSONBIN_BIN_ID || process.env["JSONBIN_BIN_ID"])?.trim();

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

    const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
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
      recentVisitors: data.recentVisitors || [],
    });
  } catch (err: any) {
    console.error("Stats fetch error:", err);
    return NextResponse.json(
      { error: `Failed to load stats: ${err?.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
