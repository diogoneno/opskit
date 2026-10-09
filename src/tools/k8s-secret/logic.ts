import { parse, stringify } from 'yaml';
import { base64DecodeText, base64EncodeText } from '../../lib/bytes';

/** Parses KEY=value lines (.env style): comments, blank lines, `export`, and quotes. */
export function parseEnv(text: string): [string, string][] {
  const out: [string, string][] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const m = /^(?:export\s+)?([A-Za-z0-9_.-]+)\s*=\s*(.*)$/.exec(line);
    if (!m) throw new Error(`Line ${i + 1}: expected KEY=value`);
    let v = m[2];
    const q = v[0];
    if ((q === '"' || q === "'") && v.endsWith(q) && v.length >= 2) {
      v = v.slice(1, -1);
      if (q === '"') v = v.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    } else v = v.replace(/\s+#.*$/, '');
    out.push([m[1], v]);
  });
  return out;
}

const DNS1123 = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;
const KEY = /^[-._a-zA-Z0-9]+$/;

export interface SecretInput {
  name: string;
  namespace: string;
  type: string;
  pairs: [string, string][];
}

export function encodeSecret(s: SecretInput): string {
  if (!DNS1123.test(s.name) || s.name.length > 253) throw new Error('name must be a lowercase DNS-1123 subdomain');
  if (s.namespace && !/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(s.namespace)) throw new Error('namespace must be a DNS-1123 label');
  const data: Record<string, string> = {};
  for (const [k, v] of s.pairs) {
    if (!KEY.test(k)) throw new Error(`"${k}" is not a valid Secret key (allowed: letters, digits, - _ .)`);
    if (k in data) throw new Error(`Duplicate key "${k}"`);
    data[k] = base64EncodeText(v);
  }
  return stringify(
    {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name: s.name, ...(s.namespace ? { namespace: s.namespace } : {}) },
      type: s.type,
      data,
    },
    { version: '1.1' },
  );
}

/** Decodes a pasted Secret manifest (YAML or JSON; data and stringData). */
export function decodeSecret(text: string): { name?: string; namespace?: string; pairs: [string, string][] } {
  const doc = parse(text, { maxAliasCount: 50 }) as {
    kind?: string;
    metadata?: { name?: string; namespace?: string };
    data?: Record<string, string>;
    stringData?: Record<string, string>;
  } | null;
  if (!doc || typeof doc !== 'object') throw new Error('Not a YAML/JSON object');
  if (doc.kind && doc.kind !== 'Secret') throw new Error(`kind is ${doc.kind}, not Secret`);
  const pairs: [string, string][] = [];
  for (const [k, v] of Object.entries(doc.data ?? {})) {
    try {
      pairs.push([k, base64DecodeText(String(v))]);
    } catch (e) {
      throw new Error(`data.${k}: ${(e as Error).message}`, { cause: e });
    }
  }
  for (const [k, v] of Object.entries(doc.stringData ?? {})) pairs.push([k, String(v)]);
  return { name: doc.metadata?.name, namespace: doc.metadata?.namespace, pairs };
}

export const toEnv = (pairs: [string, string][]) =>
  pairs.map(([k, v]) => `${k}=${/[\s#"'\\]/.test(v) ? JSON.stringify(v) : v}`).join('\n');
