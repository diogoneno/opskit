import { useEffect, useId, useState } from 'react';
import { CopyButton, Input, TextArea, ToolHeader } from '../../components/ui';
import { digestAll, matches } from './logic';

type Row = Awaited<ReturnType<typeof digestAll>>[number];

export default function HashPage() {
  const [text, setText] = useState('hello world');
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [expected, setExpected] = useState('');
  const fileId = useId();

  useEffect(() => {
    let cancelled = false;
    digestAll(file ? file.bytes : text).then((r) => {
      if (!cancelled) setRows(r);
    });
    return () => {
      cancelled = true;
    };
  }, [text, file]);

  return (
    <>
      <ToolHeader slug="hash" />
      <TextArea label="Text (hashed as UTF-8)" value={text} onChange={(v) => { setText(v); setFile(null); }} rows={6} />
      <div className="field">
        <label htmlFor={fileId}>Or hash a local file (read in the browser, never uploaded)</label>
        <input
          id={fileId}
          type="file"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setFile({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) });
          }}
        />
        {file && <small className="hint">Hashing file {file.name} ({file.bytes.length.toLocaleString()} bytes)</small>}
      </div>
      <Input label="Expected checksum (optional, to verify a download)" value={expected} onChange={setExpected} mono />
      <div className="table-wrap">
        <table>
          <caption>Digests</caption>
          <thead>
            <tr>
              <th scope="col">Algorithm</th>
              <th scope="col">Hex</th>
              <th scope="col">Copy</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.alg}>
                <th scope="row">
                  {r.alg}
                  {expected && matches(r.hex, expected) && <span className="badge ok"> match</span>}
                </th>
                <td className="mono break">{r.hex}</td>
                <td>
                  <CopyButton value={r.hex} label={`Copy ${r.alg}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {expected && !rows.some((r) => matches(r.hex, expected)) && (
        <p className="badge bad" role="status">No algorithm matches the expected checksum</p>
      )}
      <p className="hint">SHA-1 is shown for legacy checksums only; it is broken for collision resistance. MD5 is not offered (WebCrypto does not implement it).</p>
    </>
  );
}
