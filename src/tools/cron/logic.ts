// Standard 5-field cron (Vixie/K8s CronJob): minute hour day-of-month month day-of-week.

interface Spec {
  name: string;
  min: number;
  max: number;
  names?: string[];
}

const specs: Spec[] = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'day-of-month', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12, names: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] },
  { name: 'day-of-week', min: 0, max: 7, names: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
];

const macros: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

export interface Field {
  raw: string;
  values: number[];
  star: boolean; // unrestricted ("*" or "*/1")
}

export interface Cron {
  expr: string;
  fields: Field[];
}

function value(token: string, spec: Spec): number {
  const named = spec.names?.indexOf(token.toLowerCase()) ?? -1;
  const n = named >= 0 ? named + (spec.name === 'month' ? 1 : 0) : /^\d+$/.test(token) ? Number(token) : NaN;
  if (Number.isNaN(n) || n < spec.min || n > spec.max) throw new Error(`${spec.name}: "${token}" is not in ${spec.min}-${spec.max}`);
  return n;
}

function parseField(raw: string, spec: Spec): Field {
  if (raw === '?') throw new Error(`${spec.name}: "?" is Quartz syntax; standard cron uses "*"`);
  const set = new Set<number>();
  for (const part of raw.split(',')) {
    const [range, stepText] = part.split('/');
    const step = stepText === undefined ? 1 : Number(stepText);
    if (!Number.isInteger(step) || step < 1) throw new Error(`${spec.name}: bad step "${stepText}"`);
    let lo: number;
    let hi: number;
    if (range === '*') [lo, hi] = [spec.min, spec.max];
    else if (range.includes('-')) {
      const [a, b] = range.split('-');
      [lo, hi] = [value(a, spec), value(b, spec)];
      if (lo > hi) throw new Error(`${spec.name}: range ${range} is backwards`);
    } else {
      lo = value(range, spec);
      hi = stepText === undefined ? lo : spec.max;
    }
    for (let v = lo; v <= hi; v += step) set.add(spec.name === 'day-of-week' && v === 7 ? 0 : v);
  }
  const values = [...set].sort((a, b) => a - b);
  const full = spec.name === 'day-of-week' ? 7 : spec.max - spec.min + 1;
  return { raw, values, star: raw.startsWith('*') && values.length === full };
}

export function parseCron(expr: string): Cron {
  const trimmed = expr.trim();
  const expanded = macros[trimmed.toLowerCase()] ?? trimmed;
  if (trimmed.toLowerCase() === '@reboot') throw new Error('@reboot runs at startup and has no schedule');
  const parts = expanded.split(/\s+/);
  if (parts.length === 6) throw new Error('6 fields: this looks like a seconds-first (Quartz/Spring) expression; standard cron has 5');
  if (parts.length !== 5) throw new Error(`Expected 5 fields, found ${parts.length}`);
  return { expr: expanded, fields: parts.map((p, i) => parseField(p, specs[i])) };
}

/** Vixie cron: if both day fields are restricted, a day matches when EITHER matches. */
function dayMatches(c: Cron, dom: number, dow: number): boolean {
  const [, , d, , w] = c.fields;
  if (d.star && w.star) return true;
  if (d.star) return w.values.includes(dow);
  if (w.star) return d.values.includes(dom);
  return d.values.includes(dom) || w.values.includes(dow);
}

