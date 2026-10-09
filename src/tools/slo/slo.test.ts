import { describe, expect, it } from 'vitest';
import { alertThresholds, allowedFailures, burnRate, errorBudget, formatDuration, promRule } from './logic';

describe('SLO calculator', () => {
  it('computes the classic "nines" table', () => {
    const b = errorBudget(99.9, 30);
    expect(formatDuration(b.perWindow)).toBe('43m 12s');
    expect(formatDuration(b.periods[0][1])).toBe('1m 26s');
    expect(formatDuration(errorBudget(99.99, 30).perWindow)).toBe('4m 19s');
    expect(formatDuration(errorBudget(99, 365).periods[4][1])).toBe('3d 15h');
    expect(formatDuration(errorBudget(99.999, 30).periods[0][1])).toBe('864 ms');
  });
  it('computes burn rate and time to exhaustion', () => {
    const r = burnRate(99.9, 1.44, 30);
    expect(r.rate).toBeCloseTo(14.4);
    expect(formatDuration(r.exhaustsIn)).toBe('2d 2h');
    expect(burnRate(99.9, 0, 30).exhaustsIn).toBe(Infinity);
  });
  it('matches the SRE Workbook thresholds for a 30-day window', () => {
    expect(alertThresholds(99.9, 30).map((a) => a.burnRate)).toEqual([14.4, 6, 1]);
    expect(alertThresholds(99.9, 30)[0].errorRateThreshold).toBeCloseTo(0.0144);
  });
  it('counts allowed failures and emits a Prometheus rule', () => {
    expect(allowedFailures(99.9, 1_000_000)).toBe(1000);
    expect(promRule(99.9, 30, 'http_requests_total')).toContain('[1h])) > 0.01440');
  });
  it('rejects impossible SLOs', () => {
    expect(() => errorBudget(100, 30)).toThrow();
    expect(() => errorBudget(0, 30)).toThrow();
  });
});
