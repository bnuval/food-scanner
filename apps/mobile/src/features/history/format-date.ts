import { fmt, type Lang } from '@/i18n';

type Kind = 'time' | 'date' | 'dateWithYear';

const OPTIONS: Record<Kind, Intl.DateTimeFormatOptions> = {
  time: { hour: 'numeric', minute: '2-digit' },
  date: { day: 'numeric', month: 'short' },
  dateWithYear: { day: 'numeric', month: 'short', year: 'numeric' },
};

/** Formatters are costly to build and every history row needs one, so cache per locale. */
const cache = new Map<string, Intl.DateTimeFormat | null>();

function formatWith(locale: string, kind: Kind, date: Date): string | null {
  const key = `${locale}|${kind}`;
  let formatter = cache.get(key);
  if (formatter === undefined) {
    try {
      formatter = new Intl.DateTimeFormat(locale, OPTIONS[kind]);
    } catch {
      formatter = null;
    }
    cache.set(key, formatter);
  }
  if (!formatter) return null;
  try {
    return formatter.format(date);
  } catch {
    return null;
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Whole calendar days between two instants in local time (DST-safe). */
function calendarDaysBetween(earlier: Date, later: Date): number {
  const a = new Date(earlier.getFullYear(), earlier.getMonth(), earlier.getDate()).getTime();
  const b = new Date(later.getFullYear(), later.getMonth(), later.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * "Today, 10:32 am" / "Yesterday, 6:05 pm" / "12 Oct" / "3 Mar 2025", in the app language.
 * `now` can be any instant of the current day (e.g. useCalendarDay()); only its date is used.
 */
export function formatScanDate(
  timestamp: number,
  lang: Lang,
  labels: { today: string; yesterday: string },
  now: number = Date.now(),
): string {
  const locale = lang === 'hi' ? 'hi-IN' : 'en-IN';
  const date = new Date(timestamp);
  const today = new Date(now);
  const days = calendarDaysBetween(date, today);

  if (days === 0 || days === 1) {
    const time = formatWith(locale, 'time', date) ?? `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    return fmt(days === 0 ? labels.today : labels.yesterday, { time });
  }

  const sameYear = date.getFullYear() === today.getFullYear();
  return (
    formatWith(locale, sameYear ? 'date' : 'dateWithYear', date) ??
    `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
  );
}
