import { useState } from 'react';
import { Checkbox, ErrorLine, Input, Output, Row, Select, ToolHeader } from '../../components/ui';
import { entropyBits, generatePassword, token, uuidV4, uuidV7, type PasswordOptions, type SetName } from './logic';

const labels: Record<SetName, string> = { lower: 'a–z', upper: 'A–Z', digits: '0–9', symbols: 'Symbols' };

export default function RandomPage() {
  const [opts, setOpts] = useState<PasswordOptions>({ length: 24, use: ['lower', 'upper', 'digits', 'symbols'], excludeAmbiguous: true });
  const [count, setCount] = useState(5);
  const [passwords, setPasswords] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uuidKind, setUuidKind] = useState<'v4' | 'v7'>('v4');
  const [uuids, setUuids] = useState('');
  const [tokenBytes, setTokenBytes] = useState(32);
  const [tokenFormat, setTokenFormat] = useState<'hex' | 'base64url'>('base64url');
  const [tok, setTok] = useState('');

  const toggle = (s: SetName, on: boolean) =>
    setOpts((o) => ({ ...o, use: on ? [...o.use, s] : o.use.filter((x) => x !== s) }));
  const n = Math.min(Math.max(count, 1), 100);

  const genPasswords = () => {
    try {
      setPasswords(Array.from({ length: n }, () => generatePassword(opts)).join('\n'));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      <ToolHeader slug="random">
        <p className="hint">All values come from <code>crypto.getRandomValues</code> / <code>crypto.randomUUID</code>, never <code>Math.random</code>.</p>
      </ToolHeader>
      <section aria-labelledby="pw-h">
        <h2 id="pw-h">Passwords</h2>
        <Row>
          <Input label="Length" type="number" min={4} max={1024} value={opts.length} onChange={(v) => setOpts({ ...opts, length: Number(v) })} />
          <Input label="How many" type="number" min={1} max={100} value={count} onChange={(v) => setCount(Number(v))} />
        </Row>
        <Row>
          {(Object.keys(labels) as SetName[]).map((s) => (
            <Checkbox key={s} label={labels[s]} checked={opts.use.includes(s)} onChange={(on) => toggle(s, on)} />
          ))}
          <Checkbox label="Exclude look-alikes (I l 1 O 0)" checked={opts.excludeAmbiguous} onChange={(v) => setOpts({ ...opts, excludeAmbiguous: v })} />
        </Row>
        <Row>
          <button type="button" className="btn primary" onClick={genPasswords}>
            Generate passwords
          </button>
          <span className="hint">≈ {entropyBits(opts)} bits of entropy each</span>
        </Row>
        <ErrorLine error={error} />
        <Output label="Generated passwords" value={passwords} rows={Math.min(n, 8)} />
      </section>
      <section aria-labelledby="uuid-h">
        <h2 id="uuid-h">UUIDs</h2>
        <Row>
          <Select label="Version" value={uuidKind} onChange={setUuidKind} options={[['v4', 'v4 (random)'], ['v7', 'v7 (time-ordered)']]} />
          <button type="button" className="btn primary" onClick={() => setUuids(Array.from({ length: n }, () => (uuidKind === 'v4' ? uuidV4() : uuidV7())).join('\n'))}>
            Generate UUIDs
          </button>
        </Row>
        <Output label="Generated UUIDs" value={uuids} rows={Math.min(n, 8)} />
      </section>
      <section aria-labelledby="tok-h">
        <h2 id="tok-h">Random token</h2>
        <Row>
          <Input label="Bytes" type="number" min={8} max={256} value={tokenBytes} onChange={(v) => setTokenBytes(Number(v))} />
          <Select label="Format" value={tokenFormat} onChange={setTokenFormat} options={[['base64url', 'base64url'], ['hex', 'hex']]} />
          <button type="button" className="btn primary" onClick={() => setTok(token(Math.min(Math.max(tokenBytes, 8), 256), tokenFormat))}>
            Generate token
          </button>
        </Row>
        <Output label="Generated token" value={tok} rows={2} />
      </section>
    </>
  );
}
