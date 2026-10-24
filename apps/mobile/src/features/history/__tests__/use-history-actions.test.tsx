import { describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { ScanSummary } from '@/lib/history';
import { historyKeys } from '@/lib/query-keys';

import { useHistoryActions } from '../use-history-actions';

jest.mock('@/lib/history', () => ({
  deleteScan: jest.fn(async () => {}),
  clearHistory: jest.fn(async () => {}),
}));
jest.mock('@/lib/haptics', () => ({ haptic: () => {} }));
jest.mock('@/lib/log', () => ({ log: { info: () => {}, warn: () => {}, error: () => {} } }));
jest.mock('@/state/settings', () => ({ useSettings: () => ({ lang: 'en' }) }));
jest.mock('expo-router', () => ({ useFocusEffect: () => {} }));

const scan = (id: string): ScanSummary => ({
  id,
  createdAt: 0,
  productName: id,
  brand: '',
  score: 50,
  verdict: 'AVOID',
  thumbUri: null,
});

describe('useHistoryActions.deleteNow', () => {
  it('cannot be undone by a history read that was already in flight', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const a = scan('a');
    const b = scan('b');
    const key = historyKeys.list('all');
    client.setQueryData(key, [a, b]);

    // A refetch (e.g. from tab focus) that read the rows before the delete.
    let finishStaleRead: (rows: ScanSummary[]) => void = () => {};
    client
      .fetchQuery({
        queryKey: key,
        queryFn: () => new Promise<ScanSummary[]>((resolve) => (finishStaleRead = resolve)),
        staleTime: 0,
      })
      .catch(() => {});

    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }
    const { result, unmount } = await renderHook(() => useHistoryActions(), { wrapper: Wrapper });

    await act(() => result.current.deleteNow(a));
    await act(async () => finishStaleRead([a, b]));

    expect(client.getQueryData(key)).toEqual([b]);
    await unmount();
    client.clear();
  });
});
