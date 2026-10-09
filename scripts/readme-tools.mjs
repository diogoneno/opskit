// Prints the README tool table from src/tools/registry.ts so the two never drift.
//   node scripts/readme-tools.mjs          print the table
//   node scripts/readme-tools.mjs --write  rewrite the table between the README markers
// Requires Node >= 22.18 (built-in TypeScript type stripping).
import { readFileSync, writeFileSync } from 'node:fs';
import { tools } from '../src/tools/registry.ts';
import { renderToolTable } from '../src/tools/readme-table.ts';

const table = renderToolTable(tools);
if (process.argv.includes('--write')) {
  const path = new URL('../README.md', import.meta.url);
  const readme = readFileSync(path, 'utf8');
  const re = /<!-- tools:start -->[\s\S]*?<!-- tools:end -->/;
  if (!re.test(readme)) throw new Error('README tool markers not found');
  writeFileSync(path, readme.replace(re, () => `<!-- tools:start -->\n${table}\n<!-- tools:end -->`));
  console.log(`README updated: ${tools.length} tools`);
} else {
  console.log(table);
}
