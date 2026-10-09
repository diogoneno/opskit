import { describe, expect, it } from 'vitest';
import { jsonToYaml, yamlToJson } from './logic';

describe('yaml ⇄ json', () => {
  it('converts YAML to JSON', () => {
    expect(yamlToJson('a: 1\nb:\n  - x\n  - true\n')).toEqual({
      ok: true,
      output: '{\n  "a": 1,\n  "b": [\n    "x",\n    true\n  ]\n}',
      documents: 1,
    });
  });
  it('turns a multi-document stream into an array', () => {
    const r = yamlToJson('kind: A\n---\nkind: B\n');
    expect(r).toMatchObject({ ok: true, documents: 2 });
    if (r.ok) expect(JSON.parse(r.output)).toEqual([{ kind: 'A' }, { kind: 'B' }]);
  });
  it('reports YAML syntax errors', () => {
    expect(yamlToJson('a: [1, 2\nb: 3').ok).toBe(false);
  });
  it('keeps strings that look like other types quoted (the Norway problem)', () => {
    const r = jsonToYaml('{"country":"NO","version":"1.10","on":"yes"}');
    expect(r.ok && r.output).toBe('country: "NO"\nversion: "1.10"\n"on": "yes"\n');
    if (r.ok) expect(yamlToJson(r.output)).toMatchObject({ output: JSON.stringify({ country: 'NO', version: '1.10', on: 'yes' }, null, 2) });
  });
  it('writes one document per array item when asked', () => {
    expect(jsonToYaml('[{"a":1},{"b":2}]', true)).toEqual({ ok: true, output: 'a: 1\n---\nb: 2\n', documents: 2 });
  });
  it('limits alias expansion (billion laughs)', () => {
    const bomb = 'a: &a [x, x, x, x, x, x, x, x, x]\nb: &b [*a, *a, *a, *a, *a, *a, *a, *a, *a]\nc: &c [*b, *b, *b, *b, *b, *b, *b, *b, *b]\nd: [*c, *c, *c, *c, *c, *c, *c, *c, *c]\n';
    const r = yamlToJson(bomb);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/alias/i);
  });
});
