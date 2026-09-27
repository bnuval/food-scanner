"use client";

import { useState } from "react";
import Link from "next/link";

interface StatsData {
  totalVisits: number;
  countryCounts: Record<string, number>;
  pageCounts: Record<string, number>;
  recentVisitors: {
    timestamp: string;
    country: string;
    path: string;
  }[];
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<StatsData | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Incorrect password");

      setStats(data);
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    try {
      const res = await fetch("/api/admin/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center py-6 px-3 sm:px-4">
      <main className="w-full max-w-lg flex flex-col gap-4">
        {/* Header */}
        <header className="flex items-center justify-between px-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <h1 className="text-xl font-extrabold tracking-tight text-white">PureBite Admin</h1>
          </div>
          <Link
            href="/"
            className="text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl transition-all"
          >
            ← Back to App
          </Link>
        </header>

        {!isAuthenticated ? (
          /* Password Screen */
          <section className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-2xl backdrop-blur-md mt-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-emerald-400 fill-current" viewBox="0 0 24 24">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
            </div>
            <h2 className="text-base font-bold text-white">Analytics Access</h2>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Enter your admin security PIN or password to view live visitor metrics.
            </p>

            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Admin Password..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white rounded-xl py-3 px-3.5 outline-none transition-all placeholder:text-slate-500"
              />
              {error && <p className="text-[11px] text-rose-400 font-medium">{error}</p>}
              <button
                type="submit"
                disabled={loading || !password}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs py-3 rounded-xl shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all"
              >
                {loading ? "Verifying..." : "Unlock Dashboard"}
              </button>
            </form>
          </section>
        ) : (
          /* Live Stats Dashboard */
          <section className="space-y-4">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 shadow-xl">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Visits</span>
                <div className="text-3xl font-black text-white mt-1">{stats?.totalVisits || 0}</div>
              </div>
              <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 shadow-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Unique Countries</span>
                  <div className="text-3xl font-black text-emerald-400 mt-1">
                    {Object.keys(stats?.countryCounts || {}).length}
                  </div>
                </div>
                <button
                  onClick={refreshStats}
                  className="self-end text-[10px] text-slate-400 hover:text-white font-medium"
                >
                  ↻ Refresh
                </button>
              </div>
            </div>

            {/* Country Breakdown */}
            <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 shadow-xl">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                Visitors by Country
              </h3>
              <div className="space-y-2">
                {Object.entries(stats?.countryCounts || {}).length > 0 ? (
                  Object.entries(stats?.countryCounts || {})
                    .sort(([, a], [, b]) => b - a)
                    .map(([countryName, count], idx) => {
                      const total = stats?.totalVisits || 1;
                      const percentage = Math.round((count / total) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-200">{countryName}</span>
                            <span className="text-slate-400 font-mono">
                              {count} ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <p className="text-xs text-slate-500">No country data recorded yet.</p>
                )}
              </div>
            </div>

            {/* Page Breakdown */}
            <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 shadow-xl">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                Pages Visited
              </h3>
              <div className="space-y-2">
                {Object.entries(stats?.pageCounts || {}).map(([pagePath, count], idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-slate-950/80 border border-slate-800"
                  >
                    <span className="font-mono text-emerald-300">{pagePath}</span>
                    <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded-md font-mono">
                      {count} views
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Live Feed */}
            <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 shadow-xl">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                Recent Visitor Activity
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {stats?.recentVisitors && stats.recentVisitors.length > 0 ? (
                  stats.recentVisitors.map((v, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-slate-950/50 border border-slate-800/60"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span className="font-medium text-slate-300">{v.country}</span>
                        <span className="text-slate-500 font-mono text-[10px]">{v.path}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(v.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">Waiting for first visitor...</p>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
