import { parseAllDocuments, stringify } from 'yaml';

export type Result = { ok: true; output: string; documents: number } | { ok: false; error: string };

/** YAML → JSON. A multi-document stream (---) becomes a JSON array. */
export function yamlToJson(text: string, indent = 2): Result {
  if (!text.trim()) return { ok: true, output: '', documents: 0 };
  const docs = parseAllDocuments(text);
  if (!Array.isArray(docs)) return { ok: true, output: '', documents: 0 };
  for (const d of docs) {
    if (d.errors.length) return { ok: false, error: d.errors[0].message };
  }
  let values: unknown[];
  try {
    values = docs.map((d) => d.toJS({ maxAliasCount: 100 }));
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const value = values.length === 1 ? values[0] : values;
  return { ok: true, output: JSON.stringify(value, null, indent), documents: values.length };
}

// Output is written for YAML 1.1 readers too (PyYAML, go-yaml v2), so strings such as
// "NO", "yes", "on" or "1.10" stay quoted instead of turning into booleans/numbers.
const toYaml = (v: unknown) => stringify(v, { version: '1.1' });

/** JSON → YAML. With multiDoc, a top-level array is written as one YAML document per item. */
export function jsonToYaml(text: string, multiDoc = false): Result {
  if (!text.trim()) return { ok: true, output: '', documents: 0 };
  try {
    const value = JSON.parse(text);
    if (multiDoc && Array.isArray(value)) {
      return { ok: true, output: value.map(toYaml).join('---\n'), documents: value.length };
    }
    return { ok: true, output: toYaml(value), documents: 1 };
  } catch (e) {
    return { ok: false, error: (e as Error).message.split('\n')[0] };
  }
}
