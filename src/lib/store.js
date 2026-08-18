import { idbGet, idbGetFrom, idbPut } from './idb';

export const IDB_KEY_ID = 'test-crypto-key';
export const IDB_META_ID = 'test-crypto-key-meta';
export const SESSION_KEY = 'origin-b-test-data';
export const POPUP_PARAM = 'popup';

export function isPopupMode() {
  return new URLSearchParams(window.location.search).get(POPUP_PARAM) === '1';
}

// Storage Access API: asks the browser to hand this third-party frame the
// unpartitioned (first-party) storage bucket for origin B — the same bucket the
// top-level popup will read. Must be called from a user gesture.
export async function requestStorageAccess() {
  if (!document.requestStorageAccess) {
    return { ok: false, error: 'Storage Access API niedostępne' };
  }
  try {
    const hadBefore = document.hasStorageAccess
      ? await document.hasStorageAccess()
      : null;
    // Chrome supports the `{ all: true }` form for non-cookie storage; Safari and
    // Firefox ignore the argument and grant their own flavour of access.
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
    out.storageEstimate = navigator.storage && navigator.storage.estimate
      ? await navigator.storage.estimate()
      : null;
  } catch (e) {
    out.storageEstimate = `${e.name}: ${e.message}`;
  }
  return out;
}

export function popupUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set(POPUP_PARAM, '1');
  return url.toString();
}

// Non-extractable ECDSA key pair — the private key can only ever be read back
// as a CryptoKey object, which is exactly what we want to prove survives the
// iframe -> popup hop within the same (partitioned or not) storage bucket.
export async function createAndStoreCryptoKey() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, // non-extractable
    ['sign', 'verify']
  );

  const meta = {
    createdAt: new Date().toISOString(),
    createdIn: isPopupMode() ? 'popup' : 'iframe',
    algorithm: 'ECDSA P-256',
    id: crypto.randomUUID(),
  };

  await idbPut(IDB_KEY_ID, keyPair);
  await idbPut(IDB_META_ID, meta);
  return meta;
}

function describeKeyPair(keyPair, meta, scope) {
  return {
    scope,
    meta: meta || null,
    publicKeyType: keyPair.publicKey && keyPair.publicKey.type,
    privateKeyType: keyPair.privateKey && keyPair.privateKey.type,
    extractable: keyPair.privateKey && keyPair.privateKey.extractable,
    algorithm: keyPair.privateKey && keyPair.privateKey.algorithm,
    usages: keyPair.privateKey && keyPair.privateKey.usages,
    // The key was cloned out of another window's realm, so `instanceof
    // CryptoKey` against *our* realm would lie. Compare against the realm the
    // object actually came from.
    constructorName:
      keyPair.privateKey && keyPair.privateKey.constructor
        ? keyPair.privateKey.constructor.name
        : null,
  };
}

export async function readCryptoKey() {
  const keyPair = await idbGet(IDB_KEY_ID);
  const meta = await idbGet(IDB_META_ID);
  if (!keyPair) return null;
  return describeKeyPair(keyPair, meta, 'own');
}

// Reach the opener's IDBFactory directly instead of our own. Same origin (B),
// so the property access is allowed; the point is that `window.opener.indexedDB`
// is bound to the opener's environment settings object, i.e. the iframe's
// (possibly partitioned) storage bucket rather than the popup's top-level one.
export async function readCryptoKeyFromOpener() {
  const factory = window.opener.indexedDB;
  const keyPair = await idbGetFrom(factory, IDB_KEY_ID);
  const meta = await idbGetFrom(factory, IDB_META_ID);
  if (!keyPair) return null;
  return describeKeyPair(keyPair, meta, 'opener');
}

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

// Popup -> opener (the iframe) direct DOM access. Same origin (B), so this is
// allowed by the SOP; it fails when the browser partitions/severs the opener
// relationship (noopener, COOP, or Safari-style storage partitioning).
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
