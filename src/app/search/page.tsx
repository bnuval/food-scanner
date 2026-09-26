"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface StoreOption {
  name: string;
  badge: string;
  url: string;
  color: string;
  category: "all" | "food" | "cosmetics";
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [categoryType, setCategoryType] = useState<"food" | "cosmetics">("food");
  const [userCountry, setUserCountry] = useState("India");

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

  const getStoreLinks = (searchQuery: string): StoreOption[] => {
    const q = encodeURIComponent(searchQuery.trim());
    if (!q) return [];

    if (userCountry === "India") {
      return [
        {
          name: "Amazon India",
          badge: "E-Commerce",
          url: `https://www.amazon.in/s?k=${q}`,
          color: "hover:border-amber-500/60 hover:bg-amber-950/20 text-amber-400",
          category: "all",
        },
        {
          name: "Flipkart",
          badge: "E-Commerce",
          url: `https://www.flipkart.com/search?q=${q}`,
          color: "hover:border-sky-500/60 hover:bg-sky-950/20 text-sky-400",
          category: "all",
        },
        {
          name: "Blinkit",
          badge: "10-Min Grocery",
          url: `https://blinkit.com/s/?q=${q}`,
          color: "hover:border-yellow-500/60 hover:bg-yellow-950/20 text-yellow-400",
          category: "food",
        },
        {
          name: "Zepto",
          badge: "Instant Delivery",
          url: `https://www.zeptonow.com/search?query=${q}`,
          color: "hover:border-purple-500/60 hover:bg-purple-950/20 text-purple-400",
          category: "food",
        },
        {
          name: "Nykaa",
          badge: "Beauty & Personal Care",
          url: `https://www.nykaa.com/search/result/?q=${q}`,
          color: "hover:border-pink-500/60 hover:bg-pink-950/20 text-pink-400",
          category: "cosmetics",
        },
      ];
    }

    if (userCountry === "United States") {
      return [
        {
          name: "Amazon US",
          badge: "E-Commerce",
          url: `https://www.amazon.com/s?k=${q}`,
          color: "hover:border-amber-500/60 hover:bg-amber-950/20 text-amber-400",
          category: "all",
        },
        {
          name: "Walmart",
          badge: "Retail & Grocery",
          url: `https://www.walmart.com/search?q=${q}`,
          color: "hover:border-blue-500/60 hover:bg-blue-950/20 text-blue-400",
          category: "all",
        },
        {
          name: "Target",
          badge: "Retail & Grocery",
          url: `https://www.target.com/s?searchTerm=${q}`,
          color: "hover:border-rose-500/60 hover:bg-rose-950/20 text-rose-400",
          category: "all",
        },
        {
          name: "Sephora",
          badge: "Cosmetics & Skincare",
          url: `https://www.sephora.com/search?keyword=${q}`,
          color: "hover:border-pink-500/60 hover:bg-pink-950/20 text-pink-400",
          category: "cosmetics",
        },
      ];
    }

    // Default international fallback
    return [
      {
        name: `Amazon (${userCountry})`,
        badge: "Global E-Commerce",
        url: `https://www.amazon.com/s?k=${q}`,
        color: "hover:border-amber-500/60 hover:bg-amber-950/20 text-amber-400",
        category: "all",
      },
      {
        name: "Google Shopping",
        badge: "Compare Local Stores",
        url: `https://www.google.com/search?tbm=shop&q=${q}`,
        color: "hover:border-emerald-500/60 hover:bg-emerald-950/20 text-emerald-400",
        category: "all",
      },
    ];
  };

  const storeOptions = getStoreLinks(query).filter(
    (store) => store.category === "all" || store.category === categoryType
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center py-6 px-3 sm:px-4">
      <main className="w-full max-w-md flex flex-col gap-4">
        {/* Navigation & Header */}
        <header className="flex items-center justify-between px-2 pb-2 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h1 className="text-xl font-extrabold tracking-tight text-white">PureBite AI</h1>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Multi-Platform Product Search</p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full">
            <span className="text-[10px] text-slate-400 font-medium">Market:</span>
            <span className="text-[10px] font-bold text-emerald-400">{userCountry}</span>
          </div>
        </header>

        {/* Top Tab Bar: Switch between Scanner and Search */}
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
              onClick={() => setCategoryType("food")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                categoryType === "food"
                  ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:text-slate-200"
              }`}
            >
              🥗 Food & Grocery
            </button>
            <button
              onClick={() => setCategoryType("cosmetics")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                categoryType === "cosmetics"
                  ? "bg-slate-800 text-pink-400 border border-pink-500/30"
                  : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:text-slate-200"
              }`}
            >
              💄 Cosmetics & Care
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                categoryType === "food"
                  ? "Search organic peanut butter, ketchup, oats..."
                  : "Search mineral sunscreen, sulfate-free shampoo..."
              }
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white rounded-2xl py-3.5 pl-4 pr-10 outline-none transition-all placeholder:text-slate-500"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search input"
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white text-xs"
              >
                &#x2715;
              </button>
            )}
          </div>

          {/* Quick suggestions */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-[10px] text-slate-500 self-center mr-1">Trending:</span>
            {(categoryType === "food"
              ? ["Whole Truth Bar", "Jaggery Ketchup", "Cold Pressed Oil", "Rolled Oats"]
              : ["Ceramide Moisturizer", "Zinc Sunscreen", "Niacinamide Serum", "Herbal Lip Balm"]
            ).map((item, i) => (
              <button
                key={i}
                onClick={() => setQuery(item)}
                className="text-[10px] bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-800 px-2 py-0.5 rounded-lg transition-colors"
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {/* Store Results Grid */}
        <section className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Compare Across Local Platforms
              </h2>
              <p className="text-[10px] text-slate-400">
                Direct search links for {userCountry} stores
              </p>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono">Live Link</span>
          </div>

          {query.trim().length > 0 ? (
            <div className="space-y-2.5">
              {storeOptions.map((store, i) => (
                <a
                  key={i}
                  href={store.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 ${store.color} transition-all group`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {store.name}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{store.badge}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span>Search</span>
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-950/40 rounded-2xl border border-slate-800">
              <svg
                className="w-8 h-8 text-slate-600 mx-auto mb-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <p className="text-xs text-slate-400 font-medium">Type any food or cosmetic item above</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                We will generate instant comparison search links for Flipkart, Amazon, and local quick-commerce stores.
              </p>
            </div>
          )}
        </section>

        {/* Legal / Educational Disclaimer */}
        <footer className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
            <span className="font-semibold text-slate-300">Disclaimer:</span> Product search links are generated for direct multi-platform convenience. Always verify complete ingredients and certification marks on retailer sites.
          </p>
        </footer>
      </main>
    </div>
  );
}
