import { describe, expect, it } from 'vitest';
import { errorOffset, formatJson, lineCol, sortKeysDeep } from './logic';

describe('json formatter', () => {
  it('pretty-prints with 2 spaces', () => {
    expect(formatJson('{"a":1,"b":[1,2]}', { indent: 2, sortKeys: false })).toEqual({
      ok: true,
      output: '{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}',
    });
  });
  it('minifies', () => {
    expect(formatJson('{ "a" : 1 }', { indent: 'minify', sortKeys: false })).toEqual({ ok: true, output: '{"a":1}' });
  });
  it('sorts keys deeply', () => {
    expect(JSON.stringify(sortKeysDeep({ b: { d: 1, c: 2 }, a: [{ z: 1, y: 2 }] }))).toBe(
      '{"a":[{"y":2,"z":1}],"b":{"c":2,"d":1}}',
    );
  });
  it('reports the error with a line and column', () => {
    const r = formatJson('{\n  "a": 1,\n  "b": }', { indent: 2, sortKeys: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/line 3/);
  });
  it('treats blank input as empty, not an error', () => {
    expect(formatJson('   ', { indent: 2, sortKeys: false })).toEqual({ ok: true, output: '' });
  });
});

describe('json error location', () => {
  it.each([
    ['{"a":1,}', 7],
    ['[1,2', 4],
    ['{"a" 1}', 5],
    ['tru', 0],
    ['"bad \\x"', 6],
    ['{"a":1} x', 8],
  ])('%s fails at offset %i', (text, offset) => {
    expect(errorOffset(text)).toBe(offset);
    expect(() => JSON.parse(text)).toThrow();
  });
  it('agrees with JSON.parse on valid documents', () => {
    for (const ok of ['{}', '[]', '{"a":[1,-2.5e3,true,null,"\\u00e9"]}', ' 0 ']) {
      expect(errorOffset(ok)).toBe(-1);
      expect(() => JSON.parse(ok)).not.toThrow();
    }
  });
  it('converts an offset to line and column', () => {
    expect(lineCol('ab\ncd', 4)).toEqual({ line: 2, column: 2 });
  });
});
