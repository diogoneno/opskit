import { queryBody, readOsvConsent, type Finding, type Pkg, type VulnDetail } from './logic';

export class ConsentRequiredError extends Error {
  constructor() {
    super('The OSV.dev integration is off. Enable it first; no request was made.');
    this.name = 'ConsentRequiredError';
  }
}

/**
 * The only function in opskit that contacts a third-party host. It throws before
 * touching the network unless the user has enabled the integration, and it sends
 * one package's ecosystem, name and version — nothing else — to the stored endpoint.
 */
export async function osvQuery(pkg: Pkg, fetchImpl: typeof fetch = fetch): Promise<VulnDetail[]> {
  const consent = readOsvConsent();
  if (!consent) throw new ConsentRequiredError();
  const res = await fetchImpl(consent.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(queryBody(pkg)),
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`OSV endpoint returned HTTP ${res.status}`);
  const json = (await res.json()) as { vulns?: VulnDetail[] };
  return json.vulns ?? [];
}

/** Looks up every package (a few at a time) and keeps only the vulnerable ones. */
export async function lookup(pkgs: Pkg[], fetchImpl: typeof fetch = fetch, concurrency = 6): Promise<Finding[]> {
  if (!readOsvConsent()) throw new ConsentRequiredError();
  const out: (Finding | null)[] = new Array(pkgs.length).fill(null);
  let next = 0;
  const worker = async () => {
    while (next < pkgs.length) {
      const i = next++;
      const vulns = await osvQuery(pkgs[i], fetchImpl);
      if (vulns.length) out[i] = { pkg: pkgs[i], vulns };
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, pkgs.length) }, worker));
  return out.filter((f): f is Finding => f !== null);
}
