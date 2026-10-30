import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { AnalyzeRequest } from '@/shared/api-schema';

import { analyzeLabel, isApiError } from '../api';

jest.mock('../config', () => ({ config: { apiBaseUrl: 'https://api.example.test', appVersion: '1.0.0' } }));
jest.mock('@/security/attestation', () => ({ getAttestationHeaders: async () => ({}) }));

type ProgressHandler = (event: { lengthComputable: boolean; loaded: number; total: number }) => void;

/** Minimal stand-in for React Native's XMLHttpRequest: the test drives progress and aborts. */
class FakeXhr {
  static last: FakeXhr | null = null;
  upload: { onprogress: ProgressHandler | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;
  status = 0;
  responseText = '';
  timeout = 0;

  constructor() {
    FakeXhr.last = this;
  }
  open() {}
  setRequestHeader() {}
  send() {}
  getResponseHeader() {
    return null;
  }
  abort() {
    this.onabort?.();
  }
  progress(fraction: number) {
    this.upload.onprogress?.({ lengthComputable: true, loaded: fraction * 1000, total: 1000 });
  }
}

const BODY = {
  imagesBase64: ['data:image/jpeg;base64,AAAA'],
  userCountry: 'India',
  userTimezone: 'Asia/Kolkata',
} as AnalyzeRequest;

const realXhr = globalThis.XMLHttpRequest;

beforeEach(() => {
  jest.useFakeTimers();
  FakeXhr.last = null;
  globalThis.XMLHttpRequest = FakeXhr as unknown as typeof XMLHttpRequest;
});

afterEach(() => {
  globalThis.XMLHttpRequest = realXhr;
  jest.useRealTimers();
});

/** Starts a call and waits until the request has been sent. */
async function send(opts: Parameters<typeof analyzeLabel>[1] = {}) {
  let outcome: string | null = null;
  analyzeLabel(BODY, opts).then(
    () => (outcome = 'resolved'),
    (error: unknown) => (outcome = isApiError(error) ? error.kind : 'other'),
  );
  await jest.advanceTimersByTimeAsync(0);
  const xhr = FakeXhr.last;
  if (!xhr) throw new Error('request was not sent');
  return { xhr, outcome: () => outcome };
}

describe('analyzeLabel timeouts', () => {
  it('gives the server 60 s when the upload reports nothing', async () => {
    const call = await send();
    await jest.advanceTimersByTimeAsync(59_999);
    expect(call.outcome()).toBeNull();
    await jest.advanceTimersByTimeAsync(1);
    expect(call.outcome()).toBe('timeout');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not count a slow upload against the server deadline', async () => {
    const call = await send();
    // An 80 s upload on a slow uplink, reporting every 10 s.
    for (let i = 1; i <= 8; i++) {
      await jest.advanceTimersByTimeAsync(10_000);
      call.xhr.progress(i / 8);
    }
    expect(call.outcome()).toBeNull();
    await jest.advanceTimersByTimeAsync(59_999);
    expect(call.outcome()).toBeNull();
    await jest.advanceTimersByTimeAsync(1);
    expect(call.outcome()).toBe('timeout');
  });

  it('starts the server deadline when progress stops before completion', async () => {
    const call = await send();
    await jest.advanceTimersByTimeAsync(20_000);
    call.xhr.progress(0.4);
    await jest.advanceTimersByTimeAsync(59_999);
    expect(call.outcome()).toBeNull();
    await jest.advanceTimersByTimeAsync(1);
    expect(call.outcome()).toBe('timeout');
  });

  it('caps the whole call at 150 s however the upload trickles', async () => {
    const call = await send();
    for (let elapsed = 5_000; elapsed < 150_000; elapsed += 5_000) {
      await jest.advanceTimersByTimeAsync(5_000);
      call.xhr.progress(Math.min(0.99, elapsed / 200_000));
    }
    await jest.advanceTimersByTimeAsync(4_999);
    expect(call.outcome()).toBeNull();
    await jest.advanceTimersByTimeAsync(1);
    expect(call.outcome()).toBe('timeout');
  });

  it('reports upload progress and a caller cancel', async () => {
    const onUploadProgress = jest.fn();
    const controller = new AbortController();
    const call = await send({ signal: controller.signal, onUploadProgress });
    call.xhr.progress(0.5);
    expect(onUploadProgress).toHaveBeenCalledWith(0.5);
    controller.abort();
    await jest.advanceTimersByTimeAsync(0);
    expect(call.outcome()).toBe('cancelled');
    expect(jest.getTimerCount()).toBe(0);
  });
});
