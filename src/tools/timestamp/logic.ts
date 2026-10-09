export type Parsed = { ok: true; date: Date; detected: string } | { ok: false; error: string };

/** Accepts epoch s/ms/µs/ns (by magnitude), ISO 8601, RFC 2822 and "now". */
export function parseTimestamp(input: string, now = Date.now()): Parsed {
  const s = input.trim();
  if (!s) return { ok: false, error: 'Enter a timestamp' };
  if (/^now$/i.test(s)) return { ok: true, date: new Date(now), detected: 'now' };
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    const abs = Math.abs(n);
    const [ms, unit] =
      abs < 1e11 ? [n * 1000, 'Unix seconds'] : abs < 1e14 ? [n, 'Unix milliseconds'] : abs < 1e17 ? [n / 1e3, 'Unix microseconds'] : [n / 1e6, 'Unix nanoseconds'];
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? { ok: false, error: 'Out of range' } : { ok: true, date: d, detected: unit };
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return { ok: false, error: 'Not a recognised date (try ISO 8601, RFC 2822 or epoch seconds)' };
  const hasZone = /(z|[+-]\d{2}:?\d{2}|gmt|utc|[ecmp][sd]t)\s*$/i.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s);
  return { ok: true, date: d, detected: hasZone ? 'Date string' : 'Date string without zone (read as your local time)' };
}

export function formatIn(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'longOffset',
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  // ICU prints UTC as "GMT" or "GMT+0" depending on version; normalise to UTC±hh:mm.
  const off = /^GMT([+-]\d{2}:\d{2})$/.exec(p.timeZoneName)?.[1] ?? '+00:00';
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} UTC${off}`;
}

export const isValidZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export function formats(date: Date) {
  const ms = date.getTime();
  return [
    ['Unix seconds', String(Math.floor(ms / 1000))],
    ['Unix milliseconds', String(ms)],
    ['ISO 8601 (UTC)', date.toISOString()],
    ['RFC 2822 / HTTP date', date.toUTCString()],
    ['RFC 3339 (local offset)', rfc3339Local(date)],
  ] as const;
}

export function rfc3339Local(date: Date): string {
  const off = -date.getTimezoneOffset();
  const pad = (n: number) => String(Math.trunc(Math.abs(n))).padStart(2, '0');
  const local = new Date(date.getTime() + off * 60000).toISOString().slice(0, 19);
  return `${local}${off >= 0 ? '+' : '-'}${pad(off / 60)}:${pad(off % 60)}`;
}
