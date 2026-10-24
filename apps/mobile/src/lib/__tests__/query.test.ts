import { describe, expect, it, jest } from '@jest/globals';
import { onlineManager } from '@tanstack/react-query';
import { getNetworkStateAsync, type NetworkState } from 'expo-network';

import { ApiError } from '../api';
import { recheckOnline, shouldRetryQuery } from '../query';

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  addNetworkStateListener: () => ({ remove: () => undefined }),
}));

const recheckWith = (state: NetworkState) => {
  jest.mocked(getNetworkStateAsync).mockResolvedValueOnce(state);
  return recheckOnline();
};

describe('shouldRetryQuery', () => {
  it('retries a connection failure once', () => {
    expect(shouldRetryQuery(0, new ApiError('network'))).toBe(true);
    expect(shouldRetryQuery(1, new ApiError('network'))).toBe(false);
  });

  it('never retries a timeout or gateway error, which may still be billing the paid search', () => {
    expect(shouldRetryQuery(0, new ApiError('timeout'))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError('timeout', { status: 408 }))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError('server', { status: 504 }))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError('server', { status: 502 }))).toBe(false);
  });

  it('never retries errors that fail the same way every time', () => {
    const kinds = ['upgrade_required', 'not_configured', 'too_large', 'bad_request', 'invalid_response', 'rate_limited', 'cancelled'] as const;
    for (const kind of kinds) expect(shouldRetryQuery(0, new ApiError(kind))).toBe(false);
    expect(shouldRetryQuery(0, new Error('sqlite'))).toBe(false);
  });
});

describe('online state', () => {
  it('stays online when Android has not validated the network', async () => {
    await recheckWith({ isConnected: true, isInternetReachable: false });
    expect(onlineManager.isOnline()).toBe(true);
  });

  it('goes offline only when the device reports no connection', async () => {
    await recheckWith({ isConnected: false, isInternetReachable: false });
    expect(onlineManager.isOnline()).toBe(false);
    await recheckWith({});
    expect(onlineManager.isOnline()).toBe(true);
  });
});
