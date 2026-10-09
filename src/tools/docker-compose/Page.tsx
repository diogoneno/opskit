import { useMemo, useState } from 'react';
import { ErrorLine, Output, TextArea, ToolHeader } from '../../components/ui';
import { dockerRunToCompose } from './logic';

const example = `docker run -d --name grafana -p 3000:3000 \\
  -e GF_SECURITY_ADMIN_USER=admin \\
  -v grafana-data:/var/lib/grafana \\
  --restart unless-stopped \\
  --health-cmd "wget -qO- http://127.0.0.1:3000/api/health || exit 1" \\
  grafana/grafana:11.2.0`;

export default function DockerComposePage() {
  const [cmd, setCmd] = useState(example);
  const result = useMemo(() => {
    try {
      return { ok: true as const, value: dockerRunToCompose(cmd) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [cmd]);

  return (
    <>
      <ToolHeader slug="docker-compose" />
      <div className="split">
        <TextArea label="docker run command" value={cmd} onChange={setCmd} rows={14} />
        <Output label="compose.yaml" value={result.ok ? result.value.yaml : ''} rows={14} />
      </div>
      <ErrorLine error={result.ok ? null : result.error} />
      {result.ok && result.value.notes.length > 0 && (
        <ul className="badge-list" aria-label="Conversion notes">
          {result.value.notes.map((n) => (
            <li key={n} className="badge warn">{n}</li>
          ))}
        </ul>
      )}
    </>
  );
}
