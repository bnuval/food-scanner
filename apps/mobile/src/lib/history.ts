import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { AnalysisResultSchema, type AnalysisResult } from '@/shared/api-schema';
import { isMarket, type Market } from '@/shared/market';

import { log } from './log';

/**
 * Scan history lives only on this device: product results plus a small thumbnail.
 * Full-size photos are never kept.
 */

const DB_NAME = 'purebite.db';
/** 1: initial schema. 2: `thumb_uri` holds a file name inside thumbs/, not an absolute URI. */
const DB_VERSION = 2;
const MAX_ROWS = 500;

export type HistoryFilter = 'all' | 'buy' | 'avoid';

export type ScanSummary = {
  id: string;
  createdAt: number;
  productName: string;
  brand: string;
  score: number;
  verdict: 'BUY' | 'AVOID';
  /** Absolute file:// URI of the thumbnail, resolved at read time. */
  thumbUri: string | null;
};

export type ScanRecord = ScanSummary & {
  market: Market;
  barcode: string | null;
  result: AnalysisResult;
};

type Row = {
  id: string;
  created_at: number;
  product_name: string;
  brand: string;
  score: number;
  verdict: string;
  market: string;
  barcode: string | null;
  /** File name inside thumbs/ (an absolute file:// URI in rows written before DB v2). */
  thumb_uri: string | null;
  result_json: string;
};

let db: SQLiteDatabase | null = null;

function getDb(): SQLiteDatabase {
  if (db) return db;
  const opened = openDatabaseSync(DB_NAME);
  // secure_delete (per connection) zeroes deleted rows instead of leaving them in free pages.
  opened.execSync('PRAGMA journal_mode = WAL; PRAGMA secure_delete = ON;');
  const version = opened.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
  if (version < DB_VERSION) {
    opened.withTransactionSync(() => {
      if (version < 1) {
        opened.execSync(`
          CREATE TABLE IF NOT EXISTS scans (
            id TEXT PRIMARY KEY NOT NULL,
            created_at INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            brand TEXT NOT NULL,
            score INTEGER NOT NULL,
            verdict TEXT NOT NULL,
            market TEXT NOT NULL,
            barcode TEXT,
            thumb_uri TEXT,
            result_json TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_scans_created ON scans (created_at DESC);
        `);
      }
      if (version < 2) {
        const legacy = opened.getAllSync<Pick<Row, 'id' | 'thumb_uri'>>(
          "SELECT id, thumb_uri FROM scans WHERE thumb_uri LIKE '%/%'",
        );
        for (const row of legacy) {
          opened.runSync('UPDATE scans SET thumb_uri = ? WHERE id = ?', thumbFileName(row.thumb_uri), row.id);
        }
      }
      opened.execSync(`PRAGMA user_version = ${DB_VERSION}`);
    });
    // Builds before v2 let expo-image keep history thumbnails in its disk cache; drop those copies once.
    if (version >= 1) Image.clearDiskCache().catch((error: unknown) => log.warn('Could not clear image cache', error));
  }
  db = opened;
  return opened;
}

/**
 * Durable thumbnail folder. Resolved on every use and never stored: the absolute path of the
 * app's data container can change (iOS app updates and restores).
 */
function thumbsDir(): Directory {
  return new Directory(Paths.document, 'thumbs');
}

/** File name of a stored thumbnail; for legacy absolute URIs, only the last path segment is used. */
function thumbFileName(stored: string | null): string | null {
  if (!stored) return null;
  const name = stored.slice(stored.lastIndexOf('/') + 1);
  return name === '' || name === '.' || name === '..' ? null : name;
}

function thumbFile(stored: string | null, dir: Directory = thumbsDir()): File | null {
  const name = thumbFileName(stored);
  return name ? new File(dir, name) : null;
}

function toSummary(row: Row, dir: Directory): ScanSummary {
  return {
    id: row.id,
    createdAt: row.created_at,
    productName: row.product_name,
    brand: row.brand,
    score: row.score,
    verdict: row.verdict === 'BUY' ? 'BUY' : 'AVOID',
    thumbUri: thumbFile(row.thumb_uri, dir)?.uri ?? null,
  };
}

function deleteThumb(stored: string | null) {
  try {
    const file = thumbFile(stored);
    if (file?.exists) file.delete();
  } catch (error) {
    log.warn('Could not delete thumbnail', error);
  }
}

