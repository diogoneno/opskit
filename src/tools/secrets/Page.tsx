import { useMemo, useState } from 'react';
import { TextArea, ToolHeader } from '../../components/ui';
import { rules, sample, scan } from './logic';

export default function SecretsPage() {
  const [text, setText] = useState(sample);
  const findings = useMemo(() => scan(text), [text]);
  const high = findings.filter((f) => f.severity === 'high').length;

  return (
    <>
      <ToolHeader slug="secrets">
        <p className="hint">
          {rules.length} rules, run locally. Matches are redacted in the results. A clean result means none of these
          patterns matched — not that the text is safe.
        </p>
      </ToolHeader>
      <TextArea label="Text to scan (a diff, .env, config or log)" value={text} onChange={setText} rows={12} />
      <p className={`badge ${findings.length ? 'bad' : 'ok'}`} role="status">
        {findings.length ? `${findings.length} finding(s), ${high} high severity` : `No matches across ${rules.length} rules`}
      </p>
      {findings.length > 0 && (
        <div className="table-wrap">
          <table>
            <caption>Findings</caption>
            <thead>
              <tr>
                <th scope="col">Line:col</th>
                <th scope="col">Severity</th>
                <th scope="col">Type</th>
                <th scope="col">Match (redacted)</th>
              </tr>
            </thead>
            <tbody>
              {findings.map((f) => (
                <tr key={`${f.line}:${f.column}:${f.rule}`}>
                  <td className="mono">
                    {f.line}:{f.column}
                  </td>
                  <td>
                    <span className={`badge ${f.severity === 'high' ? 'bad' : 'warn'}`}>{f.severity}</span>
                  </td>
                  <td>{f.name}</td>
                  <td className="mono break">{f.redacted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <details>
        <summary>Rules</summary>
        <ul className="cols">
          {rules.map((r) => (
            <li key={r.id}>
              {r.name} <span className="hint">({r.severity})</span>
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
