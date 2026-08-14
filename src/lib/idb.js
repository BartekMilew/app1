const DB_NAME = 'origin-b-db';
const DB_VERSION = 1;
const STORE = 'keys';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      })
  );
}

export function idbPut(key, value) {
  return tx('readwrite', (store) => store.put(value, key));
}

export function idbGet(key) {
  return tx('readonly', (store) => store.get(key));
}

export function idbKeys() {
  return tx('readonly', (store) => store.getAllKeys());
}
