import { describe, expect, it } from 'vitest';
import { explain, nextRuns, parseCron, toCronJob, toOnCalendar } from './logic';

const runs = (expr: string, from: string, n = 3) => nextRuns(parseCron(expr), new Date(from), n).map((d) => d.toISOString().slice(0, 16));

describe('cron parsing', () => {
  it('expands lists, ranges, steps, names and macros', () => {
    const c = parseCron('*/15 9-17 * jan,JUL mon-fri');
    expect(c.fields[0].values).toEqual([0, 15, 30, 45]);
    expect(c.fields[1].values).toHaveLength(9);
    expect(c.fields[3].values).toEqual([1, 7]);
    expect(c.fields[4].values).toEqual([1, 2, 3, 4, 5]);
    expect(parseCron('@daily').expr).toBe('0 0 * * *');
    expect(parseCron('0 0 * * 7').fields[4].values).toEqual([0]);
    expect(parseCron('5/20 * * * *').fields[0].values).toEqual([5, 25, 45]);
  });
  it('explains what is wrong with bad expressions', () => {
    expect(() => parseCron('0 0 * *')).toThrow(/5 fields/);
    expect(() => parseCron('0 0 0 * * ?')).toThrow(/Quartz/);
    expect(() => parseCron('60 * * * *')).toThrow(/minute/);
    expect(() => parseCron('0 0 ? * *')).toThrow(/Quartz/);
    expect(() => parseCron('0 5-1 * * *')).toThrow(/backwards/);
    expect(() => parseCron('@reboot')).toThrow(/startup/);
  });
});

describe('next runs (UTC)', () => {
  it('every 15 minutes', () => {
    expect(runs('*/15 * * * *', '2024-01-01T10:07:30Z')).toEqual(['2024-01-01T10:15', '2024-01-01T10:30', '2024-01-01T10:45']);
  });
  it('weekdays at 09:30, skipping the weekend', () => {
    expect(runs('30 9 * * 1-5', '2024-01-05T10:00:00Z')).toEqual(['2024-01-08T09:30', '2024-01-09T09:30', '2024-01-10T09:30']);
  });
  it('leap day only', () => {
    expect(runs('0 0 29 2 *', '2024-03-01T00:00:00Z', 2)).toEqual(['2028-02-29T00:00', '2032-02-29T00:00']);
  });
  it('day-of-month OR day-of-week when both are set (Vixie semantics)', () => {
    // 1st of the month OR any Friday. 2024-03-01 is a Friday; next Fridays are 8th, 15th.
    expect(runs('0 12 1 * 5', '2024-02-27T00:00:00Z', 4)).toEqual(['2024-03-01T12:00', '2024-03-08T12:00', '2024-03-15T12:00', '2024-03-22T12:00']);
  });
  it('is strictly after the start time', () => {
    expect(runs('0 * * * *', '2024-01-01T10:00:00Z', 1)).toEqual(['2024-01-01T11:00']);
  });
});

describe('explain and convert', () => {
  it('explains in English', () => {
    expect(explain(parseCron('30 9 * * 1-5'))).toBe('At 09:30 on Monday through Friday');
    expect(explain(parseCron('*/15 * * * *'))).toBe('Every 15 minutes');
    expect(explain(parseCron('0 * * * *'))).toBe('At minute 0 past every hour');
    expect(explain(parseCron('0 0 1 1 *'))).toBe('At 00:00 on day-of-month 1 in January');
  });
  it('converts to systemd OnCalendar', () => {
    expect(toOnCalendar(parseCron('30 9 * * 1-5'))).toEqual({ value: 'Mon,Tue,Wed,Thu,Fri *-*-* 09:30:00' });
    expect(toOnCalendar(parseCron('*/15 * * * *')).value).toBe('*-*-* *:00/15:00');
    expect(toOnCalendar(parseCron('0 12 1 * 5')).warning).toMatch(/OR/);
  });
  it('emits a CronJob with the schedule and time zone', () => {
    const y = toCronJob(parseCron('@hourly'), 'report', 'Etc/UTC');
    expect(y).toContain('schedule: "0 * * * *"');
    expect(y).toContain('timeZone: "Etc/UTC"');
  });
});
