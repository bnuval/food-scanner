import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { path, country } = await req.json();

    const apiKey = (process.env.JSONBIN_API_KEY || process.env["JSONBIN_API_KEY"])?.trim();
    const binId = (process.env.JSONBIN_BIN_ID || process.env["JSONBIN_BIN_ID"])?.trim();

    if (!apiKey || !binId) {
      return NextResponse.json({ success: false, reason: "Missing JSONBin keys" });
    }

    // 1. Extract genuine client IP address across Netlify / Cloudflare / proxies
    const clientIp =
      req.headers.get("x-nf-client-connection-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const detectedCountry = country || "India";
    const visitedPath = path || "/";
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // 2. Fetch the current records
    const getRes = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
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

    // 3. Dynamic Calculation: Always increment total visits
    data.totalVisits = (Number(data.totalVisits) || 0) + 1;

    data.countryCounts = data.countryCounts || {};
    data.countryCounts[detectedCountry] = (data.countryCounts[detectedCountry] || 0) + 1;

    data.pageCounts = data.pageCounts || {};
    data.pageCounts[visitedPath] = (data.pageCounts[visitedPath] || 0) + 1;

    data.dailyVisits = data.dailyVisits || {};
    data.dailyVisits[today] = (data.dailyVisits[today] || 0) + 1;

    data.recentVisitors = data.recentVisitors || [];
    data.recentVisitors.unshift({
      timestamp: now.toISOString(),
      country: detectedCountry,
      path: visitedPath,
      ip: clientIp,
    });

    // Keep log of last 100 granular visits
    if (data.recentVisitors.length > 100) {
      data.recentVisitors = data.recentVisitors.slice(0, 100);
    }

    // 4. Update the JSONBin document
    await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": apiKey,
      },
      body: JSON.stringify(data),
      cache: "no-store",
    });

    return NextResponse.json({ success: true, totalVisits: data.totalVisits });
  } catch (err: any) {
    console.error("Track error:", err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
