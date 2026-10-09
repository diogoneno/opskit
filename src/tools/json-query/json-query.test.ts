import { describe, expect, it } from 'vitest';
import { runQuery } from './logic';

const pods = JSON.stringify({
  items: [
    { name: 'a', phase: 'Running', restarts: 0 },
    { name: 'b', phase: 'Failed', restarts: 7 },
  ],
});

describe('json query (JMESPath)', () => {
  it('filters with a predicate', () => {
    expect(runQuery(pods, "items[?phase != 'Running'].name")).toEqual({ ok: true, output: '[\n  "b"\n]' });
  });
  it('supports functions and projections', () => {
    expect(runQuery(pods, 'max_by(items, &restarts).name')).toEqual({ ok: true, output: '"b"' });
    expect(runQuery(pods, 'length(items)')).toEqual({ ok: true, output: '2' });
  });
  it('prints raw strings like jq -r', () => {
    expect(runQuery(pods, 'items[].name', true)).toEqual({ ok: true, output: 'a\nb' });
  });
  it('separates JSON errors from expression errors', () => {
    expect(runQuery('{', 'a')).toMatchObject({ ok: false, stage: 'json' });
    expect(runQuery(pods, 'items[?')).toMatchObject({ ok: false, stage: 'query' });
  });
  it('returns the document for an empty expression', () => {
    expect(runQuery('{"a":1}', '  ')).toEqual({ ok: true, output: '{\n  "a": 1\n}' });
  });
});
