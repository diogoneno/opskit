import { useMemo, useState } from 'react';
import { ErrorLine, Input, Output, ToolHeader } from '../../components/ui';
import { contains, describe, overlaps, parseCidr, split } from './logic';

const labels: Record<string, string> = {
  cidr: 'CIDR',
  network: 'Network address',
  broadcast: 'Broadcast',
  netmask: 'Netmask',
  wildcard: 'Wildcard (ACL) mask',
  firstHost: 'First usable',
  lastHost: 'Last usable',
  totalAddresses: 'Total addresses',
  usableHosts: 'Usable hosts',
};

function attempt<T>(f: () => T): { ok: true; value: T } | { ok: false; error: string } {
  try {
    return { ok: true, value: f() };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export default function CidrPage() {
  const [a, setA] = useState('10.0.0.0/16');
  const [b, setB] = useState('10.0.128.0/20');
  const [newPrefix, setNewPrefix] = useState('20');
  const na = useMemo(() => attempt(() => parseCidr(a)), [a]);
  const nb = useMemo(() => attempt(() => parseCidr(b)), [b]);
  const subnets = useMemo(() => (na.ok ? attempt(() => split(na.value, Number(newPrefix))) : null), [na, newPrefix]);

  return (
    <>
      <ToolHeader slug="cidr" />
      <Input label="CIDR (IPv4 or IPv6)" value={a} onChange={setA} mono />
      <ErrorLine error={na.ok ? null : na.error} />
      {na.ok && (
        <div className="table-wrap">
          <table>
            <caption>Network details</caption>
            <tbody>
              {Object.entries(describe(na.value)).map(([k, v]) => (
                <tr key={k}>
                  <th scope="row">{labels[k]}</th>
                  <td className="mono break">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h2>Overlap check</h2>
      <Input label="Second CIDR (e.g. pod or service CIDR)" value={b} onChange={setB} mono />
      <ErrorLine error={nb.ok ? null : nb.error} />
      {na.ok && nb.ok && (
        <p className={`badge ${overlaps(na.value, nb.value) ? 'bad' : 'ok'}`} role="status">
          {contains(na.value, nb.value)
            ? `${b} is inside ${a}`
            : contains(nb.value, na.value)
              ? `${a} is inside ${b}`
              : overlaps(na.value, nb.value)
                ? 'The ranges overlap'
                : 'No overlap'}
        </p>
      )}
      <h2>Split into subnets</h2>
      <Input label="New prefix length" type="number" min={0} max={128} value={newPrefix} onChange={setNewPrefix} />
      {subnets && !subnets.ok && <ErrorLine error={subnets.error} />}
      {subnets?.ok && (
        <Output
          label={`${subnets.value.total.toLocaleString('en-US')} subnets${subnets.value.total > 256n ? ' (first 256 shown)' : ''}`}
          value={subnets.value.subnets.join('\n')}
          rows={8}
        />
      )}
    </>
  );
}
