import { bytesToBase64, bytesToHex } from '../../lib/bytes';

export type Fill = (a: Uint32Array) => Uint32Array;
const cryptoFill: Fill = (a) => crypto.getRandomValues(a);

/** Uniform integer in [0, n) from the CSPRNG, using rejection sampling to avoid modulo bias. */
export function randomInt(n: number, fill: Fill = cryptoFill): number {
  if (!Number.isInteger(n) || n <= 0 || n > 2 ** 32) throw new RangeError('n out of range');
  const limit = 2 ** 32 - (2 ** 32 % n); // largest multiple of n that fits in 32 bits
  const buf = new Uint32Array(1);
  for (;;) {
    const v = fill(buf)[0];
    if (v < limit) return v % n;
  }
}

export const sets = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>/?~',
} as const;
export type SetName = keyof typeof sets;
const ambiguous = /[Il1O0o|`'"]/g;

export interface PasswordOptions {
  length: number;
  use: SetName[];
  excludeAmbiguous: boolean;
}

export function poolFor(opts: PasswordOptions): string[] {
  return opts.use.map((s) => (opts.excludeAmbiguous ? sets[s].replace(ambiguous, '') : sets[s]));
}

/** At least one character from every selected set, then a CSPRNG Fisher-Yates shuffle. */
export function generatePassword(opts: PasswordOptions, fill: Fill = cryptoFill): string {
  const pools = poolFor(opts);
  if (!pools.length) throw new Error('Select at least one character set');
  if (opts.length < pools.length || opts.length > 1024) throw new Error(`Length must be between ${pools.length} and 1024`);
  const all = pools.join('');
  const chars = pools.map((p) => p[randomInt(p.length, fill)]);
  while (chars.length < opts.length) chars.push(all[randomInt(all.length, fill)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1, fill);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export const entropyBits = (opts: PasswordOptions) =>
  Math.floor(opts.length * Math.log2(Math.max(1, poolFor(opts).join('').length)));

export const uuidV4 = () => crypto.randomUUID();

/** RFC 9562 UUIDv7: 48-bit Unix ms timestamp + random bits; sorts by creation time. */
export function uuidV7(nowMs = Date.now()): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  let ts = BigInt(nowMs);
  for (let i = 5; i >= 0; i--) {
    b[i] = Number(ts & 0xffn);
    ts >>= 8n;
  }
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = bytesToHex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function token(bytes: number, format: 'hex' | 'base64url'): string {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return format === 'hex' ? bytesToHex(b) : bytesToBase64(b, true);
}
