import { useMemo, useState } from 'react';
import { Checkbox, ErrorLine, Output, Row, Select, TextArea, ToolHeader } from '../../components/ui';
import { jsonToYaml, yamlToJson } from './logic';

const example = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: api
          image: ghcr.io/example/api:1.4.2
          ports:
            - containerPort: 8080
`;

export default function YamlJsonPage() {
  const [direction, setDirection] = useState<'y2j' | 'j2y'>('y2j');
  const [input, setInput] = useState(example);
  const [multiDoc, setMultiDoc] = useState(true);
  const result = useMemo(
    () => (direction === 'y2j' ? yamlToJson(input) : jsonToYaml(input, multiDoc)),
    [direction, input, multiDoc],
  );
  const swap = () => {
    if (result.ok) setInput(result.output);
    setDirection(direction === 'y2j' ? 'j2y' : 'y2j');
  };

  return (
    <>
      <ToolHeader slug="yaml-json" />
      <Row>
        <Select
          label="Direction"
          value={direction}
          onChange={setDirection}
          options={[
            ['y2j', 'YAML → JSON'],
            ['j2y', 'JSON → YAML'],
          ]}
        />
        {direction === 'j2y' && (
          <Checkbox label="Top-level array → multiple documents" checked={multiDoc} onChange={setMultiDoc} />
        )}
        <button type="button" className="btn" onClick={swap}>
          Swap
        </button>
      </Row>
      <div className="split">
        <TextArea label={direction === 'y2j' ? 'YAML input' : 'JSON input'} value={input} onChange={setInput} rows={18} />
        <Output label={direction === 'y2j' ? 'JSON output' : 'YAML output'} value={result.ok ? result.output : ''} rows={18} />
      </div>
      {result.ok ? (
        result.documents > 1 && <p className="hint">{result.documents} documents</p>
      ) : (
        <ErrorLine error={result.error} />
      )}
    </>
  );
}