/** expo-image may still hold decoded thumbnails in memory (and on disk, from builds before DB v2). */
async function clearImageCaches(): Promise<void> {
  try {
    await Promise.all([Image.clearMemoryCache(), Image.clearDiskCache()]);
  } catch (error) {
    log.warn('Could not clear image caches', error);
  }
}

export async function saveScan(input: {
  result: AnalysisResult;
  market: Market;
  barcode?: string | null;
  /** Temporary thumbnail JPEG to move into durable storage. */
  thumbSourceUri?: string | null;
}): Promise<string> {
  const id = randomUUID();
  // Open (and migrate) first, so a database that can't open never strands a moved thumbnail.
  const database = getDb();
  const thumbName = `${id}.jpg`;
  let thumb: File | null = null;
  if (input.thumbSourceUri) {
    try {
      const dir = thumbsDir();
      if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
      const dest = new File(dir, thumbName);
      await new File(input.thumbSourceUri).move(dest);
      thumb = dest;
    } catch (error) {
      log.warn('Could not store thumbnail', error);
    }
  }
  const { result } = input;
  try {
    await database.runAsync(
      `INSERT INTO scans (id, created_at, product_name, brand, score, verdict, market, barcode, thumb_uri, result_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      Date.now(),
      result.productName,
      result.brandName,
      result.healthScore,
      result.verdict,
      input.market,
      input.barcode ?? null,
      thumb ? thumbName : null,
      JSON.stringify(result),
    );
  } catch (error) {
    // No row references the moved thumbnail, so nothing would ever delete it.
    if (thumb) deleteThumb(thumbName);
    throw error;
  }
  try {
    await pruneOldest(database);
  } catch (error) {
    // The scan itself is saved; the next save prunes again.
    log.warn('Could not prune history', error);
  }
  return id;
}

async function pruneOldest(database: SQLiteDatabase) {
  const stale = await database.getAllAsync<Pick<Row, 'id' | 'thumb_uri'>>(
    'SELECT id, thumb_uri FROM scans ORDER BY created_at DESC LIMIT -1 OFFSET ?',
    MAX_ROWS,
  );
  for (const row of stale) {
    await database.runAsync('DELETE FROM scans WHERE id = ?', row.id);
    deleteThumb(row.thumb_uri);
  }
}

export async function listScans(filter: HistoryFilter): Promise<ScanSummary[]> {
  const where = filter === 'all' ? '' : 'WHERE verdict = ?';
  const params = filter === 'all' ? [] : [filter === 'buy' ? 'BUY' : 'AVOID'];
  const rows = await getDb().getAllAsync<Row>(
    `SELECT id, created_at, product_name, brand, score, verdict, market, barcode, thumb_uri, result_json
     FROM scans ${where} ORDER BY created_at DESC`,
    params,
  );
  const dir = thumbsDir();
  return rows.map((row) => toSummary(row, dir));
}

export async function getScan(id: string): Promise<ScanRecord | null> {
  const row = await getDb().getFirstAsync<Row>('SELECT * FROM scans WHERE id = ?', id);
  if (!row) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(row.result_json);
  } catch {
    return null;
  }
  const parsed = AnalysisResultSchema.safeParse(raw);
  if (!parsed.success) return null;
  return {
    ...toSummary(row, thumbsDir()),
    market: isMarket(row.market) ? row.market : 'India',
    barcode: row.barcode,
    result: parsed.data,
  };
}

export async function deleteScan(id: string): Promise<void> {
  const database = getDb();
  const row = await database.getFirstAsync<Pick<Row, 'thumb_uri'>>('SELECT thumb_uri FROM scans WHERE id = ?', id);
  await database.runAsync('DELETE FROM scans WHERE id = ?', id);
  deleteThumb(row?.thumb_uri ?? null);
}

export async function clearHistory(): Promise<void> {
  const database = getDb();
  await database.runAsync('DELETE FROM scans');
  try {
    // Rows deleted before secure_delete was on can survive in free pages and in old WAL
    // frames: empty the WAL, rewrite the file, then fold that rewrite back in and empty it again.
    await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE); VACUUM; PRAGMA wal_checkpoint(TRUNCATE);');
  } catch (error) {
    log.warn('Could not compact history database', error);
  }
  try {
    const dir = thumbsDir();
    if (dir.exists) dir.delete();
  } catch (error) {
    log.warn('Could not clear thumbnails', error);
  }
  await clearImageCaches();
}

export async function countScans(): Promise<number> {
  const row = await getDb().getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM scans');
  return row?.n ?? 0;
}
