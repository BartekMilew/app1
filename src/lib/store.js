import { idbGet, idbPut } from './idb';

export const IDB_KEY_ID = 'test-crypto-key';
export const IDB_META_ID = 'test-crypto-key-meta';
export const SESSION_KEY = 'origin-b-test-data';
export const POPUP_PARAM = 'popup';

export function isPopupMode() {
  return new URLSearchParams(window.location.search).get(POPUP_PARAM) === '1';
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

export async function readCryptoKey() {
  const keyPair = await idbGet(IDB_KEY_ID);
  const meta = await idbGet(IDB_META_ID);
  if (!keyPair) return null;
  return {
    meta: meta || null,
    publicKeyType: keyPair.publicKey && keyPair.publicKey.type,
    privateKeyType: keyPair.privateKey && keyPair.privateKey.type,
    extractable: keyPair.privateKey && keyPair.privateKey.extractable,
    algorithm: keyPair.privateKey && keyPair.privateKey.algorithm,
    usages: keyPair.privateKey && keyPair.privateKey.usages,
    isCryptoKey: keyPair.privateKey instanceof CryptoKey,
  };
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
