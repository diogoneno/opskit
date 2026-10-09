import type { Row } from './logic';

const sign = { added: '+', removed: '-', same: ' ' } as const;

// All text is rendered as React text nodes, so user input is always escaped.
export function LineDiffView({ rows }: { rows: Row[] }) {
  return (
    <div className="diff" role="table" aria-label="Line diff">
      {rows.map((r, i) => (
        <div key={i} role="row" className={`diff-row ${r.type}`}>
          <span role="cell" className="ln">{r.oldNo ?? ''}</span>
          <span role="cell" className="ln">{r.newNo ?? ''}</span>
          <span role="cell" className="code">
            <span aria-hidden="true">{sign[r.type]} </span>
            <span className="sr-only">{r.type === 'same' ? '' : r.type + ': '}</span>
            {r.text}
          </span>
        </div>
      ))}
    </div>
  );
}

export function WordDiffView({ parts }: { parts: Row[] }) {
  return (
    <pre className="diff words" aria-label="Word diff">
      {parts.map((p, i) =>
        p.type === 'added' ? <ins key={i}>{p.text}</ins> : p.type === 'removed' ? <del key={i}>{p.text}</del> : <span key={i}>{p.text}</span>,
      )}
    </pre>
  );
}
