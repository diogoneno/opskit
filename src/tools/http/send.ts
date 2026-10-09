import { buildRequest, type RequestSpec } from './logic';

export interface Response_ {
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string;
  ms: number;
}

/**
 * The only network call in this tool. It runs only from the Send button's click
 * handler, and only to the URL the user typed. Browser CORS rules apply.
 */
export async function send(spec: RequestSpec, fetchImpl: typeof fetch = fetch): Promise<Response_> {
  const { url, init } = buildRequest(spec);
  const t = performance.now();
  const res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(30000) });
  const body = await res.text();
  return { status: res.status, statusText: res.statusText, headers: [...res.headers.entries()], body, ms: Math.round(performance.now() - t) };
}
