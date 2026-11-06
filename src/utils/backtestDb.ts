// Client-side IndexedDB Cache for Long-Term Historical Backtesting Candles
const DB_NAME = 'CryptoBacktestDB';
const DB_VERSION = 1;
const STORE_NAME = 'historical_klines';

interface CacheRecord {
  key: string; // `${symbol}_${interval}`
  symbol: string;
  interval: string;
  candles: any[];
  minTime: number;
  maxTime: number;
  lastUpdated: number;
  count: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject(event.target.error);
    };
  });
}

export async function getCachedKlines(
  symbol: string,
  interval: string
): Promise<CacheRecord | null> {
  try {
    const db = await openDB();
    const key = `${symbol.toUpperCase()}_${interval.toLowerCase()}`;
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('Failed to read from IndexedDB:', err);
    return null;
  }
}

export async function saveCachedKlines(
  symbol: string,
  interval: string,
  candles: any[]
): Promise<void> {
  if (!candles || candles.length === 0) return;
  try {
    const db = await openDB();
    const key = `${symbol.toUpperCase()}_${interval.toLowerCase()}`;

    // Deduplicate and sort by time
    const sorted = [...candles].sort((a, b) => {
      const ta = typeof a.time === 'number' ? a.time : new Date(a.time).getTime();
      const tb = typeof b.time === 'number' ? b.time : new Date(b.time).getTime();
      return ta - tb;
    });

    // Remove duplicates
    const unique: any[] = [];
    const seen = new Set<any>();
    for (const c of sorted) {
      const id = c.timestamp || c.time;
      if (!seen.has(id)) {
        seen.add(id);
        unique.push(c);
      }
    }

    const first = unique[0];
    const last = unique[unique.length - 1];
    const minTime = first.timestamp || (typeof first.time === 'number' ? first.time * 1000 : new Date(first.time).getTime());
    const maxTime = last.timestamp || (typeof last.time === 'number' ? last.time * 1000 : new Date(last.time).getTime());

    const record: CacheRecord = {
      key,
      symbol: symbol.toUpperCase(),
      interval: interval.toLowerCase(),
      candles: unique,
      minTime,
      maxTime,
      lastUpdated: Date.now(),
      count: unique.length,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = (e: any) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('Failed to save to IndexedDB:', err);
  }
}

export async function clearBacktestCache(): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Failed to clear IndexedDB:', err);
    return false;
  }
}

export async function getBacktestCacheStats(): Promise<{ count: number; keys: string[] }> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        const keys = (request.result as string[]) || [];
        resolve({ count: keys.length, keys });
      };
      request.onerror = () => {
        resolve({ count: 0, keys: [] });
      };
    });
  } catch {
    return { count: 0, keys: [] };
  }
}
