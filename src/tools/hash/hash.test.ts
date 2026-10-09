import { describe, expect, it } from 'vitest';
import { digest, digestAll, matches } from './logic';

// NIST FIPS 180 test vectors for "abc".
describe('hash', () => {
  it('matches the FIPS 180 "abc" vectors', async () => {
    expect((await digest('SHA-1', 'abc')).hex).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
    expect((await digest('SHA-256', 'abc')).hex).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect((await digest('SHA-512', 'abc')).hex).toMatch(/^ddaf35a193617aba.*a54ca49f$/);
  });
  it('hashes UTF-8 bytes', async () => {
    const fromText = await digest('SHA-256', '€');
    expect(fromText.hex).toBe((await digest('SHA-256', new Uint8Array([0xe2, 0x82, 0xac]))).hex);
    expect(fromText.hex).not.toBe((await digest('SHA-256', new Uint8Array([0x80]))).hex);
  });
  it('returns all four algorithms', async () => {
    expect((await digestAll('')).map((r) => r.alg)).toEqual(['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']);
    expect((await digest('SHA-256', '')).base64).toBe('47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=');
  });
  it('verifies an expected checksum loosely', () => {
    expect(matches('abcd', ' SHA256:ABCD ')).toBe(true);
    expect(matches('abcd', 'abce')).toBe(false);
    expect(matches('abcd', '')).toBe(false);
  });
});
