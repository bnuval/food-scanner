"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
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

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1000;
          const scale = Math.min(1, MAX_WIDTH / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;

          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const compressedList = await Promise.all(fileList.map((file) => compressImage(file)));

    setImages((prev) => [...prev, ...compressedList].slice(0, 3));
    setResult(null);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (images.length === 0) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagesBase64: images,
          userCountry,
          userTimezone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data);
    } catch (err: any) {
      alert(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const isBuy = result?.verdict === "BUY";
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
            <p className="text-[11px] text-slate-400 font-medium">Instant Health Verdict & Local Alternatives</p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full">
            <span className="text-[10px] text-slate-400 font-medium">Market:</span>
            <span className="text-[10px] font-bold text-emerald-400">{userCountry}</span>
          </div>
        </header>

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
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-lg border border-slate-700/80 mb-4 group">
                <img
                  src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80"
                  alt="Fresh wholesome food"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent"></div>
              </div>

              <h2 className="text-base font-bold text-white tracking-tight">Scan Food Package</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-[250px] leading-relaxed">
                Take a new picture or choose existing photos from your device gallery.
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
                    <span>Evaluating Label & Compliance...</span>
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
        </section>

        {/* Loading Skeleton */}
        {loading && (
          <div className="bg-slate-900/80 rounded-3xl p-5 border border-slate-800 animate-pulse flex flex-col gap-3">
            <div className="h-20 bg-slate-800 rounded-2xl"></div>
            <div className="h-16 bg-slate-800/60 rounded-2xl"></div>
            <div className="h-28 bg-slate-800/40 rounded-2xl"></div>
          </div>
        )}

        {/* Results Screen */}
        {result && (
          <section className="flex flex-col gap-3">
            {!result.isReadable ? (
              <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-3xl text-center">
                <h3 className="text-sm font-bold text-amber-400">Photo Not Legible</h3>
                <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
                  {result.primaryReason || "The label text is blurred or reflective. Retake with steady lighting."}
                </p>
              </div>
            ) : (
              <>
                {/* 1. HERO VERDICT BADGE */}
                <div
                  className={`p-6 rounded-3xl border text-center shadow-2xl transition-all ${
                    isBuy
                      ? "bg-gradient-to-b from-emerald-950/80 to-slate-900 border-emerald-500/40"
                      : "bg-gradient-to-b from-rose-950/80 to-slate-900 border-rose-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    <span className="truncate max-w-[200px]">{result.brandName || result.productName || "Scanned Product"}</span>
                    <span className="font-mono bg-slate-800/90 px-2.5 py-0.5 rounded-full border border-slate-700 text-white">
                      Score: {result.healthScore}/100
                    </span>
                  </div>

                  <div className="my-2">
                    <div
                      className={`inline-block text-4xl sm:text-5xl font-black tracking-tight uppercase ${
                        isBuy ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isBuy ? "BUY" : "AVOID"}
                    </div>
                  </div>

                  {/* 2. REASON FOR VERDICT (Hindi shown only for India) */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80 text-left">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        {isBuy ? "Why you should buy:" : "Why you should avoid:"}
                      </h3>
                      {isIndia && result.primaryReasonHindi && (
                        <span className="text-[10px] text-amber-400/90 font-medium">
                          {isBuy ? "यह उत्पाद क्यों खरीदें:" : "इस उत्पाद से क्यों बचें:"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-normal">
                      {result.primaryReason}
                    </p>
                    {isIndia && result.primaryReasonHindi && (
                      <p className="text-xs text-amber-200/90 mt-1 leading-relaxed border-t border-slate-800/50 pt-1">
                        {result.primaryReasonHindi}
                      </p>
                    )}
                  </div>
                </div>

                {/* Regional Compliance & Regulatory Notes (Hindi shown only for India) */}
                {result.complianceNotes && (
                  <div className="bg-slate-900/90 rounded-3xl p-4 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-sky-400 fill-current flex-shrink-0" viewBox="0 0 24 24">
                          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                        </svg>
                        <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                          {userCountry} Regulatory Compliance
                        </h3>
                      </div>
                      {isIndia && result.complianceNotesHindi && (
                        <span className="text-[10px] text-sky-300/80 font-medium">नियामक अनुपालन</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {result.complianceNotes}
                    </p>
                    {isIndia && result.complianceNotesHindi && (
                      <p className="text-xs text-sky-200/90 mt-1.5 border-t border-slate-800/60 pt-1.5 leading-relaxed">
                        {result.complianceNotesHindi}
                      </p>
                    )}
                  </div>
                )}

                {/* Flagged Ingredients of Concern (Hindi shown only for India) */}
                {result.flaggedIngredients?.length > 0 && (
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
                      {result.flaggedIngredients.map((item: any, i: number) => (
                        <div key={i} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
                          <div className="font-semibold text-rose-200">{item.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{item.concern}</div>
                          {isIndia && item.concernHindi && (
                            <div className="text-[11px] text-rose-300/80 mt-1 border-t border-slate-800/50 pt-1">
                              {item.concernHindi}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Positive Strengths */}
                {result.positiveHighlights?.length > 0 && (
                  <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800">
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                      Nutritional Strengths
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {result.positiveHighlights.map((hl: string, i: number) => (
                        <span key={i} className="text-[11px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 px-2.5 py-1 rounded-lg">
                          {hl}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. LOCAL MARKET ALTERNATIVES */}
                <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        {isBuy ? "Similar Top-Rated Choices" : "Healthier Alternatives"}
                      </h3>
                      <p className="text-[10px] text-slate-400">Available in {userCountry} market</p>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">Ranked</span>
                  </div>

                  {result.alternatives && result.alternatives.length > 0 ? (
                    <div className="space-y-2.5">
                      {result.alternatives.map((alt: any, i: number) => {
                        const scoreDiff = alt.estimatedScore - result.healthScore;
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
                        Top clean choices in this category will be listed here.
                      </p>
                    </div>
                  )}
                </div>

                {/* 4. LEGAL / EDUCATIONAL DISCLAIMER */}
                <footer className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
                  <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
                    <span className="font-semibold text-slate-300">Disclaimer:</span> This application and its nutritional scores are for educational and informational purposes only. It is not intended as medical, dietary, or healthcare advice. Always consult with a qualified nutritionist or medical professional before making significant dietary changes.
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
