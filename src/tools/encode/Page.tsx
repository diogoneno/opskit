import { useMemo, useState } from 'react';
import { ErrorLine, Output, Row, Select, TextArea, ToolHeader } from '../../components/ui';
import { run, type Codec } from './logic';

export default function EncodePage() {
  const [codec, setCodec] = useState<Codec>('base64');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState('héllo wörld — 你好 🚀');
  const result = useMemo(() => run(input, codec, mode), [input, codec, mode]);
  const swap = () => {
    if (result.ok) setInput(result.output);
    setMode(mode === 'encode' ? 'decode' : 'encode');
  };

  return (
    <>
      <ToolHeader slug="encode" />
      <Row>
        <Select
          label="Format"
          value={codec}
          onChange={setCodec}
          options={[
            ['base64', 'Base64'],
            ['base64url', 'base64url (no padding)'],
            ['url', 'URL (percent-encoding)'],
            ['hex', 'Hex (UTF-8 bytes)'],
          ]}
        />
        <Select
          label="Mode"
          value={mode}
          onChange={setMode}
          options={[
            ['encode', 'Encode'],
            ['decode', 'Decode'],
          ]}
        />
        <button type="button" className="btn" onClick={swap}>
          Swap
        </button>
      </Row>
      <div className="split">
        <TextArea label="Input" value={input} onChange={setInput} rows={10} />
        <Output label="Output" value={result.ok ? result.output : ''} rows={10} />
      </div>
      {!result.ok && <ErrorLine error={result.error} />}
      <p className="hint">Text is converted to UTF-8 bytes first, so any language and emoji round-trip. Base64 decoding accepts both alphabets, with or without padding.</p>
    </>
  );
}
