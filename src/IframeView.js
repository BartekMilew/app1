import React, { useEffect, useState } from 'react';
import Json from './components/Json';
import { serveBridge } from './lib/bridge';
import {
  createAndStoreCryptoKey,
  popupUrl,
  readCryptoKey,
  readOwnSessionData,
  requestStorageAccess,
  storageDiagnostics,
  writeSessionData,
} from './lib/store';

export default function IframeView() {
  const [keyMeta, setKeyMeta] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [error, setError] = useState(null);
  const [log, setLog] = useState([]);
  const [diag, setDiag] = useState(null);

  const append = (msg) =>
    setLog((l) => [...l, `${new Date().toLocaleTimeString()} — ${msg}`]);

  useEffect(() => {
    setSessionData(readOwnSessionData());
    storageDiagnostics().then(setDiag);
  }, []);

  // Serve the popup's postMessage requests: the iframe reads its own
  // (possibly partitioned) storage and ships the result to the popup.
  useEffect(
    () =>
      serveBridge(async () => ({
        idb: await readCryptoKey(),
        session: readOwnSessionData(),
        servedBy: window.location.href,
      })),
    []
  );

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

  async function prepare() {
    setError(null);
    try {
      const meta = await createAndStoreCryptoKey();
      setKeyMeta(meta);
      append('CryptoKey zapisany w IndexedDB');
      const data = writeSessionData();
      setSessionData(data);
      append('Dane testowe zapisane w sessionStorage');
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
    const win = window.open(
      url,
      'origin-b-popup',
      'popup=yes,width=560,height=760'
    );
    if (!win) {
      setError('Popup zablokowany przez przeglądarkę');
      append('window.open zwrócił null (popup blocked)');
    } else {
      append(`Popup otwarty: ${url}`);
    }
  }

  const embedded = window.top !== window.self;

  return (
    <div className="page iframe">
      <header>
        <h1>Origin B — iframe</h1>
        <p className="sub">
          {embedded ? 'Osadzony w iframe' : 'Uwaga: to okno NIE jest w iframie'}{' '}
          · origin: <code>{window.location.origin}</code>
        </p>
      </header>

      <section>
        <button className="primary" onClick={prepareAndOpen}>
          Zapisz dane i otwórz popup
        </button>
        <button onClick={prepare}>Tylko zapisz dane</button>
        <button onClick={askStorageAccess}>
          Storage Access + zapisz ponownie
        </button>
      </section>

      {error && <div className="error">{error}</div>}

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
