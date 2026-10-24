import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { AnalysisResult } from '@/shared/api-schema';

/* In-memory stand-ins for expo-sqlite, expo-file-system and expo-image. */

type MockRow = {
  id: string;
  created_at: number;
  product_name: string;
  brand: string;
  score: number;
  verdict: string;
  market: string;
  barcode: string | null;
  thumb_uri: string | null;
  result_json: string;
};

const mockDb = {
  userVersion: 0,
  rows: [] as MockRow[],
  exec: [] as string[],
  failInsert: false,
};

/** Files that exist, by URI; `documentRoot` is the app container (it moves on iOS updates). */
const mockFs = { documentRoot: 'file:///container-a/Documents', files: new Set<string>() };

const mockImage = {
  clearDiskCache: jest.fn(async () => true),
  clearMemoryCache: jest.fn(async () => true),
};

let mockUuid = 0;

jest.mock('expo-crypto', () => ({ randomUUID: () => `uuid-${++mockUuid}` }));
jest.mock('expo-image', () => ({ Image: mockImage }));
jest.mock('../log', () => ({ log: { info: () => {}, warn: () => {}, error: () => {} } }));

type MockPart = string | { uri: string };

jest.mock('expo-file-system', () => {
  const join = (parts: MockPart[]) =>
    parts.map((p) => (typeof p === 'string' ? p : p.uri).replace(/\/+$/, '')).join('/');
  class Directory {
    uri: string;
    constructor(...parts: MockPart[]) {
      this.uri = join(parts);
    }
    get exists() {
      return [...mockFs.files].some((f) => f.startsWith(`${this.uri}/`));
    }
    create() {}
    delete() {
      for (const f of [...mockFs.files]) if (f.startsWith(`${this.uri}/`)) mockFs.files.delete(f);
    }
  }
  class File {
    uri: string;
    constructor(...parts: MockPart[]) {
      this.uri = join(parts);
    }
    get exists() {
      return mockFs.files.has(this.uri);
    }
    delete() {
      if (!mockFs.files.delete(this.uri)) throw new Error('missing');
    }
    async move(dest: File) {
      if (!mockFs.files.delete(this.uri)) throw new Error('missing');
      mockFs.files.add(dest.uri);
      this.uri = dest.uri;
    }
  }
  return {
    Directory,
    File,
    Paths: {
      get document() {
        return new Directory(mockFs.documentRoot);
      },
    },
  };
});

jest.mock('expo-sqlite', () => {
  const byNewest = () => [...mockDb.rows].sort((a, b) => b.created_at - a.created_at);
  return {
    openDatabaseSync: () => ({
      execSync: (sql: string) => {
        mockDb.exec.push(sql);
        const version = /user_version = (\d+)/.exec(sql);
        if (version) mockDb.userVersion = Number(version[1]);
      },
      getFirstSync: () => ({ user_version: mockDb.userVersion }),
      withTransactionSync: (task: () => void) => task(),
      getAllSync: () => mockDb.rows.filter((r) => r.thumb_uri?.includes('/')),
      runSync: (_sql: string, name: string | null, id: string) => {
        const row = mockDb.rows.find((r) => r.id === id);
        if (row) row.thumb_uri = name;
      },
      execAsync: async (sql: string) => {
        mockDb.exec.push(sql);
      },
      runAsync: async (sql: string, ...params: unknown[]) => {
        if (sql.startsWith('INSERT')) {
          if (mockDb.failInsert) throw new Error('SQLITE_FULL');
          const [id, created_at, product_name, brand, score, verdict, market, barcode, thumb_uri, result_json] =
            params as [string, number, string, string, number, string, string, string | null, string | null, string];
          mockDb.rows.push({
            id,
            created_at,
            product_name,
            brand,
            score,
            verdict,
            market,
            barcode,
            thumb_uri,
            result_json,
          });
        } else if (sql === 'DELETE FROM scans') {
          mockDb.rows = [];
        } else if (sql.startsWith('DELETE FROM scans WHERE id')) {
          mockDb.rows = mockDb.rows.filter((r) => r.id !== params[0]);
        }
        return { changes: 1, lastInsertRowId: 0 };
      },
      getAllAsync: async (sql: string) => (sql.includes('OFFSET') ? [] : byNewest()),
      getFirstAsync: async (_sql: string, id: string) => mockDb.rows.find((r) => r.id === id) ?? null,
    }),
  };
});

const result = {
  productName: 'Tomato Ketchup',
  brandName: 'TastyCo',
  healthScore: 38,
  verdict: 'AVOID',
} as AnalysisResult;

