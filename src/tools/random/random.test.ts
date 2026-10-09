import { afterEach, describe, expect, it, vi } from 'vitest';
import { entropyBits, generatePassword, randomInt, sets, token, uuidV4, uuidV7, type PasswordOptions } from './logic';

// The original generator, copied verbatim (minus React state): Math.random, not a CSPRNG.
function oldGenerate(length: number) {
  const chars = sets.lower + sets.upper + sets.digits + sets.symbols;
  let generated = '';
  for (let i = 0; i < length; i++) generated += chars.charAt(Math.floor(Math.random() * chars.length));
  return generated;
}

const all: PasswordOptions = { length: 32, use: ['lower', 'upper', 'digits', 'symbols'], excludeAmbiguous: false };

afterEach(() => vi.restoreAllMocks());

describe('password generator (regression: Math.random)', () => {
  it('OLD behaviour: output is fully determined by Math.random', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(oldGenerate(12)).toBe('aaaaaaaaaaaa');
  });
  it('NEW behaviour: ignores Math.random and draws from crypto.getRandomValues', () => {
    const mathRandom = vi.spyOn(Math, 'random').mockReturnValue(0);
    const csprng = vi.spyOn(crypto, 'getRandomValues');
    const a = generatePassword(all);
    const b = generatePassword(all);
    expect(a).not.toBe(b);
    expect(a).not.toMatch(/^a+$/);
    expect(mathRandom).not.toHaveBeenCalled();
    expect(csprng).toHaveBeenCalled();
  });
});

describe('password rules', () => {
  it('includes every selected set and respects length', () => {
    for (let i = 0; i < 50; i++) {
      const p = generatePassword({ ...all, length: 8 });
      expect(p).toHaveLength(8);
      for (const s of Object.values(sets)) expect([...p].some((c) => s.includes(c))).toBe(true);
    }
  });
  it('excludes look-alike characters', () => {
    const p = generatePassword({ length: 500, use: ['lower', 'upper', 'digits'], excludeAmbiguous: true });
    expect(p).not.toMatch(/[Il1O0o]/);
  });
  it('rejects impossible options', () => {
    expect(() => generatePassword({ ...all, use: [] })).toThrow();
    expect(() => generatePassword({ ...all, length: 2 })).toThrow();
  });
  it('estimates entropy', () => {
    expect(entropyBits({ length: 10, use: ['digits'], excludeAmbiguous: false })).toBe(33);
  });
});

describe('randomInt (no modulo bias)', () => {
  it('rejects values above the largest multiple of n', () => {
    // n = 3: 2^32 % 3 = 1, so 2^32 - 1 must be rejected and the next draw used.
    const draws = [2 ** 32 - 1, 5];
    const fill = (a: Uint32Array) => {
      a[0] = draws.shift()!;
      return a;
    };
    expect(randomInt(3, fill)).toBe(2);
    expect(draws).toHaveLength(0);
  });
  it('is roughly uniform', () => {
    const counts = new Array(10).fill(0);
    for (let i = 0; i < 20000; i++) counts[randomInt(10)]++;
    for (const c of counts) expect(Math.abs(c - 2000)).toBeLessThan(250);
  });
});

describe('uuid and token', () => {
  it('produces RFC 9562 v4 and v7 UUIDs', () => {
    expect(uuidV4()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const v7 = uuidV7(0x0123456789ab);
    expect(v7).toMatch(/^01234567-89ab-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(uuidV7(1) < uuidV7(2)).toBe(true);
  });
  it('produces tokens of the requested size', () => {
    expect(token(16, 'hex')).toMatch(/^[0-9a-f]{32}$/);
    expect(token(32, 'base64url')).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});
