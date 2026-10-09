import { bytesToBase64, bytesToHex, utf8Encode } from '../../lib/bytes';

export const algorithms = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const;
export type Algorithm = (typeof algorithms)[number];

export async function digest(alg: Algorithm, data: Uint8Array | string): Promise<{ hex: string; base64: string }> {
  const bytes = typeof data === 'string' ? utf8Encode(data) : data;
  const buf = new Uint8Array(await crypto.subtle.digest(alg, bytes as BufferSource));
  return { hex: bytesToHex(buf), base64: bytesToBase64(buf) };
}

export async function digestAll(data: Uint8Array | string) {
  const out = await Promise.all(algorithms.map((a) => digest(a, data)));
  return algorithms.map((alg, i) => ({ alg, ...out[i] }));
}

/** Compares a digest to an expected value, ignoring case, spaces and an "sha256:" style prefix. */
export function matches(actualHex: string, expected: string): boolean {
  const e = expected.trim().toLowerCase().replace(/^sha-?\d+[:=]/, '').replace(/\s+/g, '');
  return e.length > 0 && e === actualHex;
}
