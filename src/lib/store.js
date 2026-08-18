import { idbDelete, idbGet, idbGetFrom, idbPut } from './idb';

export const IDB_KEY_ID = 'test-crypto-key';
export const IDB_META_ID = 'test-crypto-key-meta';
export const SESSION_KEY = 'origin-b-test-data';
export const SESSION_CIPHER_KEY = 'origin-b-ciphertext';
export const POPUP_PARAM = 'popup';

export function isPopupMode() {
  return new URLSearchParams(window.location.search).get(POPUP_PARAM) === '1';
}

export function popupUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set(POPUP_PARAM, '1');
  return url.toString();
}

// ---------------------------------------------------------------- base64 ---

function toB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromB64(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

// ------------------------------------------------------- storage access ---

export async function requestStorageAccess() {
  if (!document.requestStorageAccess) {
    return { ok: false, error: 'Storage Access API niedostępne' };
  }
  try {
    const hadBefore = document.hasStorageAccess
      ? await document.hasStorageAccess()
      : null;
    try {
      await document.requestStorageAccess({ all: true });
    } catch (e) {
      await document.requestStorageAccess();
    }
    const hasAfter = document.hasStorageAccess
      ? await document.hasStorageAccess()
      : null;
    return { ok: true, hadBefore, hasAfter };
  } catch (e) {
    return { ok: false, error: `${e.name}: ${e.message}` };
  }
}

export async function storageDiagnostics() {
  const out = {
    origin: window.location.origin,
    isTopLevel: window.top === window.self,
    hasOpener: Boolean(window.opener),
    storageAccessApi: Boolean(document.requestStorageAccess),
  };
  try {
    out.hasStorageAccess = document.hasStorageAccess
      ? await document.hasStorageAccess()
      : null;
  } catch (e) {
    out.hasStorageAccess = `${e.name}: ${e.message}`;
  }
  try {
    out.storageEstimate =
      navigator.storage && navigator.storage.estimate
        ? await navigator.storage.estimate()
        : null;
  } catch (e) {
    out.storageEstimate = `${e.name}: ${e.message}`;
  }
  return out;
}

// ------------------------------------------------------------ crypto key ---

// AES-GCM, non-extractable: the popup can never read the raw bytes, so the only
// way to prove it really has the key is to decrypt with it.
export async function createAndStoreCryptoKey() {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['encrypt', 'decrypt']
  );

  const meta = {
    createdAt: new Date().toISOString(),
    createdIn: isPopupMode() ? 'popup' : 'iframe',
    algorithm: 'AES-GCM 256',
    id: crypto.randomUUID(),
  };

  await idbPut(IDB_KEY_ID, key);
  await idbPut(IDB_META_ID, meta);
  return meta;
}

function describeKey(key, meta, scope) {
  return {
    scope,
    meta: meta || null,
    type: key.type,
    extractable: key.extractable,
    algorithm: key.algorithm,
    usages: key.usages,
    // The key may have been cloned out of another realm, where `instanceof
    // CryptoKey` against our realm would lie.
    constructorName: key.constructor ? key.constructor.name : null,
  };
}

export async function readCryptoKey() {
  const key = await idbGet(IDB_KEY_ID);
  const meta = await idbGet(IDB_META_ID);
  return key ? describeKey(key, meta, 'own') : null;
}

// Reach the opener's IDBFactory directly: `window.opener.indexedDB` resolves
// against the opener's environment settings object, i.e. the iframe's
// (possibly partitioned) storage bucket rather than the popup's top-level one.
export async function readCryptoKeyFromOpener() {
  const factory = window.opener.indexedDB;
  const key = await idbGetFrom(factory, IDB_KEY_ID);
  const meta = await idbGetFrom(factory, IDB_META_ID);
  return key ? describeKey(key, meta, 'opener') : null;
}

// ------------------------------------------------------- encrypt/decrypt ---

export const PLAINTEXT = 'Tajny tekst z iframe origin B';

export async function encryptToSession(plaintext = PLAINTEXT) {
  const key = await idbGet(IDB_KEY_ID);
  if (!key) throw new Error('Brak klucza w IndexedDB — najpierw go utwórz');

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );

  const record = {
    iv: toB64(iv),
    ciphertext: toB64(cipher),
    encryptedAt: new Date().toISOString(),
    length: plaintext.length,
  };
  sessionStorage.setItem(SESSION_CIPHER_KEY, JSON.stringify(record));
  return record;
}

export function readOwnCipherRecord() {
  const raw = sessionStorage.getItem(SESSION_CIPHER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function readOpenerCipherRecord() {
  const raw = window.opener.sessionStorage.getItem(SESSION_CIPHER_KEY);
  return raw ? JSON.parse(raw) : null;
}

// The interesting knob: `subtle` picks WHICH realm's WebCrypto does the work,
// `key` picks which realm the CryptoKey object came from. Mixing them is what
// tells us whether a cross-realm key is merely readable or actually usable.
export async function decryptRecord(subtle, key, record) {
  const plain = await subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(record.iv) },
    key,
    fromB64(record.ciphertext)
  );
  return new TextDecoder().decode(plain);
}

export async function decryptOwn(record) {
  const key = await idbGet(IDB_KEY_ID);
  if (!key) throw new Error('Brak klucza we własnym IndexedDB');
  return decryptRecord(crypto.subtle, key, record);
}

// --------------------------------------------------------- session data ---

export function writeSessionData() {
  const data = {
    sessionId: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    savedFrom: window.location.href,
    note: 'Zapisane w iframe (origin B) przed otwarciem popupu',
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  return data;
}

export function readOwnSessionData() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function readOpenerSessionData() {
  if (!window.opener) {
    return { ok: false, error: 'Brak window.opener' };
  }
  try {
    const raw = window.opener.sessionStorage.getItem(SESSION_KEY);
    return { ok: true, value: raw ? JSON.parse(raw) : null };
  } catch (e) {
    return { ok: false, error: `${e.name}: ${e.message}` };
  }
}

// Raw key handles, for the decryption matrix in the popup.
export function getOwnKey() {
  return idbGet(IDB_KEY_ID);
}

export function getOpenerKey() {
  return idbGetFrom(window.opener.indexedDB, IDB_KEY_ID);
}

export function getOwnKeyMeta() {
  return idbGet(IDB_META_ID);
}

export function getOpenerKeyMeta() {
  return idbGetFrom(window.opener.indexedDB, IDB_META_ID);
}

// Wipe this context's own bucket, so a stale first-party key cannot be mistaken
// for a partitioning result.
export async function clearOwnBucket() {
  await idbDelete(IDB_KEY_ID);
  await idbDelete(IDB_META_ID);
}
