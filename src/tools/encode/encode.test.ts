import { describe, expect, it } from 'vitest';
import { decode, encode, run } from './logic';

// The original Base64 tool called btoa(input) directly. Copied verbatim for the regression test.
const oldEncode = (input: string) => btoa(input);

describe('Base64 (regression: non-Latin-1 input)', () => {
  it('OLD behaviour: btoa throws on non-Latin-1 text', () => {
    expect(() => oldEncode('€')).toThrow();
    expect(() => oldEncode('🚀')).toThrow();
  });
  it('NEW behaviour: encodes UTF-8 bytes and round-trips', () => {
    expect(encode('€', 'base64')).toBe('4oKs');
    expect(encode('🚀', 'base64')).toBe('8J+agA==');
    const text = 'héllo wörld — 你好 🚀';
    expect(decode(encode(text, 'base64'), 'base64')).toBe(text);
  });
  it('matches btoa for ASCII', () => {
    for (const s of ['', 'f', 'fo', 'foo', 'foob', 'fooba', 'foobar']) expect(encode(s, 'base64')).toBe(btoa(s));
  });
});

describe('base64url', () => {
  it('uses - and _ and drops padding', () => {
    expect(encode('ûÿ', 'base64')).toBe('w7vDvw==');
    expect(encode('ûÿ', 'base64url')).toBe('w7vDvw');
    expect(encode('??>', 'base64')).toBe('Pz8+');
    expect(encode('??>', 'base64url')).toBe('Pz8-');
  });
  it('decodes either alphabet with or without padding', () => {
    expect(decode('Pz8-', 'base64')).toBe('??>');
    expect(decode('8J+agA', 'base64')).toBe('🚀');
  });
  it('rejects invalid input and non-UTF-8 bytes', () => {
    expect(run('abc$', 'base64', 'decode').ok).toBe(false);
    expect(run('/w==', 'base64', 'decode')).toEqual({ ok: false, error: 'Decoded bytes are not valid UTF-8 text (binary data?)' });
  });
});

describe('url and hex', () => {
  it('percent-encodes', () => {
    expect(encode('a b&c=d/€', 'url')).toBe('a%20b%26c%3Dd%2F%E2%82%AC');
    expect(decode('a+b%20c', 'url')).toBe('a b c');
    expect(run('%E0%A4%A', 'url', 'decode').ok).toBe(false);
  });
  it('hex-encodes UTF-8', () => {
    expect(encode('é', 'hex')).toBe('c3a9');
    expect(decode('c3 a9', 'hex')).toBe('é');
    expect(run('abc', 'hex', 'decode').ok).toBe(false);
  });
});
