"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { MARKET_STANDARDS } from "./market-standards";

const ANALYSIS_CACHE_PREFIX = "purebite:analysis:v5:";
const ANALYSIS_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_CACHED_ANALYSES = 40;

type CachedAnalysis = { expiresAt: number; result: unknown };

async function analysisCacheKey(images: string[], country: string): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  const content = new TextEncoder().encode(JSON.stringify({ images, country }));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", content);
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${ANALYSIS_CACHE_PREFIX}${hash}`;
}

function readCachedAnalysis(key: string): unknown | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedAnalysis;
    if (cached.expiresAt <= Date.now() || !cached.result || typeof cached.result !== "object") {
      localStorage.removeItem(key);
      return null;
    }
    return cached.result;
  } catch (error) {
    console.warn("[analysis-cache] Could not read cached scan", error);
    return null;
  }
}

function writeCachedAnalysis(key: string, result: unknown): void {
  try {
    const now = Date.now();
    const entries: Array<{ key: string; expiresAt: number }> = [];
    for (let index = 0; index < localStorage.length; index++) {
      const entryKey = localStorage.key(index);
      if (!entryKey?.startsWith(ANALYSIS_CACHE_PREFIX)) continue;
      try {
        const entry = JSON.parse(localStorage.getItem(entryKey) || "null") as CachedAnalysis | null;
        if (entry && entry.expiresAt > now) entries.push({ key: entryKey, expiresAt: entry.expiresAt });
        else localStorage.removeItem(entryKey);
      } catch {
        localStorage.removeItem(entryKey);
      }
    }
    entries.sort((a, b) => a.expiresAt - b.expiresAt);
    while (entries.length >= MAX_CACHED_ANALYSES) {
      localStorage.removeItem(entries.shift()!.key);
    }
    localStorage.setItem(key, JSON.stringify({ expiresAt: now + ANALYSIS_CACHE_TTL_MS, result }));
  } catch (error) {
    console.warn("[analysis-cache] Could not save scan result", error);
  }
}

export default function Home() {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [scanError, setScanError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [showingCachedResult, setShowingCachedResult] = useState(false);
  const [userCountry, setUserCountry] = useState<string>("India");
  const [userTimezone, setUserTimezone] = useState<string>("");

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
      setUserTimezone(tz);

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

  const compressImage = async (file: File): Promise<string> => {
    const sourceUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = sourceUrl;
      await image.decode();

      const maxDimension = 1600;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not prepare this photo. Please choose another image.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.72));
      if (!blob) throw new Error("Could not prepare this photo. Please choose another image.");

      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string"
          ? resolve(reader.result)
          : reject(new Error("Could not prepare this photo. Please choose another image."));
        reader.onerror = () => reject(new Error("Could not read this photo. Please choose another image."));
        reader.readAsDataURL(blob);
      });
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const availableSlots = Math.max(0, 3 - images.length);
    const fileList = Array.from(files).slice(0, availableSlots);
    try {
      const compressedList = await Promise.all(fileList.map((file) => compressImage(file)));
      setImages((prev) => [...prev, ...compressedList].slice(0, 3));
      setScanError("");
      setResult(null);
      setShowingCachedResult(false);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Could not prepare the selected photo.");
    } finally {
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
    setShowingCachedResult(false);
  };

  const handleAnalyze = async () => {
    if (images.length === 0) return;
    setLoading(true);
    setUploadProgress(0);
    setScanError("");
    setResult(null);
    setShowingCachedResult(false);

    try {
      const cacheKey = await analysisCacheKey(images, userCountry);
      const cached = cacheKey ? readCachedAnalysis(cacheKey) : null;
      if (cached) {
        setResult(cached);
        setShowingCachedResult(true);
        setUploadProgress(100);
        return;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("You appear to be offline. Reconnect, then retry; your selected photos are kept.");
      }

      const data = await new Promise<any>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("POST", "/api/analyze");
        request.timeout = 120_000;
        request.setRequestHeader("Content-Type", "application/json");
        request.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            setUploadProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
          }
        };
        request.onload = () => {
          let response: any;
          try {
            response = JSON.parse(request.responseText);
          } catch {
            reject(new Error("The server returned an invalid response. Please retry."));
            return;
          }
          if (request.status < 200 || request.status >= 300) {
            reject(new Error(response.error || "Analysis failed. Please retry."));
            return;
          }
          resolve(response);
        };
        request.onerror = () => reject(new Error("Connection interrupted. Your photos are kept; reconnect and retry."));
        request.ontimeout = () => reject(new Error("This is taking longer than usual. Your photos are kept; please retry in a moment."));
        request.send(JSON.stringify({
          imagesBase64: images,
          userCountry,
          userTimezone,
        }));
      });
      if (cacheKey) writeCachedAnalysis(cacheKey, data);
      setResult(data);
    } catch (err: any) {
      setScanError(err.message || "An unexpected error occurred. Your photos are kept so you can retry.");
    } finally {
      setLoading(false);
    }
  };

  const isPositiveVerdict = result?.verdict === "Must Buy" || result?.verdict === "Recommended Buy";
  const isOkayVerdict = result?.verdict === "Okay to Buy";
  const isIndia = userCountry === "India";

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
            <p className="text-[11px] text-slate-400 font-medium">Health-calibrated label analysis</p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full">
            <span className="text-[10px] text-slate-400 font-medium">Market:</span>
            <span className="text-[10px] font-bold text-emerald-400">{userCountry}</span>
          </div>
        </header>

        {/* Top Tab Bar */}
        <nav className="flex rounded-2xl bg-slate-900/90 p-1 border border-slate-800">
          <div className="flex-1 py-2 text-center text-xs font-bold text-slate-950 bg-emerald-500 rounded-xl shadow-md">
            Package Scanner
          </div>
          <Link
            href="/search"
            className="flex-1 py-2 text-center text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition-all"
          >
            Product Search
          </Link>
        </nav>

        {/* Scan & Upload Card */}
        <section className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 shadow-2xl backdrop-blur-md">
          {images.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Selected Angle(s)</span>
                <span className="text-[11px] text-slate-400">{images.length}/3 Photos</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {images.map((imgSrc, idx) => (
                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-700">
                    <img src={imgSrc} alt={"Capture " + (idx + 1)} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(idx)}
                      disabled={loading}
                      aria-label="Remove image"
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center text-xs hover:bg-rose-600 transition-colors"
                    >
                      &#x2715;
                    </button>
                  </div>
                ))}
                {images.length < 3 && (
                  <label className="cursor-pointer border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-400 aspect-square hover:border-emerald-500 hover:text-emerald-400 transition-all bg-slate-950/40">
                    <span className="text-2xl font-light leading-none">+</span>
                    <span className="text-[10px] mt-1 font-medium">Add angle</span>
                    <input type="file" accept="image/*" multiple onChange={handleCapture} className="hidden" />
                  </label>
                )}
              </div>
            </div>
          ) : (
            <div className="py-6 px-3 text-center flex flex-col items-center">
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-lg border border-slate-700/80 mb-4 group bg-white">
                <NextImage
                  src="/purebite-home-hero.png"
                  alt="PureBite AI scanning food and cosmetic labels"
                  fill
                  priority
                  sizes="(max-width: 448px) calc(100vw - 88px), 384px"
                  className="object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <h2 className="text-base font-bold text-white tracking-tight">Scan a Product Label</h2>
              <p className="text-xs text-slate-300 mt-2 max-w-[280px] leading-relaxed">
                Take a new picture or choose existing photos of the <span className="font-semibold text-emerald-400">ingredient list</span>, <span className="font-semibold text-emerald-400">product front</span>, or <span className="font-semibold text-emerald-400">QR code / barcode</span> from your device gallery.
              </p>

              <div className="flex flex-col sm:flex-row gap-2.5 w-full mt-5">
                <label className="flex-1 cursor-pointer inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-3 px-4 rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M4 4h3l2-2h6l2 2h3a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm8 3a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6z"/>
                  </svg>
                  <span>Camera</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handleCapture} className="hidden" />
                </label>

                <label className="flex-1 cursor-pointer inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-3 px-4 rounded-2xl border border-slate-700 active:scale-95 transition-all">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z"/>
                  </svg>
                  <span>Upload Photos</span>
                  <input type="file" accept="image/*" multiple onChange={handleCapture} className="hidden" />
                </label>
              </div>
            </div>
          )}

          {images.length > 0 && (
            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl disabled:opacity-50 text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-slate-950" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>{uploadProgress < 100 ? `Uploading photos ${uploadProgress}%...` : "AI reviewing label..."}</span>
                  </>
                ) : (
                  <span>Evaluate Health Verdict</span>
                )}
              </button>
              <button
                onClick={() => { setImages([]); setResult(null); }}
                disabled={loading}
                className="px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Reset
              </button>
            </div>
          )}
          {images.length > 0 && !loading && (
            <p className="mt-2 text-center text-[11px] leading-relaxed text-slate-400">
              High traffic may occasionally cause a timeout. If it does, please try again—we’ll make another attempt.
              Thank you for your patience.
            </p>
          )}
          {scanError && (
            <p role="alert" className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs leading-relaxed text-rose-200">
              {scanError}
            </p>
          )}
        </section>

        {/* Loading Skeleton */}
        {loading && (
          <>
            <div role="status" aria-live="polite" className="rounded-3xl border border-emerald-500/20 bg-slate-900/90 p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" aria-hidden="true"></div>
                <div>
                  <h3 className="text-sm font-bold text-white">Our AI is reviewing your product</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">
                    Please be patient—our AI is checking the label and preparing a health score and ingredient summary. This may take a little while.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 border-t border-slate-800 pt-3 text-xs text-slate-300 sm:grid-cols-3">
                <span>Reading the product label</span>
                <span>Reviewing ingredients and label details</span>
                <span>Preparing your score and recommendation</span>
              </div>
              <p className="mt-3 text-[11px] text-slate-500">Keep this screen open while the review runs.</p>
            </div>
            <div className="bg-slate-900/80 rounded-3xl p-5 border border-slate-800 animate-pulse flex flex-col gap-3" aria-hidden="true">
              <div className="h-20 bg-slate-800 rounded-2xl"></div>
              <div className="h-16 bg-slate-800/60 rounded-2xl"></div>
              <div className="h-28 bg-slate-800/40 rounded-2xl"></div>
            </div>
          </>
        )}

        {/* Results Screen */}
        {result && (
          <section className="flex flex-col gap-3">
            {showingCachedResult && (
              <p className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
                Showing the saved analysis for this photo in this browser.
              </p>
            )}
            {result.productName === "Unknown Product" && result.score === 0 ? (
              <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-3xl text-center">
                <h3 className="text-sm font-bold text-amber-400">Photo Not Legible</h3>
                <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
                  {result.summary || "The label text is blurred or reflective. Retake with steady lighting."}
                </p>
              </div>
            ) : (
              <>
                {/* 1. HERO VERDICT BADGE */}
                <div
                  className={`p-6 rounded-3xl border text-center shadow-2xl transition-all ${
                    isPositiveVerdict
                      ? "bg-gradient-to-b from-emerald-950/80 to-slate-900 border-emerald-500/40"
                      : isOkayVerdict
                        ? "bg-gradient-to-b from-amber-950/80 to-slate-900 border-amber-500/40"
                        : "bg-gradient-to-b from-rose-950/80 to-slate-900 border-rose-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    <span className="truncate max-w-[200px]">{result.productName || "Scanned Product"} · {result.category}</span>
                    <span className="font-mono bg-slate-800/90 px-2.5 py-0.5 rounded-full border border-slate-700 text-white">
                      Score: {result.score}/100
                    </span>
                  </div>

                  <div className="my-2">
                    <div
                      className={`inline-block text-4xl sm:text-5xl font-black tracking-tight uppercase ${
                        isPositiveVerdict ? "text-emerald-400" : isOkayVerdict ? "text-amber-400" : "text-rose-400"
                      }`}
                    >
                      {result.verdict}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800/80 text-left">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        Recommendation
                      </h3>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-normal">{result.summary}</p>
                  </div>
                </div>

                <details className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4">
                  <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-sky-300">
                    Regulatory standards by market
                  </summary>
                  <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                    General references and photo-based observations only. This is not a legal compliance assessment;
                    This app does not make a legal compliance determination; requirements depend on product type and the full label may not be visible.
                  </p>
                  <div className="mt-3 flex flex-col gap-3">
                    {MARKET_STANDARDS.map(({ name, framework, source }) => (
                      <article key={name} className="border-t border-slate-800 pt-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h4 className="text-xs font-semibold text-slate-100">{name}</h4>
                          <a
                            href={source}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-sky-300 underline underline-offset-2"
                          >
                            Official reference
                          </a>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-400">{framework}</p>
                      </article>
                    ))}
                  </div>
                </details>

                {/* Flagged Ingredients of Concern */}
                {result.harmfulIngredients?.length > 0 && (
                  <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-rose-400 fill-current flex-shrink-0" viewBox="0 0 24 24">
                          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                        </svg>
                        <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                          Ingredients of Concern
                        </h3>
                      </div>
                      {isIndia && (
                        <span className="text-[10px] text-rose-300/80 font-medium">चिंताजनक सामग्री</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {result.harmfulIngredients.map((item: { name: string; risk: string }, i: number) => (
                        <div key={i} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
                          <div className="font-semibold text-rose-200">{item.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{item.risk}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Positive Strengths */}
                {result.positives?.length > 0 && (
                  <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800">
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                      Positive Highlights
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {result.positives.map((hl: string, i: number) => (
                        <span key={i} className="text-[11px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 px-2.5 py-1 rounded-lg">
                          {hl}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. LOCAL MARKET ALTERNATIVES */}
                {Array.isArray(result.alternatives) && result.alternatives.length > 0 && (
                <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Product Alternatives</h3>
                      <p className="text-[10px] text-slate-400">Available in {userCountry} market</p>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">Ranked</span>
                  </div>

                  {result.alternatives && result.alternatives.length > 0 ? (
                    <div className="space-y-2.5">
                      {result.alternatives.map((alt: any, i: number) => {
                        const scoreDiff = alt.estimatedScore - result.score;
                        return (
                          <div key={i} className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                  {alt.brand}
                                </span>
                                <h4 className="text-xs font-bold text-white">{alt.productName}</h4>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-black font-mono text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-700/50">
                                  {alt.estimatedScore}/100
                                </span>
                                {scoreDiff > 0 && (
                                  <span className="text-[10px] text-emerald-400 font-medium mt-0.5">
                                    +{scoreDiff} pts higher
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-300 mt-2 border-t border-slate-800/80 pt-1.5 leading-relaxed">
                              {alt.whyBetter}
                            </p>

                            {/* Direct Buy Hyperlink */}
                            {alt.purchaseUrl && (
                              <div className="mt-3 pt-2 border-t border-slate-800/60 flex justify-end">
                                <a
                                  href={alt.purchaseUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/50 hover:bg-emerald-950/80 border border-emerald-800/60 px-3 py-1.5 rounded-xl transition-all"
                                >
                                  <span>Buy on {isIndia ? "Amazon.in" : "Market"}</span>
                                  <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                                    <path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                                  </svg>
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-slate-950/40 rounded-2xl border border-slate-800">
                      <p className="text-xs text-slate-400">
                        Alternative products are not included in this response.
                      </p>
                    </div>
                  )}
                </div>
                )}

                {/* Educational disclaimer */}
                <footer className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
                  <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
                    <span className="font-semibold text-slate-300">Disclaimer:</span> This application and its AI-generated scores are for educational and informational purposes only. They are not medical or healthcare advice. Consult a qualified health professional before making significant health or dietary decisions.
                  </p>
                </footer>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
