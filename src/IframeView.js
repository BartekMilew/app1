import React, { useEffect, useState } from 'react';
import Json from './components/Json';
import {
  createAndStoreCryptoKey,
  popupUrl,
  readOwnSessionData,
  writeSessionData,
} from './lib/store';

export default function IframeView() {
  const [keyMeta, setKeyMeta] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [error, setError] = useState(null);
  const [log, setLog] = useState([]);

  const append = (msg) =>
    setLog((l) => [...l, `${new Date().toLocaleTimeString()} — ${msg}`]);

  useEffect(() => {
    setSessionData(readOwnSessionData());
  }, []);

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
        <h2>Log</h2>
        <pre className="json">{log.join('\n') || 'brak zdarzeń'}</pre>
      </section>
    </div>
  );
}
