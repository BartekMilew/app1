import React from 'react';

export default function Json({ value }) {
  if (value === null || value === undefined) {
    return <pre className="json empty">brak danych</pre>;
  }
  return <pre className="json">{JSON.stringify(value, null, 2)}</pre>;
}
