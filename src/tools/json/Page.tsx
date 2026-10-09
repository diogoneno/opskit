import { useMemo, useState } from 'react';
import { ErrorLine, Output, Row, Select, TextArea, ToolHeader, Checkbox } from '../../components/ui';
import { formatJson, type FormatOptions } from './logic';

const example = '{"service":"api","replicas":3,"ports":[80,443],"labels":{"tier":"backend","app":"api"}}';

export default function JsonPage() {
  const [input, setInput] = useState(example);
  const [indent, setIndent] = useState<'2' | '4' | 'tab' | 'minify'>('2');
  const [sortKeys, setSortKeys] = useState(false);
  const result = useMemo(() => {
    const opts: FormatOptions = { indent: indent === '2' || indent === '4' ? Number(indent) : indent, sortKeys };
    return formatJson(input, opts);
  }, [input, indent, sortKeys]);

  return (
    <>
      <ToolHeader slug="json" />
      <Row>
        <Select
          label="Indentation"
          value={indent}
          onChange={setIndent}
          options={[
            ['2', '2 spaces'],
            ['4', '4 spaces'],
            ['tab', 'Tab'],
            ['minify', 'Minify'],
          ]}
        />
        <Checkbox label="Sort keys" checked={sortKeys} onChange={setSortKeys} />
      </Row>
      <div className="split">
        <TextArea label="JSON input" value={input} onChange={setInput} rows={16} />
        <Output label="Formatted output" value={result.ok ? result.output : ''} rows={16} />
      </div>
      {result.ok ? input.trim() && <p className="ok" role="status">Valid JSON</p> : <ErrorLine error={result.error} />}
    </>
  );
}
