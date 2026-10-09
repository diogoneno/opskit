import { useMemo, useState } from 'react';
import { ErrorLine, TextArea, ToolHeader } from '../../components/ui';
import { checkPackages, vulnDetails } from './client';
import { parseInput, severityOf, type Finding, type VulnDetail } from './logic';

const example = `npm lodash 4.17.20
npm minimist 1.2.5
PyPI requests 2.19.0
Go golang.org/x/net 0.17.0`;

export default function OsvPage() {
  const [text, setText] = useState(example);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [details, setDetails] = useState<Map<string, VulnDetail>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => {
    try {
      return { ok: true as const, value: parseInput(text) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [text]);

  const check = async () => {
    if (!parsed.ok) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('You are offline. The OSV lookup needs the network; every other opskit tool works offline.');
      return;
    }
    setBusy(true);
    setError(null);
    setFindings(null);
    try {
      const f = await checkPackages(parsed.value.packages);
      setFindings(f);
      setDetails(await vulnDetails([...new Set(f.flatMap((x) => x.ids))]));
    } catch (e) {
      setError(`Lookup failed: ${(e as Error).message}. Check your connection; nothing else in opskit needs the network.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ToolHeader slug="osv">
        <p className="notice" role="note">
          <strong>Network:</strong> this is the only opskit tool that contacts a third party. When you press <em>Check</em>, it sends
          each package’s ecosystem, name and version — and nothing else — to <code>api.osv.dev</code> (Google’s open
          vulnerability database). Nothing is sent before you press the button.
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
      <button type="button" className="btn primary" disabled={!parsed.ok || !parsed.value.packages.length || busy} onClick={check}>
        {busy ? 'Checking…' : 'Check against OSV.dev'}
      </button>
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
                f.ids.map((id) => (
                  <tr key={`${f.pkg.ecosystem}:${f.pkg.name}@${f.pkg.version}:${id}`}>
                    <td className="mono">{f.pkg.ecosystem}/{f.pkg.name}@{f.pkg.version}</td>
                    <td className="mono">
                      <a href={`https://osv.dev/vulnerability/${encodeURIComponent(id)}`} target="_blank" rel="noreferrer noopener">
                        {id}
                      </a>
                    </td>
                    <td>{severityOf(details.get(id))}</td>
                    <td>{details.get(id)?.summary ?? ''}</td>
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
