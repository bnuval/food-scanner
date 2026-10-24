import { fmt, type Lang } from '@/i18n';

import type { ResultStrings } from './strings';

/** Share sheets and chat apps cope badly with very long messages. */
const SHARE_MAX_CHARS = 500;

/** AI text in the chosen language, falling back to the other one when it is empty. */
export function pickText(en: string, hi: string, lang: Lang): string {
  return lang === 'hi' ? hi || en : en || hi;
}

/** "Brand Product", skipping empty parts. */
export function productLabel(brand: string, productName: string): string {
  return [brand, productName].filter((part) => part.length > 0).join(' ');
}

/** Localized scan date + time ("24 Oct 2026, 3:15 pm" / "24 अक्टू॰ 2026, 3:15 pm"). */
export function formatScanDate(timestamp: number, lang: Lang): string {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** "{brand} {product}: {score}/100 — {verdict}. {reason}\n— PureBite", capped at ~500 chars. */
export function buildShareMessage(
  t: ResultStrings,
  input: { name: string; score: number; verdict: string; reason: string; appName: string },
): string {
  const head = fmt(t.shareHead, { name: input.name, score: input.score, verdict: input.verdict });
  const footer = `\n— ${input.appName}`;
  let reason = input.reason.replace(/\s+/g, ' ').trim();
  const budget = SHARE_MAX_CHARS - head.length - t.shareSeparator.length - footer.length;
  if (reason.length > budget) reason = budget > 1 ? `${reason.slice(0, budget - 1).trimEnd()}…` : '';
  return `${head}${reason ? `${t.shareSeparator}${reason}` : ''}${footer}`;
}

/** mailto: link for "Report a problem": product name and scan date only, never images or results. */
export function buildReportMailto(
  t: ResultStrings,
  input: { email: string; product: string; createdAt: number },
): string {
  const date = new Date(input.createdAt);
  const body = fmt(t.reportBody, {
    product: input.product,
    date: Number.isFinite(date.getTime()) ? date.toISOString() : '',
  });
  return `mailto:${input.email}?subject=${encodeURIComponent(t.reportSubject)}&body=${encodeURIComponent(body)}`;
}
