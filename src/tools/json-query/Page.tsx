import { useMemo, useState } from 'react';
import { Checkbox, ErrorLine, Input, Output, TextArea, ToolHeader } from '../../components/ui';
import { runQuery } from './logic';

const example = JSON.stringify(
  {
    items: [
      { metadata: { name: 'api-7f9c', namespace: 'prod' }, status: { phase: 'Running', restartCount: 0 } },
      { metadata: { name: 'worker-5d2a', namespace: 'prod' }, status: { phase: 'CrashLoopBackOff', restartCount: 14 } },
      { metadata: { name: 'cron-1b7e', namespace: 'batch' }, status: { phase: 'Succeeded', restartCount: 0 } },
    ],
  },
  null,
  2,
);

const samples = [
  "items[?status.phase != 'Running'].metadata.name",
  'items[].{name: metadata.name, restarts: status.restartCount}',
  'max_by(items, &status.restartCount).metadata.name',
  'length(items)',
];

export default function JsonQueryPage() {
  const [json, setJson] = useState(example);
  const [expr, setExpr] = useState(samples[0]);
  const [raw, setRaw] = useState(false);
  const result = useMemo(() => runQuery(json, expr, raw), [json, expr, raw]);

  return (
    <>
      <ToolHeader slug="json-query">
        <p className="hint">
          Uses JMESPath (the <code>aws --query</code> / <code>az --query</code> language), not jq syntax. Library:{' '}
          <code>jmespath</code>, runs entirely in the browser.
        </p>
      </ToolHeader>
      <Input label="JMESPath expression" value={expr} onChange={setExpr} mono />
      <div className="chips" role="group" aria-label="Example expressions">
        {samples.map((s) => (
          <button key={s} type="button" className="chip" onClick={() => setExpr(s)}>
            {s}
          </button>
        ))}
      </div>
      <Checkbox label="Raw output (like jq -r)" checked={raw} onChange={setRaw} />
      <div className="split">
        <TextArea label="JSON input" value={json} onChange={setJson} rows={18} />
        <Output label="Result" value={result.ok ? result.output : ''} rows={18} />
      </div>
      {!result.ok && <ErrorLine error={`${result.stage === 'json' ? 'JSON' : 'Expression'}: ${result.error}`} />}
    </>
  );
}
