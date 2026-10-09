export const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
export type Method = (typeof methods)[number];

export interface RequestSpec {
  method: Method;
  url: string;
  headers: string; // one "Name: value" per line
  body: string;
}

export function parseHeaders(text: string): [string, string][] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l, i) => {
      const c = l.indexOf(':');
      if (c < 1) throw new Error(`Header line ${i + 1}: expected "Name: value"`);
      const name = l.slice(0, c).trim();
      if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) throw new Error(`Invalid header name "${name}"`);
      return [name, l.slice(c + 1).trim()];
    });
}

/** Validates the spec and builds fetch() arguments. Pure: it does not send anything. */
export function buildRequest(spec: RequestSpec): { url: string; init: RequestInit } {
  let url: URL;
  try {
    url = new URL(spec.url.trim());
  } catch {
    throw new Error('Enter an absolute http(s) URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only http and https URLs are allowed');
  const headers = parseHeaders(spec.headers);
  const hasBody = !['GET', 'HEAD'].includes(spec.method) && spec.body.length > 0;
  if (['GET', 'HEAD'].includes(spec.method) && spec.body) throw new Error(`${spec.method} requests cannot have a body in the browser`);
  return {
    url: url.href,
    init: { method: spec.method, headers, body: hasBody ? spec.body : undefined, redirect: 'follow', credentials: 'omit', cache: 'no-store' },
  };
}

const sq = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

export function toCurl(spec: RequestSpec): string {
  const { url, init } = buildRequest(spec);
  const parts = ['curl'];
  if (init.method !== 'GET') parts.push('-X', init.method!);
  for (const [k, v] of init.headers as [string, string][]) parts.push('-H', sq(`${k}: ${v}`));
  if (init.body) parts.push('--data-raw', sq(String(init.body)));
  parts.push(sq(url));
  return parts.join(' ');
}