function legacyRow(id: string, thumb: string | null): MockRow {
  return {
    id,
    created_at: Date.now(),
    product_name: 'Old',
    brand: '',
    score: 50,
    verdict: 'AVOID',
    market: 'India',
    barcode: null,
    thumb_uri: thumb,
    result_json: '{}',
  };
}

let history: typeof import('../history');

beforeEach(() => {
  jest.resetModules();
  mockDb.userVersion = 0;
  mockDb.rows = [];
  mockDb.exec = [];
  mockDb.failInsert = false;
  mockFs.documentRoot = 'file:///container-a/Documents';
  mockFs.files.clear();
  mockImage.clearDiskCache.mockClear();
  mockImage.clearMemoryCache.mockClear();
  mockUuid = 0;
  // A fresh module per test: it caches the open database.
  history = jest.requireActual<typeof import('../history')>('../history');
});

describe('history database', () => {
  it('turns on secure_delete for every connection', async () => {
    await history.countScans();
    expect(mockDb.exec.some((sql) => /PRAGMA secure_delete = ON/.test(sql))).toBe(true);
  });

  it('migrates v1 absolute thumbnail URIs to file names, once', async () => {
    mockDb.userVersion = 1;
    mockDb.rows = [
      legacyRow('a', 'file:///container-old/Documents/thumbs/a.jpg'),
      legacyRow('b', null),
      legacyRow('c', 'c.jpg'),
    ];
    await history.listScans('all');
    expect(mockDb.userVersion).toBe(2);
    expect(mockDb.rows.map((r) => r.thumb_uri)).toEqual(['a.jpg', null, 'c.jpg']);
    // Disk-cache copies written by the old cachePolicy are dropped.
    expect(mockImage.clearDiskCache).toHaveBeenCalledTimes(1);
  });

  it('does not purge image caches on a fresh install', async () => {
    await history.countScans();
    expect(mockDb.userVersion).toBe(2);
    expect(mockImage.clearDiskCache).not.toHaveBeenCalled();
  });
});

describe('thumbnails', () => {
  it('stores only the file name and resolves it against the current container', async () => {
    mockFs.files.add('file:///cache/ImageManipulator/t.jpg');
    const id = await history.saveScan({ result, market: 'India', thumbSourceUri: 'file:///cache/ImageManipulator/t.jpg' });

    expect(mockDb.rows[0].thumb_uri).toBe(`${id}.jpg`);
    expect(mockFs.files.has(`file:///container-a/Documents/thumbs/${id}.jpg`)).toBe(true);

    // iOS moves the data container on app updates: reads and deletes must follow it.
    mockFs.documentRoot = 'file:///container-b/Documents';
    mockFs.files = new Set([`file:///container-b/Documents/thumbs/${id}.jpg`]);
    const [summary] = await history.listScans('all');
    expect(summary.thumbUri).toBe(`file:///container-b/Documents/thumbs/${id}.jpg`);

    await history.deleteScan(id);
    expect(mockFs.files.size).toBe(0);
  });

  it('deletes a legacy absolute-URI thumbnail at its current location', async () => {
    mockDb.userVersion = 2;
    mockDb.rows = [legacyRow('a', 'file:///container-old/Documents/thumbs/a.jpg')];
    mockFs.files.add('file:///container-a/Documents/thumbs/a.jpg');
    await history.deleteScan('a');
    expect(mockFs.files.size).toBe(0);
  });

  it('removes the moved thumbnail when the insert fails', async () => {
    mockFs.files.add('file:///cache/ImageManipulator/t.jpg');
    mockDb.failInsert = true;
    await expect(
      history.saveScan({ result, market: 'India', thumbSourceUri: 'file:///cache/ImageManipulator/t.jpg' }),
    ).rejects.toThrow('SQLITE_FULL');
    expect([...mockFs.files].filter((f) => f.includes('/thumbs/'))).toEqual([]);
  });
});

describe('clearHistory', () => {
  it('deletes rows and thumbnails, compacts the database and clears the image caches', async () => {
    mockFs.files.add('file:///cache/ImageManipulator/t.jpg');
    await history.saveScan({ result, market: 'India', thumbSourceUri: 'file:///cache/ImageManipulator/t.jpg' });

    await history.clearHistory();

    expect(mockDb.rows).toEqual([]);
    expect(mockFs.files.size).toBe(0);
    const compact = mockDb.exec.find((sql) => sql.includes('VACUUM')) ?? '';
    expect(compact).toMatch(/wal_checkpoint\(TRUNCATE\).*VACUUM.*wal_checkpoint\(TRUNCATE\)/);
    expect(mockImage.clearDiskCache).toHaveBeenCalled();
    expect(mockImage.clearMemoryCache).toHaveBeenCalled();
  });
});
