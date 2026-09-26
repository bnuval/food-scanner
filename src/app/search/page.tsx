"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ProductResult {
  brand: string;
  productName: string;
  healthScore: number;
  verdictReason: string;
  keyIngredients?: string[];
  highlights?: string[];
  stores: {
    name: string;
    url: string;
    badgeColor: string;
  }[];
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [categoryType, setCategoryType] = useState<"food" | "cosmetics">("food");
  const [userCountry, setUserCountry] = useState("India");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
      if (tz.includes("Calcutta") || tz.includes("Kolkata") || tz.includes("Asia/Colombo")) {
        setUserCountry("India");
      } else if (tz.includes("Europe/London")) {
        setUserCountry("United Kingdom");
      } else if (tz.includes("America/") || tz.includes("US/")) {
        setUserCountry("United States");
      } else if (tz.includes("Europe/")) {
        setUserCountry("European Union");
      } else if (tz.includes("Australia/")) {
        setUserCountry("Australia");
      } else if (tz.includes("Asia/Dubai")) {
        setUserCountry("UAE");
      } else {
        setUserCountry("India");
      }
    } catch {
      setUserCountry("India");
    }
  }, []);

  const handleSearch = async (searchTerm?: string) => {
    const finalQuery = searchTerm || query;
    if (!finalQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const res = await fetch("/api/search-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: finalQuery,
          categoryType,
          userCountry,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setProducts(data.products || []);
    } catch (err: any) {
      alert(err.message || "Failed to find products");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTag = (tag: string) => {
    setQuery(tag);
    handleSearch(tag);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center py-6 px-3 sm:px-4">
      <main className="w-full max-w-md flex flex-col gap-4">
        {/* Header */}
        <header className="flex items-center justify-between px-2 pb-2 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h1 className="text-xl font-extrabold tracking-tight text-white">PureBite AI</h1>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Certified Healthy Product Finder</p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full">
            <span className="text-[10px] text-slate-400 font-medium">Market:</span>
            <span className="text-[10px] font-bold text-emerald-400">{userCountry}</span>
          </div>
        </header>

        {/* Tab Bar */}
        <nav className="flex rounded-2xl bg-slate-900/90 p-1 border border-slate-800">
          <Link
            href="/"
            className="flex-1 py-2 text-center text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition-all"
          >
            Package Scanner
          </Link>
          <div className="flex-1 py-2 text-center text-xs font-bold text-slate-950 bg-emerald-500 rounded-xl shadow-md">
            Product Search
          </div>
        </nav>

        {/* Search Input Box */}
        <section className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 shadow-2xl backdrop-blur-md">
          {/* Category Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                setCategoryType("food");
                setProducts([]);
                setHasSearched(false);
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                categoryType === "food"
                  ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:text-slate-200"
              }`}
            >
              🥗 Clean Food
            </button>
            <button
              onClick={() => {
                setCategoryType("cosmetics");
                setProducts([]);
                setHasSearched(false);
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                categoryType === "cosmetics"
                  ? "bg-slate-800 text-pink-400 border border-pink-500/30"
                  : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:text-slate-200"
              }`}
            >
              💄 Safe Cosmetics
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="relative"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                categoryType === "food"
                  ? "Search organic ketchup, dark chocolate, oats..."
                  : "Search mineral sunscreen, toxin-free face wash..."
              }
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white rounded-2xl py-3.5 pl-4 pr-24 outline-none transition-all placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all"
            >
              {loading ? "..." : "Search"}
            </button>
          </form>

          {/* Quick Suggestions */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-[10px] text-slate-500 self-center mr-1">Trending:</span>
            {(categoryType === "food"
              ? ["Tomato Ketchup", "Peanut Butter", "Protein Bar", "Cold Pressed Oil"]
              : ["Mineral Sunscreen", "Niacinamide", "Hair Oil", "Lip Balm"]
            ).map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleQuickTag(item)}
                className="text-[10px] bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-800 px-2.5 py-1 rounded-lg transition-colors"
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {/* Loading Skeleton */}
        {loading && (
          <div className="bg-slate-900/80 rounded-3xl p-5 border border-slate-800 animate-pulse flex flex-col gap-3">
            <div className="h-24 bg-slate-800 rounded-2xl"></div>
            <div className="h-24 bg-slate-800/70 rounded-2xl"></div>
            <div className="h-24 bg-slate-800/40 rounded-2xl"></div>
          </div>
        )}

        {/* Results Section */}
        {!loading && hasSearched && (
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Top-Rated Healthy Picks
                </h2>
                <p className="text-[10px] text-slate-400">
                  Standardized clean-label score (75-100) available in {userCountry}
                </p>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                {products.length} Vetted
              </span>
            </div>

            {products.length > 0 ? (
              products.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl space-y-3"
                >
                  {/* Brand & Score Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                        {item.brand}
                      </span>
                      <h3 className="text-sm font-bold text-white leading-tight">
                        {item.productName}
                      </h3>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="text-xs font-black font-mono text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-700/50">
                        {item.healthScore}/100
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold mt-0.5">
                        BUY VERIFIED
                      </span>
                    </div>
                  </div>

                  {/* Why it is clean */}
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                    {item.verdictReason}
                  </p>

                  {/* Key Highlights / Ingredients */}
                  {item.highlights && item.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.highlights.map((h, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700"
                        >
                          ✓ {h}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Direct Store Buy Buttons */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-400 font-medium block mb-1.5">
                      Buy directly on:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.stores.map((store, sIdx) => (
                        <a
                          key={sIdx}
                          href={store.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all ${store.badgeColor}`}
                        >
                          <span>{store.name}</span>
                          <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                            <path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 bg-slate-900/60 rounded-3xl border border-slate-800">
                <p className="text-xs text-slate-400">
                  No verified healthy options found for this specific query. Try a general term like "Peanut Butter" or "Ketchup".
                </p>
              </div>
            )}
          </section>
        )}

        {/* Initial Prompt State */}
        {!hasSearched && (
          <div className="text-center py-10 px-4 bg-slate-900/40 rounded-3xl border border-slate-800/80">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center mx-auto mb-3">
              <span className="text-xl">✨</span>
            </div>
            <h3 className="text-sm font-bold text-white">Find Certified Clean Products</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px] mx-auto leading-relaxed">
              Search any food or personal care item to discover products rated 75+ with direct links to Amazon, Flipkart, Blinkit, and local stores.
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <footer className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
            <span className="font-semibold text-slate-300">Disclaimer:</span> Nutritional and cosmetic scores are evaluated for informational and educational purposes using clean-label standards. Always review ingredient packaging before consumption.
          </p>
        </footer>
      </main>
    </div>
  );
}
