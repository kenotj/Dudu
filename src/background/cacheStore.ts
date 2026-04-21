import { openDB, type IDBPDatabase } from 'idb';
import { CACHE_DB_NAME, CACHE_MAX_ENTRIES, CACHE_STORE, CACHE_TTL_MS } from '@/shared/constants';

interface CacheRow {
  key: string;
  text: string;
  createdAt: number;
  usedAt: number;
  hits: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(CACHE_DB_NAME, 1, {
      upgrade(db) {
        const store = db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
        store.createIndex('usedAt', 'usedAt');
      },
    });
  }
  return dbPromise;
}

export async function cacheGet(key: string): Promise<string | undefined> {
  const db = await getDb();
  const row = (await db.get(CACHE_STORE, key)) as CacheRow | undefined;
  if (!row) return undefined;
  if (Date.now() - row.createdAt > CACHE_TTL_MS) {
    await db.delete(CACHE_STORE, key);
    return undefined;
  }
  row.usedAt = Date.now();
  row.hits += 1;
  await db.put(CACHE_STORE, row);
  return row.text;
}

export async function cachePut(key: string, text: string): Promise<void> {
  const db = await getDb();
  const row: CacheRow = { key, text, createdAt: Date.now(), usedAt: Date.now(), hits: 1 };
  await db.put(CACHE_STORE, row);
  const count = await db.count(CACHE_STORE);
  if (count > CACHE_MAX_ENTRIES) {
    const toEvict = count - CACHE_MAX_ENTRIES;
    const tx = db.transaction(CACHE_STORE, 'readwrite');
    const idx = tx.store.index('usedAt');
    let cursor = await idx.openCursor();
    let removed = 0;
    while (cursor && removed < toEvict) {
      await cursor.delete();
      removed += 1;
      cursor = await cursor.continue();
    }
    await tx.done;
  }
}

export async function cacheStats(): Promise<{ entries: number }> {
  const db = await getDb();
  return { entries: await db.count(CACHE_STORE) };
}
