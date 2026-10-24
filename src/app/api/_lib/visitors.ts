import { createHmac } from "crypto";

// The `ip` field name is kept because the admin page renders it (and shows "127.0.0.1" when it
// is empty), but it only ever holds one of these: never an address.
const ANONYMOUS = "anon";
const REDACTED = "redacted";
const STORED_ID_RE = /^(anon-[0-9a-f]{12}|anon|redacted)$/;

/**
 * Anonymous visitor id for the analytics log: a keyed hash of the address and the UTC day, so
 * repeat visits group within a day but the address can't be recovered or linked across days.
 * Just "anon" when IP_HASH_SECRET is not set, in which case nothing about the address is stored.
 */
export function dailyVisitorId(ip: string | null, day: string): string {
  const secret = process.env.IP_HASH_SECRET?.trim();
  if (!secret || !ip) return ANONYMOUS;
  return `anon-${createHmac("sha256", secret).update(`${day}|${ip}`).digest("hex").slice(0, 12)}`;
}

/** Replaces any raw address left in a stored visitor entry by older versions of /api/track. */
export function scrubVisitor<T extends { ip?: unknown }>(entry: T): T {
  if (!entry || typeof entry !== "object") return entry;
  if (typeof entry.ip === "string" && STORED_ID_RE.test(entry.ip)) return entry;
  return { ...entry, ip: REDACTED };
}
