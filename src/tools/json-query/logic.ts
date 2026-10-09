import { search } from 'jmespath';

export type Result = { ok: true; output: string } | { ok: false; error: string; stage: 'json' | 'query' };

/** Runs a JMESPath expression (https://jmespath.org) against a JSON document. */
export function runQuery(json: string, expression: string, raw = false): Result {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (e) {
    return { ok: false, stage: 'json', error: (e as Error).message.split('\n')[0] };
  }
  if (!expression.trim()) return { ok: true, output: JSON.stringify(data, null, 2) };
  try {
    const result: unknown = search(data as Parameters<typeof search>[0], expression);
    // "raw" mirrors `jq -r`: print strings and arrays of strings without quotes.
    if (raw && typeof result === 'string') return { ok: true, output: result };
    if (raw && Array.isArray(result) && result.every((r) => typeof r !== 'object' || r === null)) {
      return { ok: true, output: result.map(String).join('\n') };
    }
    return { ok: true, output: JSON.stringify(result, null, 2) };
  } catch (e) {
    return { ok: false, stage: 'query', error: (e as Error).message };
  }
}
