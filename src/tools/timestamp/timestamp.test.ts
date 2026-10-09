import { describe, expect, it } from 'vitest';
import { formatIn, formats, isValidZone, parseTimestamp } from './logic';

const iso = (s: string) => {
  const p = parseTimestamp(s);
  return p.ok ? [p.date.toISOString(), p.detected] : [p.error];
};

describe('timestamp', () => {
  it('detects epoch units by magnitude', () => {
    expect(iso('1700000000')).toEqual(['2023-11-14T22:13:20.000Z', 'Unix seconds']);
    expect(iso('1700000000123')).toEqual(['2023-11-14T22:13:20.123Z', 'Unix milliseconds']);
    expect(iso('1700000000123456')).toEqual(['2023-11-14T22:13:20.123Z', 'Unix microseconds']);
    expect(iso('1700000000123456789')).toEqual(['2023-11-14T22:13:20.123Z', 'Unix nanoseconds']);
    expect(iso('0')).toEqual(['1970-01-01T00:00:00.000Z', 'Unix seconds']);
  });
  it('parses ISO 8601 and RFC 2822', () => {
    expect(iso('2024-02-29T12:00:00+02:00')[0]).toBe('2024-02-29T10:00:00.000Z');
    expect(iso('Tue, 14 Nov 2023 22:13:20 GMT')[0]).toBe('2023-11-14T22:13:20.000Z');
    expect(iso('2024-01-01T00:00:00')[1]).toMatch(/without zone/);
    expect(parseTimestamp('yesterday-ish').ok).toBe(false);
  });
  it('formats in other zones, including DST', () => {
    const d = new Date('2024-07-01T12:00:00Z');
    expect(formatIn(d, 'UTC')).toBe('2024-07-01 12:00:00 UTC+00:00');
    expect(formatIn(d, 'America/New_York')).toBe('2024-07-01 08:00:00 UTC-04:00');
    expect(formatIn(new Date('2024-01-01T12:00:00Z'), 'America/New_York')).toBe('2024-01-01 07:00:00 UTC-05:00');
    expect(formatIn(d, 'Asia/Kolkata')).toBe('2024-07-01 17:30:00 UTC+05:30');
    expect(isValidZone('Mars/Olympus')).toBe(false);
  });
  it('lists the standard formats', () => {
    expect(Object.fromEntries(formats(new Date(1700000000000)))).toMatchObject({
      'Unix seconds': '1700000000',
      'RFC 2822 / HTTP date': 'Tue, 14 Nov 2023 22:13:20 GMT',
    });
  });
});
