"use client";

import { useState } from "react";
import Link from "next/link";

interface VisitorEntry {
  timestamp: string;
  country: string;
  path: string;
  ip?: string;
}

interface StatsData {
  totalVisits: number;
  countryCounts: Record<string, number>;
  pageCounts: Record<string, number>;
  dailyVisits: Record<string, number>;
  recentVisitors: VisitorEntry[];
  notice?: string;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<StatsData | null>(null);

  const fetchStats = async (pwd: string) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStats(password);
  };

  // Sort daily visits latest first
  const sortedDays = Object.entries(stats?.dailyVisits || {}).sort(
    ([dayA], [dayB]) => new Date(dayB).getTime() - new Date(dayA).getTime()
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center py-6 px-3 sm:px-6">
      <main className="w-full max-w-4xl flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">PureBite Analytics</h1>
              <p className="text-[11px] text-slate-400">Live Traffic & Market Intelligence</p>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl transition-all"
          >
            ← View App
          </Link>
        </header>

        {!isAuthenticated ? (
          /* Password Screen */
          <section className="bg-slate-900/90 max-w-md mx-auto w-full rounded-3xl p-6 border border-slate-800 shadow-2xl backdrop-blur-md mt-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-emerald-400 fill-current" viewBox="0 0 24 24">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-white">Admin Dashboard Login</h2>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Enter admin password to review live total hit additions and visitor IP logs.
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
                {loading ? "Verifying..." : "View Analytics"}
              </button>
            </form>
          </section>
        ) : (
          /* Live Stats & Table */
          <section className="space-y-5">
            {stats?.notice && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl text-xs text-amber-300">
                ⚠️ {stats.notice}
              </div>
            )}

            {/* DYNAMIC TOP HIT CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Total Web Page Hits
                </span>
                <div className="text-4xl font-black text-white mt-2 flex items-baseline gap-2">
                  <span>{stats?.totalVisits || 0}</span>
                  <span className="text-xs font-semibold text-emerald-400 uppercase">Hits</span>
                </div>
              </div>

              <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Markets Logged
                </span>
                <div className="text-4xl font-black text-emerald-400 mt-2">
                  {Object.keys(stats?.countryCounts || {}).length}
                </div>
              </div>

              <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Unique Active Days
                </span>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-4xl font-black text-sky-400">{sortedDays.length}</div>
                  <button
                    onClick={() => fetchStats(password)}
                    className="text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg transition-all"
                  >
                    ↻ Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* TABULAR VISITOR AUDIT LOG */}
            <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Visitor Log Table
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Real-time traffic records including Market, IP, Date, and Time
                  </p>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-1 rounded-full">
                  {stats?.recentVisitors?.length || 0} Records
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/90 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4">Market</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Page Path</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 bg-slate-900/50">
                    {stats?.recentVisitors && stats.recentVisitors.length > 0 ? (
                      stats.recentVisitors.map((entry, idx) => {
                        const dateObj = new Date(entry.timestamp);
                        const formattedDate = dateObj.toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        });
                        const formattedTime = dateObj.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        });

                        return (
                          <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-md">
                                {entry.country}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-200">
                              {entry.ip || "127.0.0.1"}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                              {formattedDate}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                              {formattedTime}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap font-mono text-sky-400 text-[11px]">
                              {entry.path}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          No visitor traffic recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DAY-WISE ACCUMULATION SUMMARY */}
            <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 shadow-xl">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                Daily Hit Summary
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {sortedDays.slice(0, 8).map(([dateStr, count], idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between"
                  >
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-base font-bold text-white font-mono mt-1">
                      {count} <span className="text-[10px] text-slate-500 font-normal">hits</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
