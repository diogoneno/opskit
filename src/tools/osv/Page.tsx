import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ErrorLine, TextArea, ToolHeader } from '../../components/ui';
import { lookup } from './client';
import {
  clearOsvConsent,
  OSV_DEFAULT_ENDPOINT,
  parseInput,
  readOsvConsent,
  saveOsvConsent,
  severityOf,
  validEndpoint,
  type Finding,
  type OsvConsent,
} from './logic';

const example = `npm lodash 4.17.20
npm minimist 1.2.5
PyPI requests 2.19.0
Go golang.org/x/net 0.17.0`;

const DIALOG_TITLE = 'Third-party integration: OSV.dev';
const PRIVACY_URL = 'https://policies.google.com/privacy';

function ConsentDialog({ onEnable, onCancel }: { onEnable: (endpoint: string) => void; onCancel: () => void }) {
  const [endpoint, setEndpoint] = useState(OSV_DEFAULT_ENDPOINT);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const valid = validEndpoint(endpoint);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input, button')?.focus();
    return () => previous?.focus?.();
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key !== 'Tab' || !ref.current) return;
    const items = [...ref.current.querySelectorAll<HTMLElement>('a[href], input, button:not(:disabled)')];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="modal-backdrop">
      <div
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={id + '-title'}
        aria-describedby={id + '-desc'}
        onKeyDown={onKeyDown}
      >
        <h2 id={id + '-title'}>{DIALOG_TITLE}</h2>
        <div id={id + '-desc'}>
          <p>
            Vulnerability lookup is off. Turning it on lets this page send requests to a service outside your browser. Nothing has
            been sent yet.
          </p>
          <p>
            <strong>What is sent</strong>, one request per package: its <strong>ecosystem</strong>, <strong>package name</strong> and{' '}
            <strong>version</strong>. Nothing else: no cookies, no identifiers, no other input from this page. As with any web
            request, the endpoint can see your IP address.
          </p>
        </div>
        <label htmlFor={id + '-endpoint'}>Endpoint</label>
        <input
          id={id + '-endpoint'}
          type="url"
          className="mono"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          aria-invalid={!valid}
          aria-describedby={id + '-endpoint-hint'}
          spellCheck={false}
          autoComplete="off"
        />
        <small id={id + '-endpoint-hint'} className="hint">
          {valid ? 'Change this to use a self-hosted OSV instance or a proxy.' : 'Enter an absolute http(s) URL.'}
        </small>
        <p>
          OSV.dev is operated by Google:{' '}
          <a href={PRIVACY_URL} target="_blank" rel="noreferrer noopener">
            Google privacy policy
          </a>
          .
        </p>
        <div className="modal-actions">
          <button type="button" className="btn primary" disabled={!valid} onClick={() => valid && onEnable(valid)}>
            Enable and look up
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OsvPage() {
  const [text, setText] = useState(example);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState<OsvConsent | null>(readOsvConsent);
  const [asking, setAsking] = useState(false);
  const parsed = useMemo(() => {
    try {
      return { ok: true as const, value: parseInput(text) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [text]);

  const run = async () => {
    if (!parsed.ok) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('You are offline. The OSV lookup needs the network; every other opskit tool works offline.');
      return;
    }
    setBusy(true);
    setError(null);
    setFindings(null);
    try {
      setFindings(await lookup(parsed.value.packages));
    } catch (e) {
      setError(`Lookup failed: ${(e as Error).message}. Check your connection; nothing else in opskit needs the network.`);
    } finally {
      setBusy(false);
    }
  };

  const onLookUp = () => {
    if (readOsvConsent()) void run();
    else setAsking(true);
  };

  const enable = (endpoint: string) => {
    try {
      setConsent(saveOsvConsent(endpoint));
    } catch (e) {
      setError(`Could not enable the integration: ${(e as Error).message}`);
      setAsking(false);
      return;
    }
    setAsking(false);
    void run();
  };

  const disable = () => {
    clearOsvConsent();
    setConsent(null);
  };

  return (
    <>
      <ToolHeader slug="osv">
        <p className="notice" role="note">
          <strong>Network:</strong> this is the only opskit tool that contacts a third party, and only after you opt in. Pressing{' '}
          <em>Look up</em> the first time asks you to enable the OSV.dev integration (Google’s open vulnerability database) and
          shows exactly what is sent: each package’s ecosystem, name and version — nothing else.
        </p>
        <p className="integration-state" role="status">
          {consent ? (
            <>
              <strong>Integration: on</strong> → <code>{consent.endpoint}</code>{' '}
              <button type="button" className="btn small" onClick={disable}>
                Disable integration
              </button>
            </>
          ) : (
            <>
              <strong>Integration: off</strong> — no requests are made
            </>
          )}
        </p>
      </ToolHeader>
      <TextArea
        label="package-lock.json, requirements.txt, or “ecosystem name version” per line"
        value={text}
        onChange={setText}
        rows={10}
        hint="Ecosystems: npm, PyPI, Go, crates.io, Maven, RubyGems, NuGet, Packagist. Only exact versions can be checked."
      />
      <ErrorLine error={parsed.ok ? null : parsed.error} />
      {parsed.ok && (
        <p className="hint">
          {parsed.value.format}: {parsed.value.packages.length} package(s)
          {parsed.value.skipped.length > 0 && `, ${parsed.value.skipped.length} line(s) skipped (no exact version): ${parsed.value.skipped.slice(0, 5).join(', ')}`}
        </p>
      )}
      <button type="button" className="btn primary" disabled={!parsed.ok || !parsed.value.packages.length || busy} onClick={onLookUp}>
        {busy ? 'Looking up…' : 'Look up'}
      </button>
      {asking && <ConsentDialog onEnable={enable} onCancel={() => setAsking(false)} />}
      <ErrorLine error={error} />
      {findings && (
        <p className={`badge ${findings.length ? 'bad' : 'ok'}`} role="status">
          {findings.length
            ? `${findings.length} of ${parsed.ok ? parsed.value.packages.length : 0} packages have known vulnerabilities`
            : `No known vulnerabilities in ${parsed.ok ? parsed.value.packages.length : 0} packages`}
        </p>
      )}
      {findings && findings.length > 0 && (
        <div className="table-wrap">
          <table>
            <caption>Vulnerable packages</caption>
            <thead>
              <tr>
                <th scope="col">Package</th>
                <th scope="col">Advisory</th>
                <th scope="col">Severity</th>
                <th scope="col">Summary</th>
              </tr>
            </thead>
            <tbody>
              {findings.flatMap((f) =>
                f.vulns.map((v) => (
                  <tr key={`${f.pkg.ecosystem}:${f.pkg.name}@${f.pkg.version}:${v.id}`}>
                    <td className="mono">{f.pkg.ecosystem}/{f.pkg.name}@{f.pkg.version}</td>
                    <td className="mono">
                      <a href={`https://osv.dev/vulnerability/${encodeURIComponent(v.id)}`} target="_blank" rel="noreferrer noopener">
                        {v.id}
                      </a>
                    </td>
                    <td>{severityOf(v)}</td>
                    <td>{v.summary ?? ''}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
