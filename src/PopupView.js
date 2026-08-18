import React, { useCallback, useEffect, useState } from 'react';
import Json from './components/Json';
import { requestFromOpener } from './lib/bridge';
import {
  clearOwnBucket,
  decryptRecord,
  getOpenerKey,
  getOpenerKeyMeta,
  getOwnKey,
  getOwnKeyMeta,
  readCryptoKeyFromOpener,
  readOpenerCipherRecord,
  readOpenerSessionData,
  readOwnSessionData,
  storageDiagnostics,
} from './lib/store';

const PENDING = { status: 'pending' };

export default function PopupView() {
  const [idbResult, setIdbResult] = useState(PENDING);
  const [openerResult, setOpenerResult] = useState(PENDING);
  const [cipherResult, setCipherResult] = useState(PENDING);
  const [attempts, setAttempts] = useState([]);
  const [ownSession, setOwnSession] = useState(null);
  const [diag, setDiag] = useState(null);

  const run = useCallback(async () => {
    setIdbResult(PENDING);
    setAttempts([]);

    // 1. Can we even SEE the key object?
    try {
      const info = await readCryptoKeyFromOpener();
      setIdbResult(
        info
          ? { status: 'ok', value: info }
          : { status: 'empty', error: 'Brak klucza w opener.indexedDB' }
      );
    } catch (e) {
      setIdbResult({ status: 'error', error: `${e.name}: ${e.message}` });
    }

    // 2. sessionStorage of the opener.
    const opener = readOpenerSessionData();
    if (!opener.ok) setOpenerResult({ status: 'error', error: opener.error });
    else if (opener.value === null)
      setOpenerResult({ status: 'empty', error: 'opener.sessionStorage pusty' });
    else setOpenerResult({ status: 'ok', value: opener.value });

    // 3. The ciphertext the iframe produced.
    let record = null;
    try {
      record = readOpenerCipherRecord();
      setCipherResult(
        record
          ? { status: 'ok', value: record }
          : { status: 'empty', error: 'Brak szyfrogramu w opener.sessionStorage' }
      );
    } catch (e) {
      setCipherResult({ status: 'error', error: `${e.name}: ${e.message}` });
    }

    setOwnSession(readOwnSessionData());
    setDiag(await storageDiagnostics());

    if (!record) return;

    // 4. The actual question: can we USE the key, and whose WebCrypto does it?
    const openerSubtle = window.opener && window.opener.crypto.subtle;
    const matrix = [
      {
        name: 'klucz z opener.indexedDB + crypto.subtle POPUPU',
        run: async () => decryptRecord(crypto.subtle, await getOpenerKey(), record),
      },
      {
        name: 'klucz z opener.indexedDB + crypto.subtle OPENERA',
        run: async () => decryptRecord(openerSubtle, await getOpenerKey(), record),
      },
      {
        name: 'klucz z własnego indexedDB + crypto.subtle popupu',
        run: async () => {
          const key = await getOwnKey();
          if (!key) throw new Error('Brak klucza we własnym buckecie');
          // A key IS here — but is it the same one? AES-GCM would only report a
          // bare OperationError, which reads like a plumbing fault rather than
          // what it is: a different key, i.e. proof of a separate bucket.
          const ownMeta = await getOwnKeyMeta();
          let openerMeta = null;
          try {
            openerMeta = await getOpenerKeyMeta();
          } catch (e) {
            // opener bucket unreachable; fall through with what we have
          }
          try {
            return await decryptRecord(crypto.subtle, key, record);
          } catch (e) {
            if (e.name === 'OperationError') {
              throw new Error(
                `OperationError — inny klucz niż szyfrujący (tag GCM nie pasuje).
` +
                  `mój bucket:    id=${ownMeta && ownMeta.id} utworzony w=${
                    ownMeta && ownMeta.createdIn
                  } ${ownMeta && ownMeta.createdAt}
` +
                  `bucket iframe: id=${openerMeta && openerMeta.id} utworzony w=${
                    openerMeta && openerMeta.createdIn
                  } ${openerMeta && openerMeta.createdAt}`
              );
            }
            throw e;
          }
        },
      },
      {
        name: 'postMessage — deszyfruje iframe u siebie',
        run: async () => {
          const res = await requestFromOpener('decrypt', record);
          if (!res.ok) throw new Error(res.error);
          if (res.value && res.value.ok === false) throw new Error(res.value.error);
          return res.value.plaintext;
        },
      },
    ];

    for (const attempt of matrix) {
      let outcome;
      try {
        outcome = { status: 'ok', value: await attempt.run() };
      } catch (e) {
        outcome = { status: 'error', error: `${e.name}: ${e.message}` };
      }
      setAttempts((prev) => [...prev, { name: attempt.name, ...outcome }]);
    }
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
        <button
          onClick={async () => {
            await clearOwnBucket();
            run();
          }}
        >
          Wyczyść mój bucket
        </button>
      </section>

      <section>
        <h2>Deszyfrowanie — cztery drogi</h2>
        {attempts.length === 0 ? (
          <pre className="json empty">czekam na szyfrogram…</pre>
        ) : (
          attempts.map((a) => (
            <div key={a.name} className="attempt">
              <div className="attempt-head">
                <span className={`badge ${a.status}`}>{a.status}</span> {a.name}
              </div>
              <pre className={`json ${a.status === 'ok' ? 'plain' : 'empty'}`}>
                {a.status === 'ok' ? a.value : a.error}
              </pre>
            </div>
          ))
        )}
      </section>

      <Result title="Szyfrogram z opener.sessionStorage" result={cipherResult} />
      <Result
        title="window.opener.indexedDB — CryptoKey zapisany przez iframe"
        result={idbResult}
      />
      <Result title="window.opener.sessionStorage — dane z iframe" result={openerResult} />

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
