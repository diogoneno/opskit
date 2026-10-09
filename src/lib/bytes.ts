// Byte-level helpers shared by the Base64, JWT and Kubernetes Secret tools.
// Everything goes through UTF-8 bytes, so any Unicode text round-trips.

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export const utf8Encode = (text: string): Uint8Array => new TextEncoder().encode(text);

/** Strict UTF-8 decode: throws on invalid byte sequences instead of inserting U+FFFD. */
export function utf8Decode(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('Decoded bytes are not valid UTF-8 text (binary data?)');
  }
}

export function bytesToBase64(bytes: Uint8Array, url = false): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const left = bytes.length - i;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += left > 1 ? B64[(n >> 6) & 63] : '=';
    out += left > 2 ? B64[n & 63] : '=';
  }
  return url ? out.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : out;
}

/** Accepts standard Base64 and base64url, with or without padding, ignoring whitespace. */
export function base64ToBytes(input: string): Uint8Array {
  const clean = input.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  if (!/^[A-Za-z0-9+/]*$/.test(clean)) throw new Error('Input contains characters outside the Base64 alphabet');
  if (clean.length % 4 === 1) throw new Error('Invalid Base64 length');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c = [0, 1, 2, 3].map((k) => (i + k < clean.length ? B64.indexOf(clean[i + k]) : 0));
    const n = (c[0] << 18) | (c[1] << 12) | (c[2] << 6) | c[3];
    out[o++] = (n >> 16) & 255;
    if (i + 2 < clean.length) out[o++] = (n >> 8) & 255;
    if (i + 3 < clean.length) out[o++] = n & 255;
  }
  return out.subarray(0, o);
}

export const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, '').replace(/[\s:]/g, '');
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2) throw new Error('Hex must be an even number of 0-9a-f digits');
  return Uint8Array.from(clean.match(/../g) ?? [], (h) => parseInt(h, 16));
}

export const base64EncodeText = (text: string, url = false) => bytesToBase64(utf8Encode(text), url);
export const base64DecodeText = (b64: string) => utf8Decode(base64ToBytes(b64));
