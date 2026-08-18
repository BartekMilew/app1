import React, { useEffect, useState } from 'react';
import Json from './components/Json';
import { serveBridge } from './lib/bridge';
import {
  PLAINTEXT,
  createAndStoreCryptoKey,
  decryptOwn,
  encryptToSession,
  popupUrl,
  readCryptoKey,
  readOwnCipherRecord,
  readOwnSessionData,
  requestStorageAccess,
  storageDiagnostics,
  writeSessionData,
} from './lib/store';

export default function IframeView() {
  const [keyMeta, setKeyMeta] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [cipher, setCipher] = useState(null);
  const [error, setError] = useState(null);
  const [log, setLog] = useState([]);
  const [diag, setDiag] = useState(null);

  const append = (msg) =>
    setLog((l) => [...l, `${new Date().toLocaleTimeString()} — ${msg}`]);

  useEffect(() => {
    setSessionData(readOwnSessionData());
    setCipher(readOwnCipherRecord());
    storageDiagnostics().then(setDiag);
  }, []);

  // Serve the popup's requests: the iframe touches its own (possibly
  // partitioned) storage and its own WebCrypto, then ships back a plain result.
  useEffect(
    () =>
      serveBridge(async (action, payload) => {
        if (action === 'decrypt') {
          return { plaintext: await decryptOwn(payload), decryptedBy: 'iframe' };
        }
        return {
          idb: await readCryptoKey(),
          session: readOwnSessionData(),
          cipher: readOwnCipherRecord(),
          servedBy: window.location.href,
        };
      }),
    []
  );

  async function prepare() {
    setError(null);
    try {
      const meta = await createAndStoreCryptoKey();
      setKeyMeta(meta);
      append('CryptoKey (AES-GCM) zapisany w IndexedDB');

      const data = writeSessionData();
      setSessionData(data);
      append('Dane testowe zapisane w sessionStorage');

      const record = await encryptToSession(PLAINTEXT);
      setCipher(record);
      append('Tekst zaszyfrowany, szyfrogram w sessionStorage');
      return true;
    } catch (e) {
      setError(`${e.name}: ${e.message}`);
      append(`Błąd: ${e.message}`);
      return false;
    }
  }

  async function prepareAndOpen() {
    const ok = await prepare();
    if (!ok) return;
    const url = popupUrl();
    const win = window.open(url, 'origin-b-popup', 'popup=yes,width=560,height=860');
    if (!win) {
      setError('Popup zablokowany przez przeglądarkę');
      append('window.open zwrócił null (popup blocked)');
    } else {
      append(`Popup otwarty: ${url}`);
    }
  }

  async function askStorageAccess() {
    const res = await requestStorageAccess();
    append(
      res.ok
        ? `Storage Access: przed=${res.hadBefore} po=${res.hasAfter}`
        : `Storage Access odrzucony — ${res.error}`
    );
    storageDiagnostics().then(setDiag);
    if (res.ok) await prepare();
  }

  const embedded = window.top !== window.self;

  return (
    <div className="page iframe">
      <header>
        <h1>Origin B — iframe</h1>
        <p className="sub">
          {embedded ? 'Osadzony w iframe' : 'Uwaga: to okno NIE jest w iframie'} ·
          origin: <code>{window.location.origin}</code>
        </p>
      </header>

      <section>
        <button className="primary" onClick={prepareAndOpen}>
          Zaszyfruj i otwórz popup
        </button>
        <button onClick={prepare}>Tylko zapisz i zaszyfruj</button>
        <button onClick={askStorageAccess}>Storage Access + zapisz ponownie</button>
      </section>

      {error && <div className="error">{error}</div>}

      <section>
        <h2>Jawny tekst</h2>
        <pre className="json">{PLAINTEXT}</pre>
      </section>

      <section>
        <h2>Szyfrogram (sessionStorage)</h2>
        <Json value={cipher} />
      </section>

      <section>
        <h2>CryptoKey (IndexedDB)</h2>
        <Json value={keyMeta} />
      </section>

      <section>
        <h2>sessionStorage</h2>
        <Json value={sessionData} />
      </section>

      <section>
        <h2>Diagnostyka</h2>
        <Json value={diag} />
      </section>

      <section>
        <h2>Log</h2>
        <pre className="json">{log.join('\n') || 'brak zdarzeń'}</pre>
      </section>
    </div>
  );
}
