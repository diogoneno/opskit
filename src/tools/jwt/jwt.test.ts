import { describe, expect, it } from 'vitest';
import { base64EncodeText } from '../../lib/bytes';
import { decodeJwt, relative } from './logic';

// The original decoder, copied verbatim: atob() on each part.
function oldDecode(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');
  const header = JSON.parse(atob(parts[0]));
  const payload = JSON.parse(atob(parts[1]));
  return { header, payload, signature: parts[2] };
}

const enc = (o: object) => base64EncodeText(JSON.stringify(o), true);
const make = (payload: object, header: object = { alg: 'HS256', typ: 'JWT' }) => `${enc(header)}.${enc(payload)}.sig`;

describe('JWT (regression: base64url segments)', () => {
  // This payload's base64url encoding contains '-' or '_' (asserted below), which atob rejects.
  const payload = { sub: '1234567890', note: '??>>??', exp: 2000000000 };
  const token = make(payload);

  it('control: the test token really uses base64url-only characters and no padding', () => {
    expect(token.split('.')[1]).toMatch(/[-_]/);
    expect(token).not.toContain('=');
  });
  it('OLD behaviour: atob throws on a real base64url token', () => {
    expect(() => oldDecode(token)).toThrow();
  });
  it('OLD behaviour: non-ASCII claims come back mangled (Latin-1 bytes, not UTF-8)', () => {
    const t = make({ name: 'José' });
    expect(t.split('.')[1]).not.toMatch(/[-_]/); // isolates the UTF-8 defect from the alphabet defect
    expect(oldDecode(t).payload.name).not.toBe('José');
  });
  it('NEW behaviour: decodes both', () => {
    const r = decodeJwt(token, 1700000000);
    expect(r.ok && r.value.payload).toEqual(payload);
    const r2 = decodeJwt(make({ name: 'José' }));
    expect(r2.ok && r2.value.payload.name).toBe('José');
  });
});

describe('JWT claims', () => {
  it('shows exp/iat as dates and works out the status', () => {
    const t = make({ iat: 1700000000, exp: 1700003600 });
    const before = decodeJwt(t, 1700000100);
    expect(before.ok && before.value.status).toBe('valid-window');
    expect(before.ok && before.value.times.map((x) => [x.claim, x.utc])).toEqual([
      ['iat', '2023-11-14T22:13:20.000Z'],
      ['exp', '2023-11-14T23:13:20.000Z'],
    ]);
    const after = decodeJwt(t, 1700003600);
    expect(after.ok && after.value.status).toBe('expired');
    const nbf = decodeJwt(make({ nbf: 1800000000, exp: 1900000000 }), 1700000000);
    expect(nbf.ok && nbf.value.status).toBe('not-yet-valid');
    const noExp = decodeJwt(make({}), 1);
    expect(noExp.ok && noExp.value.status).toBe('no-exp');
  });
  it('strips a Bearer prefix and warns on alg none', () => {
    const r = decodeJwt('Bearer ' + make({ a: 1 }, { alg: 'none' }));
    expect(r.ok && r.value.warnings).toContain('alg is "none": the token is unsigned');
  });
  it('rejects malformed tokens with a reason', () => {
    expect(decodeJwt('a.b')).toEqual({ ok: false, error: 'Expected 3 dot-separated parts, found 2' });
    expect(decodeJwt('a.b.c.d.e').ok).toBe(false);
    expect(decodeJwt(`${enc({ alg: 'x' })}.${base64EncodeText('[1]', true)}.s`)).toMatchObject({ ok: false });
  });
  it('formats relative times', () => {
    expect(relative(1000, 1000 - 7200)).toBe('in 2 hours');
    expect(relative(1000, 1000 + 61)).toBe('1 minute ago');
  });
});
