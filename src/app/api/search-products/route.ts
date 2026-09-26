import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Helper: Strip duplicate brand prefixes and special characters
function cleanSearchQuery(brand: string, productName: string): string {
  let title = productName.trim();
  const b = brand.trim();
  
  // If product name already starts with brand name, do not repeat it
  if (title.toLowerCase().startsWith(b.toLowerCase())) {
    title = title.slice(b.length).trim();
  }
  
  // Remove punctuation that breaks retail search engines
  const combined = `${b} ${title}`.replace(/[,&+]/g, " ").replace(/\s+/g, " ").trim();
  return encodeURIComponent(combined);
}

async function getAvailableModels(): Promise<string[]> {
  try {
    const list = await ai.models.list();
    const candidateModels: string[] = [];

    for await (const m of list) {
      const name = m.name?.replace(/^models\//, "") || "";
      const supportsGenerate = m.supportedActions?.includes("generateContent") ?? true;
      if (supportsGenerate && (name.includes("flash") || name.includes("pro"))) {
        candidateModels.push(name);
      }
    }

    candidateModels.sort((a, b) => {
      const aIsFlash = a.includes("flash") ? 1 : 0;
      const bIsFlash = b.includes("flash") ? 1 : 0;
      return bIsFlash - aIsFlash;
    });

    if (candidateModels.length > 0) return candidateModels;
  } catch (err) {
    console.warn("Fallback to priority list.");
  }

  return ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-2.5-pro"];
}

export async function POST(req: NextRequest) {
  try {
    const { query, categoryType, userCountry } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const detectedCountry = userCountry || "India";
    const isIndia = detectedCountry.toLowerCase() === "india";

    const promptText = `You are a clinical nutritionist and clean-label cosmetic chemist.
User Query: "${query}"
Category: "${categoryType || "food"}"
User Market Country: "${detectedCountry}"

YOUR TASK:
Find 3 to 4 specific, commercially real, popular, and VERIFIED HEALTHY/CLEAN-LABEL products sold in ${detectedCountry} matching this query.

CRITERIA:
1. Provide the brand name in "brand" (e.g., "Juicy Chemistry").
2. In "productName", provide ONLY the clean product title without repeating the brand name (e.g., "Kakadu Plum Matcha & Blood Orange Face Wash").
3. healthScore must strictly be between 75 and 98 based on clean ingredients.
4. Every product returned MUST have healthScore >= 75. Do NOT return mediocre or unhealthy items.`;

    const config = {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          products: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                brand: { type: Type.STRING },
                productName: { type: Type.STRING },
                healthScore: { type: Type.INTEGER },
                verdictReason: { type: Type.STRING },
                keyIngredients: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                highlights: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["brand", "productName", "healthScore", "verdictReason"],
            },
          },
        },
        required: ["products"],
      },
    };

    const modelsToTry = await getAvailableModels();
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          config,
        });

        const result = JSON.parse(response.text || "{}");

        if (result.products && Array.isArray(result.products)) {
          result.products = result.products.map((item: any) => {
            const cleanQuery = cleanSearchQuery(item.brand, item.productName);

            const stores = [];
            if (isIndia) {
              // Direct retailer in-app search URLs (works natively on both mobile web and mobile apps)
              stores.push({
                name: "Amazon",
                url: `https://www.amazon.in/s?k=${cleanQuery}`,
                badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20",
              });
              stores.push({
                name: "Flipkart",
                url: `https://www.flipkart.com/search?q=${cleanQuery}`,
                badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/30 hover:bg-sky-500/20",
              });
              if (categoryType === "cosmetics") {
                stores.push({
                  name: "Nykaa",
                  url: `https://www.nykaa.com/search/result/?q=${cleanQuery}`,
                  badgeColor: "bg-pink-500/10 text-pink-400 border-pink-500/30 hover:bg-pink-500/20",
                });
              } else {
                stores.push({
                  name: "Blinkit",
                  url: `https://blinkit.com/s/?q=${cleanQuery}`,
                  badgeColor: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20",
                });
              }
            } else if (detectedCountry.toLowerCase().includes("united states")) {
              stores.push({
                name: "Amazon",
                url: `https://www.amazon.com/s?k=${cleanQuery}`,
                badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20",
              });
              stores.push({
                name: "Walmart",
                url: `https://www.walmart.com/search?q=${cleanQuery}`,
                badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20",
              });
              if (categoryType === "cosmetics") {
                stores.push({
                  name: "Sephora",
                  url: `https://www.sephora.com/search?keyword=${cleanQuery}`,
                  badgeColor: "bg-pink-500/10 text-pink-400 border-pink-500/30 hover:bg-pink-500/20",
                });
              } else {
                stores.push({
                  name: "Target",
                  url: `https://www.target.com/s?searchTerm=${cleanQuery}`,
                  badgeColor: "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20",
                });
              }
            } else {
              stores.push({
                name: "Amazon",
                url: `https://www.amazon.com/s?k=${cleanQuery}`,
                badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20",
              });
            }

            return {
              ...item,
              stores,
            };
          });
        }

        return NextResponse.json(result);
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code;
        if (status === 503 || status === 429) {
          await delay(1200);
        }
        continue;
      }
    }

    throw lastError;
  } catch (error: any) {
    console.error("Search API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to search clean products." },
      { status: 500 }
    );
  }
}
