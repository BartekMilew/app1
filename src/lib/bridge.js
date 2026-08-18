// postMessage bridge popup <-> opener (the iframe).
//
// Rationale: with partitioned storage (Safari ITP, Firefox TCP) the iframe's
// IndexedDB lives in the (top=A, origin=B) bucket, while the popup is a
// top-level B window and therefore reads the (top=B, origin=B) bucket. The
// popup cannot reach the iframe's data itself — but the iframe still can, so we
// ask the iframe to read it and post the result back.

export const REQUEST_TYPE = 'origin-b:request-storage';
export const RESPONSE_TYPE = 'origin-b:storage-response';

// A CryptoKey is structured-cloneable but non-extractable keys cannot cross an
// agent cluster boundary reliably, so we ship a serialisable description.
export function requestFromOpener(timeoutMs = 3000) {
  return new Promise((resolve) => {
    if (!window.opener) {
      resolve({ ok: false, error: 'Brak window.opener' });
      return;
    }
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      resolve({ ok: false, error: `Brak odpowiedzi od openera (${timeoutMs} ms)` });
    }, timeoutMs);

    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      channel.port1.close();
      const data = event.data;
      if (data && data.type === RESPONSE_TYPE) {
        resolve({ ok: true, value: data.payload });
      } else {
        resolve({ ok: false, error: 'Nieznana odpowiedź od openera' });
      }
    };

    try {
      window.opener.postMessage({ type: REQUEST_TYPE }, window.location.origin, [
        channel.port2,
      ]);
    } catch (e) {
      clearTimeout(timer);
      resolve({ ok: false, error: `${e.name}: ${e.message}` });
    }
  });
}

export function serveBridge(readPayload) {
  const onMessage = async (event) => {
    if (event.origin !== window.location.origin) return;
    if (!event.data || event.data.type !== REQUEST_TYPE) return;
    const port = event.ports && event.ports[0];
    if (!port) return;
    let payload;
    try {
      payload = { ok: true, ...(await readPayload()) };
    } catch (e) {
      payload = { ok: false, error: `${e.name}: ${e.message}` };
    }
    port.postMessage({ type: RESPONSE_TYPE, payload });
    port.close();
  };

  window.addEventListener('message', onMessage);
  return () => window.removeEventListener('message', onMessage);
}
