import { useMemo, useState } from 'react';
import { ErrorLine, Input, Output, Row, ToolHeader } from '../../components/ui';
import { alertThresholds, allowedFailures, burnRate, errorBudget, formatDuration, promRule } from './logic';

export default function SloPage() {
  const [slo, setSlo] = useState('99.9');
  const [windowDays, setWindowDays] = useState('30');
  const [errorRate, setErrorRate] = useState('0.5');
  const [requests, setRequests] = useState('10000000');
  const [metric, setMetric] = useState('http_requests_total');
  const s = Number(slo);
  const w = Math.max(1, Number(windowDays) || 30);

  const r = useMemo(() => {
    try {
      return { ok: true as const, budget: errorBudget(s, w), burn: burnRate(s, Number(errorRate), w), alerts: alertThresholds(s, w) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [s, w, errorRate]);

  return (
    <>
      <ToolHeader slug="slo" />
      <Row>
        <Input label="SLO target (%)" type="number" step="any" value={slo} onChange={setSlo} />
        <Input label="Window (days)" type="number" min={1} value={windowDays} onChange={setWindowDays} />
      </Row>
      <ErrorLine error={r.ok ? null : r.error} />
      {r.ok && (
        <>
          <div className="table-wrap">
            <table>
              <caption>Allowed downtime (error budget {(r.budget.budgetFraction * 100).toPrecision(3)}%)</caption>
              <tbody>
                {r.budget.periods.map(([k, v]) => (
                  <tr key={k}>
                    <th scope="row">{k}</th>
                    <td className="mono">{formatDuration(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Row>
            <Input label="Expected requests in window" type="number" min={0} value={requests} onChange={setRequests} />
          </Row>
          <p className="hint">You can fail {allowedFailures(s, Number(requests) || 0).toLocaleString('en-US')} requests in {w} days.</p>
          <h2>Burn rate</h2>
          <Input label="Current error rate (%)" type="number" step="any" min={0} value={errorRate} onChange={setErrorRate} />
          <p className={`badge ${r.burn.rate > 1 ? 'bad' : 'ok'}`} role="status">
            Burn rate {r.burn.rate.toFixed(2)}× — the whole {w}-day budget lasts {formatDuration(r.burn.exhaustsIn)}
          </p>
          <div className="table-wrap">
            <table>
              <caption>Multi-window burn-rate alerts (SRE Workbook)</caption>
              <thead>
                <tr>
                  <th scope="col">Severity</th>
                  <th scope="col">Long / short window</th>
                  <th scope="col">Budget spent</th>
                  <th scope="col">Burn rate</th>
                  <th scope="col">Error-rate threshold</th>
                </tr>
              </thead>
              <tbody>
                {r.alerts.map((a) => (
                  <tr key={a.long}>
                    <td>{a.severity}</td>
                    <td className="mono">{a.long} / {a.short}</td>
                    <td>{a.budget * 100}%</td>
                    <td>{a.burnRate}×</td>
                    <td className="mono">{(a.errorRateThreshold * 100).toPrecision(3)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Input label="Prometheus request counter" value={metric} onChange={setMetric} mono />
          <Output label="Fast-burn alert rule" value={promRule(s, w, metric || 'http_requests_total')} rows={10} />
        </>
      )}
    </>
  );
}
