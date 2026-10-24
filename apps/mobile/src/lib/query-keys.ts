import type { HistoryFilter } from './history';

/** TanStack Query keys shared across screens (invalidate `historyKeys.all` after any write). */
export const historyKeys = {
  all: ['history'] as const,
  list: (filter: HistoryFilter) => ['history', 'list', filter] as const,
  detail: (id: string) => ['history', 'detail', id] as const,
  count: () => ['history', 'count'] as const,
};

export const searchKeys = {
  all: ['search'] as const,
  results: (market: string, category: string, query: string) =>
    ['search', market, category, query.trim().toLowerCase()] as const,
};
