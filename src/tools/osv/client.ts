import { batchBodies, mergeResults, OSV_API, type Finding, type Pkg, type VulnDetail } from './logic';

/**
 * The only module in opskit that contacts a third-party host. It runs only when
 * the user presses "Check" and sends package names, ecosystems and versions only.
 */
export async function checkPackages(pkgs: Pkg[], fetchImpl: typeof fetch = fetch): Promise<Finding[]> {
  const responses = [];
  for (const body of batchBodies(pkgs)) {
    const res = await fetchImpl(`${OSV_API}/querybatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'omit',
    });
    if (!res.ok) throw new Error(`OSV.dev returned HTTP ${res.status}`);
    responses.push(await res.json());
  }
  return mergeResults(pkgs, responses);
}

export async function vulnDetails(ids: string[], fetchImpl: typeof fetch = fetch, limit = 50): Promise<Map<string, VulnDetail>> {
  const out = new Map<string, VulnDetail>();
  await Promise.all(
    ids.slice(0, limit).map(async (id) => {
      const res = await fetchImpl(`${OSV_API}/vulns/${encodeURIComponent(id)}`, { credentials: 'omit' });
      if (res.ok) out.set(id, await res.json());
    }),
  );
  return out;
}
