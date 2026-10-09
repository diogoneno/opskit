import { useEffect, useState } from 'react';
import { Checkbox, ErrorLine, Input, Row, TextArea, ToolHeader } from '../../components/ui';
import { re2Issues, type Result } from './logic';

const sampleText = `level=info ts=2026-10-09T10:00:01Z msg="request" status=200 path=/api/pods duration=12ms
level=error ts=2026-10-09T10:00:02Z msg="upstream timeout" status=504 path=/api/deploy duration=30001ms
level=warn ts=2026-10-09T10:00:03Z msg="slow request" status=200 path=/api/logs duration=2310ms`;

const flagInfo = [
  ['g', 'global'],
  ['i', 'ignore case'],
  ['m', 'multiline'],
  ['s', 'dotAll'],
  ['u', 'unicode'],
] as const;

const TIMEOUT_MS = 1500;

export default function RegexPage() {
  const [pattern, setPattern] = useState('status=(?<status>5\\d\\d).*duration=(?<ms>\\d+)ms');
  const [flags, setFlags] = useState('g');
  const [text, setText] = useState(sampleText);
  const [result, setResult] = useState<Result | { ok: false; error: string; timeout: true } | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('./regex.worker.ts', import.meta.url), { type: 'module' });
    const timer = setTimeout(() => {
      worker.terminate();
      setResult({ ok: false, timeout: true, error: `Stopped after ${TIMEOUT_MS} ms: the pattern is probably backtracking catastrophically on this input.` });
    }, TIMEOUT_MS);
    worker.onmessage = (e: MessageEvent<Result>) => {
      clearTimeout(timer);
      setResult(e.data);
      worker.terminate();
    };
    worker.postMessage({ pattern, flags, text });
    return () => {
      clearTimeout(timer);
      worker.terminate();
    };
  }, [pattern, flags, text]);

  const issues = re2Issues(pattern);

  return (
    <>
      <ToolHeader slug="regex" />
      <Input label="Pattern (JavaScript syntax, without slashes)" value={pattern} onChange={setPattern} mono />
      <Row>
        {flagInfo.map(([f, name]) => (
          <Checkbox key={f} label={`${f} (${name})`} checked={flags.includes(f)} onChange={(on) => setFlags(on ? flags + f : flags.replace(f, ''))} />
        ))}
      </Row>
      {issues.length > 0 ? (
        <ul className="badge-list" aria-label="RE2 compatibility">
          {issues.map((i) => <li key={i} className="badge warn">{i}</li>)}
        </ul>
      ) : (
        <p className="hint">No RE2-incompatible constructs found: this pattern should also work in Prometheus, Loki and Go.</p>
      )}
      <TextArea label="Test text" value={text} onChange={setText} rows={8} />
      {result && !result.ok && <ErrorLine error={result.error} />}
      {result?.ok && (
        <>
          <p role="status" className="hint">
            {result.matches.length}
            {result.truncated ? '+' : ''} match{result.matches.length === 1 ? '' : 'es'}
          </p>
          <div className="table-wrap">
            <table>
              <caption>Matches</caption>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Index</th>
                  <th scope="col">Match</th>
                  <th scope="col">Groups</th>
                </tr>
              </thead>
              <tbody>
                {result.matches.map((m, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{m.index}</td>
                    <td className="mono break">{m.text}</td>
                    <td className="mono break">
                      {m.named
                        ? Object.entries(m.named).map(([k, v]) => `${k}=${v ?? '∅'}`).join('  ')
                        : m.groups.map((g, j) => `$${j + 1}=${g ?? '∅'}`).join('  ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
