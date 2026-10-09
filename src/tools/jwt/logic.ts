import { base64DecodeText } from '../../lib/bytes';

export interface TimeClaim {
  claim: 'exp' | 'iat' | 'nbf' | 'auth_time';
  seconds: number;
  utc: string;
  local: string;
}

export interface Decoded {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  times: TimeClaim[];
  status: 'valid-window' | 'expired' | 'not-yet-valid' | 'no-exp';
  warnings: string[];
}

export type Result = { ok: true; value: Decoded } | { ok: false; error: string };

function part(segment: string, name: string): Record<string, unknown> {
  let text: string;
  try {
    // base64url (RFC 7515): '-' and '_' instead of '+' and '/', no padding.
    text = base64DecodeText(segment);
  } catch (e) {
    throw new Error(`${name} is not valid base64url: ${(e as Error).message}`, { cause: e });
  }
  try {
    const v = JSON.parse(text);
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('not a JSON object');
    return v;
  } catch (e) {
    throw new Error(`${name} is not a JSON object: ${(e as Error).message}`, { cause: e });
  }
}

export function decodeJwt(token: string, nowSeconds = Date.now() / 1000): Result {
  const t = token.trim().replace(/^Bearer\s+/i, '');
  if (!t) return { ok: false, error: 'Paste a token' };
  const parts = t.split('.');
  if (parts.length === 5) return { ok: false, error: 'This is a JWE (encrypted token, 5 parts); its payload cannot be read without the key' };
  if (parts.length !== 3) return { ok: false, error: `Expected 3 dot-separated parts, found ${parts.length}` };
  try {
    const header = part(parts[0], 'Header');
    const payload = part(parts[1], 'Payload');
    const times: TimeClaim[] = (['iat', 'nbf', 'exp', 'auth_time'] as const)
      .filter((c) => typeof payload[c] === 'number')
      .map((claim) => {
        const seconds = payload[claim] as number;
        const d = new Date(seconds * 1000);
        return { claim, seconds, utc: d.toISOString(), local: d.toString() };
      });
    const exp = payload.exp as number | undefined;
    const nbf = payload.nbf as number | undefined;
    const status: Decoded['status'] =
      typeof nbf === 'number' && nowSeconds < nbf
        ? 'not-yet-valid'
        : typeof exp !== 'number'
          ? 'no-exp'
          : nowSeconds >= exp
            ? 'expired'
            : 'valid-window';
    const warnings: string[] = [];
    if (String(header.alg).toLowerCase() === 'none') warnings.push('alg is "none": the token is unsigned');
    if (!parts[2]) warnings.push('The signature part is empty');
    return { ok: true, value: { header, payload, signature: parts[2], times, status, warnings } };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function relative(seconds: number, nowSeconds = Date.now() / 1000): string {
  const diff = Math.round(seconds - nowSeconds);
  const abs = Math.abs(diff);
  const [n, unit] =
    abs < 60 ? [abs, 'second'] : abs < 3600 ? [Math.floor(abs / 60), 'minute'] : abs < 86400 ? [Math.floor(abs / 3600), 'hour'] : [Math.floor(abs / 86400), 'day'];
  const s = `${n} ${unit}${n === 1 ? '' : 's'}`;
  return diff >= 0 ? `in ${s}` : `${s} ago`;
}
