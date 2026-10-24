import { describe, expect, it } from '@jest/globals';

import {
  DONE_SNAPSHOT,
  INITIAL_TIMING,
  holdProgress,
  progressAt,
  withUploadProgress,
  type ProgressSnapshot,
  type ProgressTiming,
} from '../progress-model';

const T0 = 1_000_000;
const timing = (patch: Partial<ProgressTiming>): ProgressTiming => ({ ...INITIAL_TIMING, requestAt: T0, ...patch });

describe('progressAt', () => {
  it('shows a sliver before the request starts', () => {
    expect(progressAt(INITIAL_TIMING, T0)).toEqual({ value: 0.02, stage: 0, slow: false });
  });

  it('fills the upload share from real progress events', () => {
    const p = progressAt(timing({ upload: 0.5, uploadAt: T0 + 500 }), T0 + 600);
    expect(p.stage).toBe(0);
    expect(p.value).toBeCloseTo(0.15, 2);
  });

  it('moves to server stages once the upload completes', () => {
    const p = progressAt(timing({ upload: 1, uploadAt: T0 + 800, uploadDoneAt: T0 + 800 }), T0 + 800 + 5000);
    expect(p.stage).toBe(2);
    expect(p.value).toBeGreaterThan(0.3);
    expect(p.value).toBeLessThan(0.9);
  });

  it('does not freeze when progress events stop before completion (Android)', () => {
    // One early 0 % event, then silence: must not stay on "Uploading 2 %".
    const stalled = timing({ upload: 0, uploadAt: T0 + 50 });
    expect(progressAt(stalled, T0 + 1000).stage).toBe(0);
    const later = progressAt(stalled, T0 + 50 + 3000 + 4000);
    expect(later.stage).toBeGreaterThanOrEqual(2);
    expect(later.value).toBeGreaterThan(0.3);
  });

  it('falls back to time when no progress events arrive at all', () => {
    expect(progressAt(timing({}), T0 + 1500).value).toBeCloseTo(0.15, 2);
    expect(progressAt(timing({}), T0 + 10_000).stage).toBeGreaterThanOrEqual(2);
  });

  it('never passes 90 % before the response and flags slow requests', () => {
    const p = progressAt(timing({ upload: 1, uploadDoneAt: T0, uploadAt: T0 }), T0 + 120_000);
    expect(p.value).toBeLessThanOrEqual(0.9);
    expect(p.stage).toBe(3);
    expect(p.slow).toBe(true);
  });
});

describe('withUploadProgress', () => {
  it('records real progress before the fallback point', () => {
    const next = withUploadProgress(timing({}), 0.5, T0 + 500);
    expect(next).toEqual({ requestAt: T0, upload: 0.5, uploadAt: T0 + 500, uploadDoneAt: null });
    expect(withUploadProgress(next, 0.99, T0 + 900).uploadDoneAt).toBe(T0 + 900);
  });

  it('never lowers the reported fraction', () => {
    const next = withUploadProgress(timing({ upload: 0.6, uploadAt: T0 + 500 }), 0.4, T0 + 700);
    expect(next.upload).toBe(0.6);
  });

  it('latches the fallback when the first upload event arrives after 3 s', () => {
    const quiet = timing({});
    const before = progressAt(quiet, T0 + 3200);
    expect(before.stage).toBe(1);
    expect(before.value).toBeGreaterThanOrEqual(0.3);

    const late = withUploadProgress(quiet, 0.1, T0 + 3200);
    expect(late.uploadDoneAt).toBe(T0 + 3000);
    const after = progressAt(late, T0 + 3250);
    expect(after.stage).toBeGreaterThanOrEqual(before.stage);
    expect(after.value).toBeGreaterThanOrEqual(before.value);
  });

  it('latches the fallback after a stall between events', () => {
    const started = withUploadProgress(timing({}), 0.05, T0 + 100);
    const stalled = progressAt(started, T0 + 100 + 3500);
    const resumed = withUploadProgress(started, 0.1, T0 + 100 + 3500);
    expect(resumed.uploadDoneAt).toBe(T0 + 100 + 3000);
    expect(progressAt(resumed, T0 + 100 + 3600).value).toBeGreaterThanOrEqual(stalled.value);
  });

  it('ignores events once the upload has finished', () => {
    const done = timing({ upload: 1, uploadAt: T0 + 800, uploadDoneAt: T0 + 800 });
    expect(withUploadProgress(done, 0.2, T0 + 900)).toBe(done);
  });

  it('keeps the model monotonic across a late first event', () => {
    let t = timing({});
    const events = new Map([
      [T0 + 3250, 0.1],
      [T0 + 4000, 0.15],
      [T0 + 8000, 0.2],
    ]);
    let prev = progressAt(t, T0);
    for (let now = T0; now <= T0 + 20_000; now += 250) {
      const fraction = events.get(now);
      if (fraction !== undefined) t = withUploadProgress(t, fraction, now);
      const p = progressAt(t, now);
      expect(p.stage).toBeGreaterThanOrEqual(prev.stage);
      expect(p.value).toBeGreaterThanOrEqual(prev.value - 1e-9);
      prev = p;
    }
  });
});

describe('holdProgress', () => {
  const snap = (value: number, stage: number, slow = false): ProgressSnapshot => ({ value, stage, slow });

  it('never moves the bar or the stage backwards', () => {
    expect(holdProgress(snap(0.32, 1), snap(0.03, 0))).toEqual(snap(0.32, 1));
    expect(holdProgress(snap(0.32, 1), snap(0.4, 1))).toEqual(snap(0.4, 1));
    expect(holdProgress(snap(0.5, 2), snap(0.45, 3))).toEqual(snap(0.5, 3));
  });

  it('returns the same snapshot when nothing changes', () => {
    const shown = snap(0.4, 1);
    expect(holdProgress(shown, snap(0.2, 0))).toBe(shown);
  });

  it('follows the slow flag and reaches the done snapshot', () => {
    expect(holdProgress(snap(0.8, 3), snap(0.8, 3, true)).slow).toBe(true);
    expect(holdProgress(snap(0.8, 3, true), DONE_SNAPSHOT)).toEqual(DONE_SNAPSHOT);
  });
});
