import React, { useCallback, useEffect, useState } from 'react';
import Json from './components/Json';
import { requestFromOpener } from './lib/bridge';
import {
  readCryptoKeyFromOpener,
  readOpenerSessionData,
  readOwnSessionData,
  storageDiagnostics,
} from './lib/store';

export default function PopupView() {
  const [idbResult, setIdbResult] = useState({ status: 'pending' });
  const [openerResult, setOpenerResult] = useState({ status: 'pending' });
  const [bridgeResult, setBridgeResult] = useState({ status: 'pending' });
  const [ownSession, setOwnSession] = useState(null);
  const [diag, setDiag] = useState(null);

  const run = useCallback(async () => {
    setIdbResult({ status: 'pending' });
    try {
      const info = await readCryptoKeyFromOpener();
      setIdbResult(
        info
          ? { status: 'ok', value: info }
          : {
              status: 'empty',
              error: 'Brak klucza w opener.indexedDB (baza otwarta, ale pusta)',
            }
      );
    } catch (e) {
      setIdbResult({ status: 'error', error: `${e.name}: ${e.message}` });
    }

    const opener = readOpenerSessionData();
    if (!opener.ok) {
      setOpenerResult({ status: 'error', error: opener.error });
    } else if (opener.value === null) {
      setOpenerResult({ status: 'empty', error: 'opener.sessionStorage pusty' });
    } else {
      setOpenerResult({ status: 'ok', value: opener.value });
    }

    setBridgeResult({ status: 'pending' });
    const bridge = await requestFromOpener();
    if (!bridge.ok) {
      setBridgeResult({ status: 'error', error: bridge.error });
    } else if (bridge.value && bridge.value.ok === false) {
      setBridgeResult({ status: 'error', error: bridge.value.error });
    } else {
      setBridgeResult({ status: 'ok', value: bridge.value });
    }

    setOwnSession(readOwnSessionData());
    setDiag(await storageDiagnostics());
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  return (
    <div className="page popup">
      <header>
        <h1>Origin B — popup</h1>
        <p className="sub">
          parametr <code>?popup=1</code> wykryty · opener:{' '}
          <code>{window.opener ? 'dostępny' : 'brak'}</code>
        </p>
      </header>

      <section>
        <button className="primary" onClick={run}>
          Odczytaj ponownie
        </button>
      </section>

      <Result title="window.opener.indexedDB — CryptoKey zapisany przez iframe" result={idbResult} />
      <Result
        title="window.opener.sessionStorage — dane z iframe"
        result={openerResult}
      />

      <Result
        title="postMessage do openera — iframe czyta swój storage za nas"
        result={bridgeResult}
      />

      <section>
        <h2>Własny sessionStorage popupu</h2>
        <Json value={ownSession} />
      </section>

      <section>
        <h2>Diagnostyka</h2>
        <Json value={diag} />
      </section>
    </div>
  );
}

function Result({ title, result }) {
  return (
    <section>
      <h2>
        {title} <span className={`badge ${result.status}`}>{result.status}</span>
      </h2>
      {result.status === 'ok' ? (
        <Json value={result.value} />
      ) : result.status === 'pending' ? (
        <pre className="json empty">ładowanie…</pre>
      ) : (
        <div className="error">{result.error}</div>
      )}
    </section>
  );
}
