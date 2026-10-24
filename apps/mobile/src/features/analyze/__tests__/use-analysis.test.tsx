import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { ApiError, analyzeLabel } from '@/lib/api';
import { saveScan } from '@/lib/history';
import type { AnalysisResult } from '@/shared/api-schema';
import type { SessionPhoto } from '@/state/scan-session';

import { useAnalysis } from '../use-analysis';

jest.mock('@/lib/api', () => ({
  ...jest.requireActual<typeof import('@/lib/api')>('@/lib/api'),
  analyzeLabel: jest.fn(),
}));
jest.mock('@/lib/history', () => ({ saveScan: jest.fn() }));
jest.mock('@/lib/images', () => ({
  makeThumbnail: jest.fn(async () => ({ uri: 'file:///cache/thumb.jpg', width: 320, height: 320 })),
  deleteFiles: jest.fn(),
  toJpegDataUrl: jest.fn(async () => 'data:image/jpeg;base64,AAAA'),
}));
jest.mock('@/lib/query', () => ({ queryClient: { invalidateQueries: jest.fn(async () => {}) } }));
jest.mock('@/lib/haptics', () => ({ haptic: () => {} }));
jest.mock('@/lib/log', () => ({ log: { info: () => {}, warn: () => {}, error: () => {} } }));
jest.mock('@/state/settings', () => ({
  useSettings: () => ({ effectiveMarket: 'India', timeZone: 'Asia/Kolkata' }),
}));

const analyze = jest.mocked(analyzeLabel);
const save = jest.mocked(saveScan);

const RESULT = {
  isReadable: true,
  productName: 'Rolled oats',
  brandName: 'Acme',
  healthScore: 82,
  verdict: 'BUY',
  primaryReason: '',
  primaryReasonHindi: '',
} as unknown as AnalysisResult;

const PHOTOS = [{ id: 'p1', uri: 'file:///cache/p1.jpg', width: 1600, height: 1200 }] as unknown as SessionPhoto[];

function setup() {
  const onSaved = jest.fn();
  const onSavedAfterLeave = jest.fn();
  const onCancelled = jest.fn();
  const hook = renderHook(() =>
    useAnalysis({ photos: PHOTOS, barcode: null, onSaved, onSavedAfterLeave, onCancelled }),
  );
  return { hook, onSaved, onSavedAfterLeave, onCancelled };
}

beforeEach(() => {
  analyze.mockReset();
  save.mockReset();
});

describe('useAnalysis', () => {
  it('saves a readable result and opens it', async () => {
    analyze.mockResolvedValue(RESULT);
    save.mockResolvedValue('scan-1');
    const { hook, onSaved } = setup();
    const { result, unmount } = await hook;

    expect(result.current.phase.status).toBe('idle');
    await act(() => result.current.start());

    expect(onSaved).toHaveBeenCalledWith('scan-1', RESULT);
    await unmount();
  });

  it('retries only the local save when storing the result fails', async () => {
    analyze.mockResolvedValue(RESULT);
    save.mockRejectedValueOnce(new Error('SQLITE_FULL')).mockResolvedValueOnce('scan-2');
    const { hook, onSaved } = setup();
    const { result, unmount } = await hook;

    await act(() => result.current.start());
    expect(result.current.phase.status).toBe('save_error');
    expect(onSaved).not.toHaveBeenCalled();

    await act(async () => result.current.retrySave());
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('scan-2', RESULT));
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(2);
    await unmount();
  });

  it('keeps saving once the response has arrived, even if the screen is left', async () => {
    analyze.mockResolvedValue(RESULT);
    let finishSave: (id: string) => void = () => {};
    save.mockImplementation(() => new Promise<string>((resolve) => (finishSave = resolve)));
    const { hook, onSaved, onSavedAfterLeave } = setup();
    const { result, unmount } = await hook;

    let run: Promise<void> = Promise.resolve();
    await act(async () => {
      run = result.current.start();
    });
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(result.current.phase.status).toBe('finishing');

    result.current.cancel();
    await unmount();
    finishSave('scan-3');
    await run;

    expect(onSaved).not.toHaveBeenCalled();
    expect(onSavedAfterLeave).toHaveBeenCalledTimes(1);
  });

  it('cancels before the response without saving anything', async () => {
    analyze.mockImplementation(
      (_body, opts) =>
        new Promise<AnalysisResult>((_resolve, reject) =>
          opts?.signal?.addEventListener('abort', () => reject(new ApiError('cancelled'))),
        ),
    );
    const { hook, onCancelled } = setup();
    const { result, unmount } = await hook;

    let run: Promise<void> = Promise.resolve();
    await act(async () => {
      run = result.current.start();
    });
    await waitFor(() => expect(analyze).toHaveBeenCalled());
    await act(async () => {
      result.current.cancel();
      await run;
    });

    expect(save).not.toHaveBeenCalled();
    expect(onCancelled).not.toHaveBeenCalled();
    await unmount();
  });
});