/** Next n run times strictly after `from`, evaluated in UTC or the local zone. */
export function nextRuns(c: Cron, from: Date, n: number, utc = true): Date[] {
  const [mi, h, , mo] = c.fields;
  const d = new Date(from.getTime());
  const get = (k: 'Minutes' | 'Hours' | 'Date' | 'Month' | 'Day' | 'FullYear') => (d[`get${utc ? 'UTC' : ''}${k}`] as () => number).call(d);
  const set = (k: 'Minutes' | 'Hours' | 'Date', v: number) => (d[`set${utc ? 'UTC' : ''}${k}`] as (v: number) => number).call(d, v);
  d.setUTCSeconds(0, 0);
  set('Minutes', get('Minutes') + 1);
  const out: Date[] = [];
  const limit = from.getTime() + 10 * 366 * 86400000; // enough for Feb 29 schedules
  while (out.length < n && d.getTime() < limit) {
    if (!mo.values.includes(get('Month') + 1)) {
      set('Date', 1);
      set('Hours', 0);
      set('Minutes', 0);
      (d[`set${utc ? 'UTC' : ''}Month`] as (v: number) => number).call(d, get('Month') + 1);
    } else if (!dayMatches(c, get('Date'), get('Day'))) {
      set('Hours', 0);
      set('Minutes', 0);
      set('Date', get('Date') + 1);
    } else if (!h.values.includes(get('Hours'))) {
      set('Minutes', 0);
      set('Hours', get('Hours') + 1);
    } else if (!mi.values.includes(get('Minutes'))) {
      set('Minutes', get('Minutes') + 1);
    } else {
      out.push(new Date(d.getTime()));
      set('Minutes', get('Minutes') + 1);
    }
  }
  return out;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n: number) => String(n).padStart(2, '0');

function list(f: Field, fmt: (n: number) => string): string {
  const step = /^\*\/(\d+)$/.exec(f.raw);
  if (step) return `every ${step[1]}`;
  const v = f.values;
  if (v.length > 2 && v.every((x, i) => i === 0 || x === v[i - 1] + 1)) return `${fmt(v[0])} through ${fmt(v[v.length - 1])}`;
  return v.map(fmt).join(', ');
}

export function explain(c: Cron): string {
  const [mi, h, d, mo, w] = c.fields;
  let time: string;
  if (mi.values.length === 1 && h.values.length === 1) time = `At ${pad(h.values[0])}:${pad(mi.values[0])}`;
  else if (mi.values.length === 1 && h.star) time = `At minute ${mi.values[0]} past every hour`;
  else if (mi.star && h.star) time = 'Every minute';
  else {
    const m = mi.star ? 'every minute' : /^\*\/\d+$/.test(mi.raw) ? `${list(mi, String)} minutes` : `at minute ${list(mi, String)}`;
    time = `${m[0].toUpperCase()}${m.slice(1)}${h.star ? '' : `, during hour ${list(h, pad)}`}`;
  }
  const parts = [time];
  if (!d.star) parts.push(`on day-of-month ${list(d, String)}`);
  if (!w.star) parts.push(`${d.star ? 'on' : 'or on'} ${list(w, (n) => dayNames[n])}`);
  if (!mo.star) parts.push(`in ${list(mo, (n) => monthNames[n])}`);
  return parts.join(' ');
}

/** systemd OnCalendar= equivalent. Warns where systemd semantics differ. */
export function toOnCalendar(c: Cron): { value: string; warning?: string } {
  const [mi, h, d, mo, w] = c.fields;
  const conv = (f: Field, fmt: (n: number) => string) => {
    if (f.star) return '*';
    const step = /^\*\/(\d+)$/.exec(f.raw);
    if (step) return `${fmt(specs[c.fields.indexOf(f)].min)}/${step[1]}`;
    return f.values.map(fmt).join(',');
  };
  const dow = w.star ? '' : w.values.map((n) => dayNames[n].slice(0, 3)).join(',') + ' ';
  const value = `${dow}*-${conv(mo, pad)}-${conv(d, pad)} ${conv(h, pad)}:${conv(mi, pad)}:00`;
  return !d.star && !w.star
    ? { value, warning: 'cron matches day-of-month OR day-of-week; systemd requires both. Use two OnCalendar= lines to keep cron semantics.' }
    : { value };
}

export function toCronJob(c: Cron, name: string, timeZone: string): string {
  return `apiVersion: batch/v1
kind: CronJob
metadata:
  name: ${name}
spec:
  schedule: "${c.expr}"
  timeZone: "${timeZone}"
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 300
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: ${name}
              image: busybox:1.36
              command: ["sh", "-c", "date"]
`;
}
