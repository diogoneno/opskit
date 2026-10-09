const MIN = 60;
const HOUR = 3600;
const DAY = 86400;

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '∞';
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  const parts: string[] = [];
  let s = Math.round(seconds);
  for (const [unit, size] of [['d', DAY], ['h', HOUR], ['m', MIN], ['s', 1]] as const) {
    if (s >= size) {
      parts.push(`${Math.floor(s / size)}${unit}`);
      s %= size;
    }
  }
  return parts.slice(0, 2).join(' ') || '0s';
}

export function validateSlo(slo: number) {
  if (!(slo > 0 && slo < 100)) throw new Error('SLO must be between 0 and 100 (exclusive)');
}

/** Allowed "bad" time for an availability SLO over common periods. */
export function errorBudget(slo: number, windowDays: number) {
  validateSlo(slo);
  const bad = 1 - slo / 100;
  return {
    budgetFraction: bad,
    perWindow: bad * windowDays * DAY,
    periods: [
      ['Per day', bad * DAY],
      ['Per week', bad * 7 * DAY],
      [`Per ${windowDays}-day window`, bad * windowDays * DAY],
      ['Per quarter (91 d)', bad * 91 * DAY],
      ['Per year (365 d)', bad * 365 * DAY],
    ] as [string, number][],
  };
}

/** Burn rate = observed error rate / allowed error rate. 1 means the budget lasts exactly the window. */
export function burnRate(slo: number, errorRatePercent: number, windowDays: number) {
  validateSlo(slo);
  const rate = errorRatePercent / (100 - slo);
  return { rate, exhaustsIn: rate > 0 ? (windowDays * DAY) / rate : Infinity };
}

/** Requests you can fail in the window given expected traffic. */
export const allowedFailures = (slo: number, requests: number) => Math.floor(requests * (1 - slo / 100) + 1e-9);

/** Multi-window, multi-burn-rate alerts (Google SRE Workbook, ch. 5), scaled to the window. */
export function alertThresholds(slo: number, windowDays: number) {
  validateSlo(slo);
  const rows = [
    { severity: 'page', long: '1h', short: '5m', longH: 1, budget: 0.02 },
    { severity: 'page', long: '6h', short: '30m', longH: 6, budget: 0.05 },
    { severity: 'ticket', long: '3d', short: '6h', longH: 72, budget: 0.1 },
  ];
  return rows.map((r) => {
    const rate = (r.budget * windowDays * 24) / r.longH;
    return { ...r, burnRate: Math.round(rate * 100) / 100, errorRateThreshold: (rate * (100 - slo)) / 100 };
  });
}

export function promRule(slo: number, windowDays: number, metric: string): string {
  const [fast] = alertThresholds(slo, windowDays);
  const ratio = (w: string) =>
    `sum(rate(${metric}{code=~"5.."}[${w}])) / sum(rate(${metric}[${w}]))`;
  return `- alert: ErrorBudgetFastBurn
  expr: |
    ${ratio(fast.long)} > ${fast.errorRateThreshold.toPrecision(4)}
    and
    ${ratio(fast.short)} > ${fast.errorRateThreshold.toPrecision(4)}
  labels:
    severity: page
  annotations:
    summary: "Burning ${fast.budget * 100}% of the ${windowDays}d error budget in ${fast.long} (burn rate ${fast.burnRate}x)"`;
}
