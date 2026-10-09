import { useMemo, useState } from 'react';
import { Checkbox, CopyButton, Row as Bar, Select, TextArea, ToolHeader } from '../../components/ui';
import { LineDiffView, WordDiffView } from './DiffView';
import { lineDiff, stats, unifiedPatch, wordDiff } from './logic';

const left = `replicas: 2
image: api:1.4.1
resources:
  limits:
    memory: 256Mi
env:
  - LOG_LEVEL=info
`;
const right = `replicas: 3
image: api:1.4.2
resources:
  limits:
    memory: 512Mi
    cpu: 500m
env:
  - LOG_LEVEL=info
`;

export default function DiffPage() {
  const [a, setA] = useState(left);
  const [b, setB] = useState(right);
  const [mode, setMode] = useState<'lines' | 'words'>('lines');
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const opts = useMemo(() => ({ ignoreWhitespace }), [ignoreWhitespace]);
  const rows = useMemo(() => (mode === 'lines' ? lineDiff(a, b, opts) : null), [a, b, mode, opts]);
  const words = useMemo(() => (mode === 'words' ? wordDiff(a, b) : null), [a, b, mode]);
  const patch = useMemo(() => unifiedPatch(a, b, opts), [a, b, opts]);
  const s = rows ? stats(rows) : null;

  return (
    <>
      <ToolHeader slug="diff" />
      <div className="split">
        <TextArea label="Original" value={a} onChange={setA} rows={10} />
        <TextArea label="Changed" value={b} onChange={setB} rows={10} />
      </div>
      <Bar>
        <Select label="Granularity" value={mode} onChange={setMode} options={[['lines', 'Lines'], ['words', 'Words']]} />
        <Checkbox label="Ignore leading/trailing whitespace" checked={ignoreWhitespace} onChange={setIgnoreWhitespace} />
        <CopyButton value={patch} label="Copy unified patch" />
      </Bar>
      {s && <p className="hint" role="status">{s.added} added, {s.removed} removed</p>}
      {mode === 'lines' && rows === null && <p className="error" role="alert">Inputs too different to diff within 2 seconds.</p>}
      {rows && <LineDiffView rows={rows} />}
      {words && <WordDiffView parts={words} />}
    </>
  );
}
