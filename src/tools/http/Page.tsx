import { useMemo, useState } from 'react';
import { ErrorLine, Input, Output, Row, Select, TextArea, ToolHeader } from '../../components/ui';
import { methods, toCurl, type Method } from './logic';
import { send, type Response_ } from './send';

export default function HttpPage() {
  const [method, setMethod] = useState<Method>('GET');
  const [url, setUrl] = useState('https://api.example.com/v1/health');
  const [headers, setHeaders] = useState('Accept: application/json');
  const [body, setBody] = useState('');
  const [res, setRes] = useState<Response_ | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const spec = { method, url, headers, body };
  const curl = useMemo(() => {
    try {
      return { ok: true as const, value: toCurl({ method, url, headers, body }) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [method, url, headers, body]);

  const onSend = async () => {
    setBusy(true);
    setError(null);
    setRes(null);
    try {
      setRes(await send(spec));
    } catch (e) {
      const msg = (e as Error).message;
      setError(/fetch|network/i.test(msg) ? `${msg}. The server may not allow cross-origin requests (CORS), or you are offline. Use the curl command instead.` : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ToolHeader slug="http">
        <p className="notice" role="note">
          <strong>Network:</strong> nothing is sent until you press <em>Send request</em>. Then your browser sends this request directly to
          the URL you entered — no proxy, no third party. Cookies are not included.
        </p>
      </ToolHeader>
      <Row>
        <Select label="Method" value={method} onChange={setMethod} options={methods.map((m) => [m, m] as const)} />
        <Input label="URL" type="url" value={url} onChange={setUrl} mono />
      </Row>
      <TextArea label="Headers (one “Name: value” per line)" value={headers} onChange={setHeaders} rows={4} />
      {method !== 'GET' && method !== 'HEAD' && <TextArea label="Body" value={body} onChange={setBody} rows={6} />}
      <ErrorLine error={curl.ok ? null : curl.error} />
      <Output label="curl command" value={curl.ok ? curl.value : ''} rows={3} />
      <button type="button" className="btn primary" disabled={!curl.ok || busy} onClick={onSend}>
        {busy ? 'Sending…' : 'Send request (leaves the browser)'}
      </button>
      <ErrorLine error={error} />
      {res && (
        <>
          <p className={`badge ${res.status < 400 ? 'ok' : 'bad'}`} role="status">
            {res.status} {res.statusText} · {res.ms} ms
          </p>
          <Output label="Response headers (only CORS-exposed ones are visible)" value={res.headers.map(([k, v]) => `${k}: ${v}`).join('\n')} rows={5} />
          <Output label="Response body" value={res.body} rows={12} />
        </>
      )}
    </>
  );
}
