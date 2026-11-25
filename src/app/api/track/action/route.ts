import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import { getClientIp, ipBucket, readJsonBody } from "../../_lib/http";
import { MARKETS } from "../../_lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2 * 1024;
const MAX_ACTIONS = 500;

type ActionInput = {
  type?: unknown;
  market?: unknown;
  product?: unknown;
  category?: unknown;
  status?: unknown;
  failureReason?: unknown;
};

function maskedIpNetwork(req: NextRequest): string {
  const ip = getClientIp(req);
  if (!ip || !isIP(ip)) return "Unavailable";
  const mappedIpv4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip)?.[1];
  const address = mappedIpv4 || ip;
  if (isIP(address) === 4) return `${address.split(".").slice(0, 3).join(".")}.0/24`;
  return ipBucket(address);
}

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody(req, MAX_BODY_BYTES);
    if ("failure" in body || !body.data || typeof body.data !== "object") {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const input = body.data as ActionInput;
    if (
      (input.type !== "scan" && input.type !== "search") ||
      typeof input.market !== "string" ||
      !(MARKETS as readonly string[]).includes(input.market) ||
      (input.status !== "success" && input.status !== "failure") ||
      typeof input.category !== "string" ||
      (input.status === "failure" && !normalizeText(input.failureReason, 240))
    ) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const apiKey =
      process.env.JSONBIN_API_KEY?.trim() ||
      process.env["X-Master-Key"]?.trim();
    const binId = process.env.JSONBIN_BIN_ID?.trim();
    if (!apiKey || !binId) {
      console.error("[track-action] JSONBIN_API_KEY or JSONBIN_BIN_ID is not set");
      return NextResponse.json({ success: false }, { status: 503 });
    }

    const url = `https://api.jsonbin.io/v3/b/${encodeURIComponent(binId)}`;
    const getRes = await fetch(`${url}/latest`, {
      headers: { "X-Master-Key": apiKey },
      cache: "no-store",
    });
    if (!getRes.ok) throw new Error(`JSONBin get failed: ${getRes.status}`);

    const json = await getRes.json();
    const data =
      json.record && typeof json.record === "object" && !Array.isArray(json.record)
        ? json.record as Record<string, unknown>
        : {};
    const recentActions = Array.isArray(data.recentActions) ? data.recentActions : [];
    recentActions.push({
      timestamp: new Date().toISOString(),
      market: input.market,
      ip: maskedIpNetwork(req),
      type: input.type,
      product: normalizeText(input.product, 100),
      category: normalizeText(input.category, 60) || "Unknown",
      status: input.status,
      failureReason: input.status === "failure" ? normalizeText(input.failureReason, 240) : "",
    });
    data.recentActions = recentActions.slice(-MAX_ACTIONS);

    const putRes = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": apiKey,
      },
      body: JSON.stringify(data),
      cache: "no-store",
    });
    if (!putRes.ok) throw new Error(`JSONBin put failed: ${putRes.status}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[track-action] error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
