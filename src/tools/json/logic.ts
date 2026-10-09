export type Result = { ok: true; output: string } | { ok: false; error: string };

export interface FormatOptions {
  indent: number | 'tab' | 'minify';
  sortKeys: boolean;
}

export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as object)
        .sort()
        .map((k) => [k, sortKeysDeep((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

/**
 * Finds the offset of the first syntax error. JSON.parse messages differ between
 * engines and V8 no longer always reports a position, so we scan ourselves.
 */
export function errorOffset(text: string): number {
  let i = 0;
  const ws = () => {
    while (i < text.length && ' \t\n\r'.includes(text[i])) i++;
  };
  const fail = (): never => {
    throw i;
  };
  const lit = (word: string) => (text.startsWith(word, i) ? (i += word.length) : fail());
  const str = () => {
    i++;
    while (i < text.length && text[i] !== '"') {
      if (text[i] < ' ') fail();
      if (text[i] === '\\') {
        i++;
        if (text[i] === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 1, i + 5))) fail();
          i += 4;
        } else if (!'"\\/bfnrt'.includes(text[i] ?? '')) fail();
      }
      i++;
    }
    if (text[i] !== '"') fail();
    i++;
  };
  const num = () => {
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i));
    if (!m) fail();
    i += m![0].length;
  };
  const value = (): void => {
    ws();
    const c = text[i];
    if (c === '{') {
      i++;
      ws();
      if (text[i] === '}') return void i++;
      for (;;) {
        ws();
        if (text[i] !== '"') fail();
        str();
        ws();
        if (text[i] !== ':') fail();
        i++;
        value();
        ws();
        if (text[i] === ',') i++;
        else if (text[i] === '}') return void i++;
        else fail();
      }
    } else if (c === '[') {
      i++;
      ws();
      if (text[i] === ']') return void i++;
      for (;;) {
        value();
        ws();
        if (text[i] === ',') i++;
        else if (text[i] === ']') return void i++;
        else fail();
      }
    } else if (c === '"') str();
    else if (c === 't') lit('true');
    else if (c === 'f') lit('false');
    else if (c === 'n') lit('null');
    else num();
  };
  try {
    value();
    ws();
    return i < text.length ? i : -1;
  } catch (pos) {
    return typeof pos === 'number' ? pos : -1;
  }
}

export function lineCol(text: string, offset: number): { line: number; column: number } {
  const before = text.slice(0, offset);
  return { line: before.split('\n').length, column: offset - before.lastIndexOf('\n') };
}

/** Adds "line L, column C" to a JSON.parse error message. */
export function locate(text: string, message: string): string {
  const pos = errorOffset(text);
  if (pos < 0) return message;
  const { line, column } = lineCol(text, pos);
  const short = message.split('\n')[0].replace(/,\s*"[^"]*$/, '');
  return `${short} (line ${line}, column ${column})`;
}

export function formatJson(text: string, opts: FormatOptions): Result {
  if (!text.trim()) return { ok: true, output: '' };
  try {
    let value = JSON.parse(text);
    if (opts.sortKeys) value = sortKeysDeep(value);
    const space = opts.indent === 'minify' ? undefined : opts.indent === 'tab' ? '\t' : opts.indent;
    return { ok: true, output: JSON.stringify(value, null, space) };
  } catch (e) {
    return { ok: false, error: locate(text, (e as Error).message) };
  }
}
