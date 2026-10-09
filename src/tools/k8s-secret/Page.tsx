import { useMemo, useState } from 'react';
import { ErrorLine, Input, Output, Row, Select, TextArea, ToolHeader } from '../../components/ui';
import { decodeSecret, encodeSecret, parseEnv, toEnv } from './logic';

const types = [
  ['Opaque', 'Opaque'],
  ['kubernetes.io/basic-auth', 'kubernetes.io/basic-auth'],
  ['kubernetes.io/tls', 'kubernetes.io/tls'],
  ['kubernetes.io/dockerconfigjson', 'kubernetes.io/dockerconfigjson'],
] as const;

export default function K8sSecretPage() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [name, setName] = useState('app-config');
  const [namespace, setNamespace] = useState('default');
  const [type, setType] = useState<(typeof types)[number][0]>('Opaque');
  const [env, setEnv] = useState('DB_USER=app\nDB_PASSWORD="correct horse battery staple"\nREGION=eu-west-1\n');
  const [manifest, setManifest] = useState('');

  const encoded = useMemo(() => {
    try {
      return { ok: true as const, value: encodeSecret({ name, namespace, type, pairs: parseEnv(env) }) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [name, namespace, type, env]);
  const decoded = useMemo(() => {
    if (!manifest.trim()) return null;
    try {
      return { ok: true as const, value: decodeSecret(manifest) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [manifest]);

  return (
    <>
      <ToolHeader slug="k8s-secret">
        <p className="hint">Base64 is encoding, not encryption: anyone who can read the Secret can read the values. Do not commit the output; use Sealed Secrets, SOPS or an external secret store.</p>
      </ToolHeader>
      <Select label="Mode" value={mode} onChange={setMode} options={[['encode', 'KEY=value → Secret'], ['decode', 'Secret → KEY=value']]} />
      {mode === 'encode' ? (
        <>
          <Row>
            <Input label="Name" value={name} onChange={setName} mono />
            <Input label="Namespace (optional)" value={namespace} onChange={setNamespace} mono />
            <Select label="Type" value={type} onChange={setType} options={types} />
          </Row>
          <div className="split">
            <TextArea label="KEY=value pairs (.env format)" value={env} onChange={setEnv} rows={12} />
            <Output label="Secret manifest" value={encoded.ok ? encoded.value : ''} rows={12} />
          </div>
          <ErrorLine error={encoded.ok ? null : encoded.error} />
        </>
      ) : (
        <>
          <TextArea label="Secret manifest (YAML or JSON, e.g. kubectl get secret -o yaml)" value={manifest} onChange={setManifest} rows={12} />
          {decoded && !decoded.ok && <ErrorLine error={decoded.error} />}
          {decoded?.ok && (
            <>
              <p className="hint">
                {decoded.value.pairs.length} key(s){decoded.value.name ? ` in ${decoded.value.namespace ?? 'default'}/${decoded.value.name}` : ''}
              </p>
              <Output label="Decoded values (.env format)" value={toEnv(decoded.value.pairs)} rows={10} />
            </>
          )}
        </>
      )}
    </>
  );
}
