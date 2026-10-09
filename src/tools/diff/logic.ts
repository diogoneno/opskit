import { createTwoFilesPatch, diffLines, diffWordsWithSpace } from 'diff';

export interface Row {
  type: 'added' | 'removed' | 'same';
  text: string;
  oldNo?: number;
  newNo?: number;
}

export interface Options {
  ignoreWhitespace: boolean;
}

const splitLines = (value: string) => {
  const lines = value.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
};

/** Line diff (Myers algorithm via jsdiff). Returns null if it exceeds the time budget. */
export function lineDiff(a: string, b: string, opts: Options, timeoutMs = 2000): Row[] | null {
  const changes = diffLines(a, b, { ignoreWhitespace: opts.ignoreWhitespace, stripTrailingCr: true, timeout: timeoutMs });
  if (!changes) return null;
  const rows: Row[] = [];
  let o = 1;
  let n = 1;
  for (const c of changes) {
    for (const text of splitLines(c.value)) {
      if (c.added) rows.push({ type: 'added', text, newNo: n++ });
      else if (c.removed) rows.push({ type: 'removed', text, oldNo: o++ });
      else rows.push({ type: 'same', text, oldNo: o++, newNo: n++ });
    }
  }
  return rows;
}

export const wordDiff = (a: string, b: string) =>
  diffWordsWithSpace(a, b).map((c) => ({ type: c.added ? 'added' : c.removed ? 'removed' : 'same', text: c.value }) as Row);

export const stats = (rows: Row[]) => ({
  added: rows.filter((r) => r.type === 'added').length,
  removed: rows.filter((r) => r.type === 'removed').length,
});

export const unifiedPatch = (a: string, b: string, opts: Options) =>
  createTwoFilesPatch('a/original', 'b/changed', a, b, undefined, undefined, { ignoreWhitespace: opts.ignoreWhitespace, context: 3 });
