import { useMemo, useState } from 'react';
import { ErrorLine, Input, Output, Row, Select, ToolHeader } from '../../components/ui';
import { explain, nextRuns, parseCron, toCronJob, toOnCalendar } from './logic';

const samples = ['*/5 * * * *', '30 9 * * 1-5', '0 3 * * 0', '0 0 1 * *', '@hourly'];

export default function CronPage() {
  const [expr, setExpr] = useState('30 9 * * 1-5');
  const [zone, setZone] = useState<'utc' | 'local'>('utc');
  const [jobName, setJobName] = useState('nightly-report');
  const result = useMemo(() => {
    try {
      const c = parseCron(expr);
      return { ok: true as const, c, runs: nextRuns(c, new Date(), 10, zone === 'utc') };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [expr, zone]);
  const cal = result.ok ? toOnCalendar(result.c) : null;

  return (
    <>
      <ToolHeader slug="cron" />
      <Input label="Cron expression (minute hour day-of-month month day-of-week)" value={expr} onChange={setExpr} mono />
      <div className="chips" role="group" aria-label="Example expressions">
        {samples.map((s) => (
          <button key={s} type="button" className="chip" onClick={() => setExpr(s)}>
            {s}
          </button>
        ))}
      </div>
      <ErrorLine error={result.ok ? null : result.error} />
      {result.ok && cal && (
        <>
          <p className="explain" role="status">{explain(result.c)}</p>
          <Row>
            <Select label="Evaluate in" value={zone} onChange={setZone} options={[['utc', 'UTC (Kubernetes default)'], ['local', 'My local time zone']]} />
          </Row>
          <h2>Next 10 runs</h2>
          <ol className="mono runs">
            {result.runs.map((d) => (
              <li key={d.getTime()}>{zone === 'utc' ? d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : d.toString().slice(0, 24)}</li>
            ))}
          </ol>
          <h2>systemd timer</h2>
          <Output label="OnCalendar= value" value={`OnCalendar=${cal.value}`} rows={1} />
          {cal.warning && <p className="badge warn">{cal.warning}</p>}
          <h2>Kubernetes CronJob</h2>
          <Input label="CronJob name" value={jobName} onChange={setJobName} mono />
          <Output label="CronJob manifest" value={toCronJob(result.c, jobName || 'job', zone === 'utc' ? 'Etc/UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone)} rows={14} />
        </>
      )}
    </>
  );
}
