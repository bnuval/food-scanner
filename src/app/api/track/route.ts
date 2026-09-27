import { NextRequest, NextResponse } from "next/server";

// In-memory analytics store (persists across requests during server lifecycle)
// For permanent historical retention across server redeploys, you can easily hook up Upstash Redis or Supabase.
interface AnalyticsState {
  totalVisits: number;
  countryCounts: Record<string, number>;
  pageCounts: Record<string, number>;
  recentVisitors: {
    timestamp: string;
    country: string;
    path: string;
  }[];
}

declare global {
  // eslint-disable-next-line no-var
  var __purebite_analytics: AnalyticsState | undefined;
}

if (!globalThis.__purebite_analytics) {
  globalThis.__purebite_analytics = {
    totalVisits: 0,
    countryCounts: {},
    pageCounts: {},
    recentVisitors: [],
  };
}

export async function POST(req: NextRequest) {
  try {
    const { path, country } = await req.json();
    const stats = globalThis.__purebite_analytics!;

    const detectedCountry = country || "Unknown";
    const visitedPath = path || "/";

    stats.totalVisits += 1;
    stats.countryCounts[detectedCountry] = (stats.countryCounts[detectedCountry] || 0) + 1;
    stats.pageCounts[visitedPath] = (stats.pageCounts[visitedPath] || 0) + 1;

    // Keep log of last 50 visits
    stats.recentVisitors.unshift({
      timestamp: new Date().toISOString(),
      country: detectedCountry,
      path: visitedPath,
    });

    if (stats.recentVisitors.length > 50) {
      stats.recentVisitors.pop();
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
