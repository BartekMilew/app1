const DB_NAME = 'origin-b-db';
const DB_VERSION = 1;
const STORE = 'keys';

// `factory` lets a caller reach into another window's IDBFactory — notably
// window.opener.indexedDB from the popup, which resolves against the opener's
// storage bucket instead of our own (see readCryptoKeyFromOpener).
function openDb(factory) {
  return new Promise((resolve, reject) => {
    const req = factory.open(DB_NAME, DB_VERSION);
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

function tx(factory, mode, fn) {
  return openDb(factory).then(
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
  return tx(indexedDB, 'readwrite', (store) => store.put(value, key));
}

export function idbGet(key) {
  return tx(indexedDB, 'readonly', (store) => store.get(key));
}

export function idbGetFrom(factory, key) {
  return tx(factory, 'readonly', (store) => store.get(key));
}

export function idbDelete(key) {
  return tx(indexedDB, 'readwrite', (store) => store.delete(key));
}
