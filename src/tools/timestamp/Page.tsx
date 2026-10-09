import { useMemo, useState } from 'react';
import { CopyButton, ErrorLine, Input, ToolHeader } from '../../components/ui';
import { formatIn, formats, isValidZone, parseTimestamp } from './logic';

export default function TimestampPage() {
  const [input, setInput] = useState(() => String(Math.floor(Date.now() / 1000)));
  const [zones, setZones] = useState('UTC, America/New_York, Europe/London, Europe/Berlin, Asia/Kolkata, Asia/Tokyo');
  const parsed = useMemo(() => parseTimestamp(input), [input]);
  const zoneList = zones.split(',').map((z) => z.trim()).filter(Boolean);
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <>
      <ToolHeader slug="timestamp" />
      <Input label="Timestamp (epoch s/ms/µs/ns, ISO 8601, RFC 2822 or “now”)" value={input} onChange={setInput} mono />
      <button type="button" className="btn" onClick={() => setInput(String(Math.floor(Date.now() / 1000)))}>
        Now
      </button>
      <ErrorLine error={parsed.ok ? null : parsed.error} />
      {parsed.ok && (
        <>
          <p className="hint">Detected: {parsed.detected}</p>
          <div className="table-wrap">
            <table>
              <caption>Formats</caption>
              <tbody>
                {formats(parsed.date).map(([k, v]) => (
                  <tr key={k}>
                    <th scope="row">{k}</th>
                    <td className="mono">{v}</td>
                    <td><CopyButton value={v} label={`Copy ${k}`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Input label="Time zones (comma-separated IANA names)" value={zones} onChange={setZones} />
          <div className="table-wrap">
            <table>
              <caption>Side by side</caption>
              <tbody>
                {[local, ...zoneList.filter((z) => z !== local)].map((z) => (
                  <tr key={z}>
                    <th scope="row">{z === local ? `${z} (yours)` : z}</th>
                    <td className="mono">{isValidZone(z) ? formatIn(parsed.date, z) : 'unknown time zone'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
