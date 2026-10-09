import { describe, expect, it } from 'vitest';
import readme from '../../README.md?raw';
import { renderToolTable } from '../tools/readme-table';
import { tools } from '../tools/registry';

describe('README tool table', () => {
  it('matches the registry (run `npm run readme:tools -- --write` to update)', () => {
    const block = /<!-- tools:start -->\n([\s\S]*?)\n<!-- tools:end -->/.exec(readme)?.[1];
    expect(block).toBe(renderToolTable(tools));
    expect(block!.split('\n')).toHaveLength(tools.length + 2);
  });
});
