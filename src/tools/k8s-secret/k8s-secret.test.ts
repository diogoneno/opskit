import { describe, expect, it } from 'vitest';
import { decodeSecret, encodeSecret, parseEnv, toEnv } from './logic';

describe('kubernetes secret', () => {
  it('parses .env lines', () => {
    expect(parseEnv('# c\nexport A=1\nB="two words"\nC=\'x=y\'\nD=val # comment\nE="line\\nbreak"\n\n')).toEqual([
      ['A', '1'],
      ['B', 'two words'],
      ['C', 'x=y'],
      ['D', 'val'],
      ['E', 'line\nbreak'],
    ]);
    expect(() => parseEnv('not a pair')).toThrow(/Line 1/);
  });
  it('encodes to a Secret manifest with base64 data (UTF-8 safe)', () => {
    const y = encodeSecret({ name: 'db-creds', namespace: 'prod', type: 'Opaque', pairs: [['USER', 'app'], ['PASS', 'pä55']] });
    expect(y).toBe(
      'apiVersion: v1\nkind: Secret\nmetadata:\n  name: db-creds\n  namespace: prod\ntype: Opaque\ndata:\n  USER: YXBw\n  PASS: cMOkNTU=\n',
    );
  });
  it('validates names and keys', () => {
    const base = { name: 'ok', namespace: '', type: 'Opaque', pairs: [] as [string, string][] };
    expect(() => encodeSecret({ ...base, name: 'Bad_Name' })).toThrow(/DNS-1123/);
    expect(() => encodeSecret({ ...base, pairs: [['bad key', 'v']] })).toThrow(/valid Secret key/);
    expect(() => encodeSecret({ ...base, pairs: [['a', '1'], ['a', '2']] })).toThrow(/Duplicate/);
  });
  it('round-trips and decodes stringData', () => {
    const pairs: [string, string][] = [['A', 'x y'], ['B', '🚀']];
    const y = encodeSecret({ name: 's', namespace: '', type: 'Opaque', pairs });
    expect(decodeSecret(y).pairs).toEqual(pairs);
    expect(decodeSecret('kind: Secret\nstringData:\n  TOKEN: abc\n').pairs).toEqual([['TOKEN', 'abc']]);
    expect(() => decodeSecret('kind: ConfigMap\n')).toThrow(/not Secret/);
    expect(() => decodeSecret('kind: Secret\ndata:\n  A: "%%%"\n')).toThrow(/data.A/);
    expect(toEnv([['A', 'x y'], ['B', 'z']])).toBe('A="x y"\nB=z');
  });
});
