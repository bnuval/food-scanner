import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockStore = new Map<string, string>();
const mockSecureStore = {
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  getItemAsync: jest.fn(async (key: string, _options?: object) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string, _options?: object) => {
    mockStore.set(key, value);
  }),
};

jest.mock('expo-secure-store', () => mockSecureStore);
jest.mock('expo-crypto', () => ({ randomUUID: () => 'fresh-id' }));

let getInstallId: typeof import('../install-id').getInstallId;

beforeEach(() => {
  jest.resetModules();
  mockStore.clear();
  mockSecureStore.getItemAsync.mockClear();
  mockSecureStore.setItemAsync.mockClear();
  // A fresh module per test: it caches the id in memory.
  ({ getInstallId } = jest.requireActual<typeof import('../install-id')>('../install-id'));
});

describe('getInstallId', () => {
  it('creates the id as a this-device-only keychain item and reads it back the same way', async () => {
    await expect(getInstallId()).resolves.toBe('fresh-id');
    const options = { keychainAccessible: mockSecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
    expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('install_id', options);
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('install_id', 'fresh-id', options);
  });

  it('reuses a stored id', async () => {
    mockStore.set('install_id', 'stored-id');
    await expect(getInstallId()).resolves.toBe('stored-id');
    expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
