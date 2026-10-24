import { Storage } from 'expo-sqlite/kv-store';
import { useState } from 'react';

import { SEARCH_CATEGORIES, type SearchCategory } from '@/shared/api-schema';

export type RecentSearch = { query: string; category: SearchCategory };

const STORAGE_KEY = 'search.recent.v1';
const MAX_RECENT = 8;
const MAX_QUERY_LENGTH = 100;

const sameSearch = (a: RecentSearch, b: RecentSearch) =>
  a.category === b.category && a.query.toLowerCase() === b.query.toLowerCase();

function isRecentSearch(value: unknown): value is RecentSearch {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.query === 'string' &&
    v.query.trim().length > 0 &&
    v.query.length <= MAX_QUERY_LENGTH &&
    (SEARCH_CATEGORIES as readonly unknown[]).includes(v.category)
  );
}

function readStored(): RecentSearch[] {
  try {
    const raw = Storage.getItemSync(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isRecentSearch)
      .map((s) => ({ query: s.query.trim(), category: s.category }))
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function writeStored(items: RecentSearch[]) {
  try {
    if (items.length === 0) Storage.removeItemSync(STORAGE_KEY);
    else Storage.setItemSync(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Best-effort: the in-memory list still applies for this session.
  }
}

/** Newest first, case-insensitive dedupe per category, capped at MAX_RECENT. */
export function withRecent(items: RecentSearch[], entry: RecentSearch): RecentSearch[] {
  const next = { query: entry.query.trim(), category: entry.category };
  if (next.query.length === 0) return items;
  return [next, ...items.filter((s) => !sameSearch(s, next))].slice(0, MAX_RECENT);
}

/** Recent searches persisted on-device (expo-sqlite kv-store, never synced). */
export function useRecentSearches() {
  const [items, setItems] = useState<RecentSearch[]>(readStored);

  const add = (entry: RecentSearch) => {
    const next = withRecent(items, entry);
    setItems(next);
    writeStored(next);
  };

  /** Clears one category's entries (the ones on screen), or everything. */
  const clear = (category?: SearchCategory) => {
    const next = category ? items.filter((s) => s.category !== category) : [];
    setItems(next);
    writeStored(next);
  };

  return { items, add, clear };
}
