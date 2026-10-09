import { describe as group, expect, it } from 'vitest';
import { contains, describe, formatIp, overlaps, parseCidr, split } from './logic';

group('IPv4', () => {
  it('describes a /24', () => {
    expect(describe(parseCidr('10.0.1.77/24'))).toEqual({
      cidr: '10.0.1.0/24',
      network: '10.0.1.0',
      broadcast: '10.0.1.255',
      netmask: '255.255.255.0',
      wildcard: '0.0.0.255',
      firstHost: '10.0.1.1',
      lastHost: '10.0.1.254',
      totalAddresses: '256',
      usableHosts: '254',
    });
  });
  it('handles /31, /32 and /0', () => {
    expect(describe(parseCidr('10.0.0.0/31'))).toMatchObject({ usableHosts: '2', broadcast: 'n/a', firstHost: '10.0.0.0' });
    expect(describe(parseCidr('10.0.0.9/32'))).toMatchObject({ usableHosts: '1', firstHost: '10.0.0.9' });
    expect(describe(parseCidr('0.0.0.0/0'))).toMatchObject({ totalAddresses: '4,294,967,296', netmask: '0.0.0.0' });
  });
  it('rejects bad input', () => {
    for (const bad of ['10.0.0/24', '10.0.0.256/24', '10.0.0.1/33', '10.0.0.01/8', 'abc', '10.0.0.0/24/1']) {
      expect(() => parseCidr(bad), bad).toThrow();
    }
  });
});

group('IPv6', () => {
  it('parses, normalises and counts', () => {
    const d = describe(parseCidr('2001:DB8:0:0:1::1/64'));
    expect(d).toMatchObject({ network: '2001:db8::', lastHost: '2001:db8::ffff:ffff:ffff:ffff', totalAddresses: '18,446,744,073,709,551,616' });
    expect(formatIp(parseCidr('::1').network, 6)).toBe('::1');
    expect(formatIp(parseCidr('fe80::').network, 6)).toBe('fe80::');
    expect(formatIp(parseCidr('2001:db8:0:1:0:0:0:1').network, 6)).toBe('2001:db8:0:1::1');
    expect(formatIp(parseCidr('::ffff:192.0.2.1').network, 6)).toBe('::ffff:c000:201');
  });
  it('rejects bad input', () => {
    for (const bad of ['1::2::3', '12345::', '1:2:3:4:5:6:7', '1:2:3:4:5:6:7:8:9', 'g::1']) expect(() => parseCidr(bad), bad).toThrow();
  });
});

group('overlap, contains and split', () => {
  it('detects overlaps (e.g. pod CIDR vs VPC)', () => {
    expect(overlaps(parseCidr('10.0.0.0/16'), parseCidr('10.0.128.0/17'))).toBe(true);
    expect(overlaps(parseCidr('10.0.0.0/17'), parseCidr('10.0.128.0/17'))).toBe(false);
    expect(overlaps(parseCidr('10.0.0.0/8'), parseCidr('::/0'))).toBe(false);
    expect(contains(parseCidr('10.0.0.0/8'), parseCidr('10.1.2.0/24'))).toBe(true);
    expect(contains(parseCidr('10.1.2.0/24'), parseCidr('10.0.0.0/8'))).toBe(false);
  });
  it('splits into subnets', () => {
    expect(split(parseCidr('10.0.0.0/22'), 24)).toEqual({ subnets: ['10.0.0.0/24', '10.0.1.0/24', '10.0.2.0/24', '10.0.3.0/24'], total: 4n });
    expect(split(parseCidr('10.0.0.0/8'), 24).subnets).toHaveLength(256);
    expect(() => split(parseCidr('10.0.0.0/24'), 16)).toThrow();
  });
});
