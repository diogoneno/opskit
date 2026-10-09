import { describe, expect, it, vi } from 'vitest';
import { buildRequest, parseHeaders, toCurl, type RequestSpec } from './logic';
import { send } from './send';

const spec: RequestSpec = { method: 'POST', url: 'https://api.example.com/x?q=1', headers: 'Content-Type: application/json\n# comment\nX-Id: a:b', body: `{"msg":"it's"}` };

describe('http request builder', () => {
  it('parses headers', () => {
    expect(parseHeaders(spec.headers)).toEqual([['Content-Type', 'application/json'], ['X-Id', 'a:b']]);
    expect(() => parseHeaders('no colon')).toThrow(/Name: value/);
    expect(() => parseHeaders('Bad Name: x')).toThrow(/Invalid header/);
  });
  it('builds a fetch request without credentials', () => {
    const { url, init } = buildRequest(spec);
    expect(url).toBe('https://api.example.com/x?q=1');
    expect(init).toMatchObject({ method: 'POST', credentials: 'omit', body: spec.body });
  });
  it('rejects unsafe or invalid input', () => {
    expect(() => buildRequest({ ...spec, url: 'javascript:alert(1)' })).toThrow(/http/);
    expect(() => buildRequest({ ...spec, url: 'example.com' })).toThrow(/absolute/);
    expect(() => buildRequest({ ...spec, method: 'GET' })).toThrow(/body/);
  });
  it('produces a shell-safe curl command', () => {
    expect(toCurl(spec)).toBe(`curl -X POST -H 'Content-Type: application/json' -H 'X-Id: a:b' --data-raw '{"msg":"it'\\''s"}' 'https://api.example.com/x?q=1'`);
  });
  it('sends only to the given URL, through the injected fetch', async () => {
    const fake = vi.fn(async () => new Response('ok', { status: 201, statusText: 'Created', headers: { 'x-a': '1' } }));
    const r = await send(spec, fake as unknown as typeof fetch);
    expect(fake).toHaveBeenCalledTimes(1);
    expect((fake.mock.calls[0] as unknown[])[0]).toBe('https://api.example.com/x?q=1');
    expect(r).toMatchObject({ status: 201, body: 'ok', headers: [['content-type', 'text/plain;charset=UTF-8'], ['x-a', '1']] });
  });
});
