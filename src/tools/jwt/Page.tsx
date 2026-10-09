import { useMemo, useState } from 'react';
import { ErrorLine, Output, TextArea, ToolHeader } from '../../components/ui';
import { base64EncodeText } from '../../lib/bytes';
import { decodeJwt, relative } from './logic';

// An unsigned demo token built at load time (so no token-shaped literal sits in the source).
const now = Math.floor(Date.now() / 1000);
const example = [
  base64EncodeText(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'demo-key' }), true),
  base64EncodeText(
    JSON.stringify({ iss: 'https://auth.example.com', sub: 'user-42', name: 'José Ñúñez', aud: 'api', iat: now - 300, exp: now + 3300, scope: 'read:pods write:deployments' }),
    true,
  ),
  'c2lnbmF0dXJlLW5vdC12ZXJpZmllZA',
].join('.');

const statusText = {
  'valid-window': ['ok', 'Within its validity window (exp is in the future)'],
  expired: ['bad', 'Expired'],
  'not-yet-valid': ['bad', 'Not valid yet (nbf is in the future)'],
  'no-exp': ['warn', 'No exp claim: the token never expires'],
} as const;

export default function JwtPage() {
  const [token, setToken] = useState(example);
  const result = useMemo(() => decodeJwt(token), [token]);

  return (
    <>
      <ToolHeader slug="jwt" />
      <TextArea label="Token (a leading “Bearer ” is ignored)" value={token} onChange={setToken} rows={5} />
      <ErrorLine error={result.ok ? null : result.error} />
      {result.ok && (
        <>
          <p className={`badge ${statusText[result.value.status][0]}`} role="status">
            {statusText[result.value.status][1]}
          </p>
          {result.value.warnings.map((w) => (
            <p key={w} className="badge warn">
              {w}
            </p>
          ))}
          {result.value.times.length > 0 && (
            <div className="table-wrap">
              <table>
                <caption>Time claims</caption>
                <thead>
                  <tr>
                    <th scope="col">Claim</th>
                    <th scope="col">UTC</th>
                    <th scope="col">Local</th>
                    <th scope="col">Relative</th>
                  </tr>
                </thead>
                <tbody>
                  {result.value.times.map((t) => (
                    <tr key={t.claim}>
                      <th scope="row">{t.claim}</th>
                      <td className="mono">{t.utc}</td>
                      <td>{t.local}</td>
                      <td>{relative(t.seconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="split">
            <Output label="Header" value={JSON.stringify(result.value.header, null, 2)} rows={8} />
            <Output label="Payload" value={JSON.stringify(result.value.payload, null, 2)} rows={14} />
          </div>
          <p className="hint">The signature is shown but not verified: verification needs the issuer’s key.</p>
        </>
      )}
    </>
  );
}
