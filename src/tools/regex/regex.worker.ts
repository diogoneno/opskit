// Runs user regexes off the main thread so catastrophic backtracking cannot freeze the page.
import { runRegex } from './logic';

const ctx = self as unknown as { onmessage: (e: MessageEvent) => void; postMessage: (m: unknown) => void };
ctx.onmessage = (e: MessageEvent<{ pattern: string; flags: string; text: string }>) => {
  ctx.postMessage(runRegex(e.data.pattern, e.data.flags, e.data.text));
};
