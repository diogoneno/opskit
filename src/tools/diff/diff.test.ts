import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LineDiffView } from './DiffView';
import { lineDiff, stats, unifiedPatch, wordDiff } from './logic';

// The original DiffTool's JSON highlighter, copied verbatim. Its output went to dangerouslySetInnerHTML.
const oldHighlight = (content: string) =>
  content
    .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
    .replace(/:\s*"([^"]*)"/g, ': <span class="json-string">"$1"</span>')
    .replace(/:\s*(\d+)/g, ': <span class="json-number">$1</span>')
    .replace(/:\s*(true|false|null)/g, ': <span class="json-keyword">$1</span>');

// The duplicate CodeDiff tool, copied verbatim: compares line i to line i.
function oldIndexDiff(original: string, modified: string) {
  const origLines = original.split('\n');
  const modLines = modified.split('\n');
  const result: { type: string; content: string }[] = [];
  for (let i = 0; i < Math.max(origLines.length, modLines.length); i++) {
    const o = origLines[i] || '';
    const m = modLines[i] || '';
    if (o === m) result.push({ type: 'unchanged', content: o });
    else if (o && !m) result.push({ type: 'removed', content: o });
    else if (!o && m) result.push({ type: 'added', content: m });
    else result.push({ type: 'removed', content: o }, { type: 'added', content: m });
  }
  return result;
}

const payload = '{"name": "<img src=x onerror=alert(document.domain)>"}';

describe('diff (regression: XSS through dangerouslySetInnerHTML)', () => {
  it('OLD behaviour: user markup survives into the HTML string unescaped', () => {
    expect(oldHighlight(payload)).toContain('<img src=x onerror=alert(document.domain)>');
  });
  it('NEW behaviour: the rendered diff escapes it', () => {
    const rows = lineDiff('{}', payload, { ignoreWhitespace: false })!;
    const html = renderToStaticMarkup(createElement(LineDiffView, { rows }));
    expect(html).toContain('&lt;img src=x onerror=alert(document.domain)&gt;');
    expect(html).not.toContain('<img');
  });
});

describe('diff (regression: index-aligned duplicate)', () => {
  const a = 'a\nb\nc\nd';
  const b = 'x\na\nb\nc\nd';
  it('OLD behaviour: one inserted line marks every line as changed', () => {
    const r = oldIndexDiff(a, b);
    expect(r.filter((x) => x.type !== 'unchanged')).toHaveLength(9);
  });
  it('NEW behaviour: one insertion is one added line', () => {
    expect(stats(lineDiff(a, b, { ignoreWhitespace: false })!)).toEqual({ added: 1, removed: 0 });
  });
});

describe('diff features', () => {
  it('numbers lines on both sides', () => {
    const rows = lineDiff('a\nb\n', 'a\nc\n', { ignoreWhitespace: false })!;
    expect(rows).toEqual([
      { type: 'same', text: 'a', oldNo: 1, newNo: 1 },
      { type: 'removed', text: 'b', oldNo: 2 },
      { type: 'added', text: 'c', newNo: 2 },
    ]);
  });
  it('can ignore leading and trailing whitespace', () => {
    expect(stats(lineDiff('a\n', '  a  \n', { ignoreWhitespace: true })!)).toEqual({ added: 0, removed: 0 });
  });
  it('diffs words and produces a unified patch', () => {
    expect(wordDiff('memory: 256Mi', 'memory: 512Mi').filter((p) => p.type !== 'same').map((p) => p.text)).toEqual(['256Mi', '512Mi']);
    expect(unifiedPatch('a\n', 'b\n', { ignoreWhitespace: false })).toContain('-a\n+b');
  });
});
