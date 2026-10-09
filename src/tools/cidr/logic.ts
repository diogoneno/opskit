export interface Network {
  version: 4 | 6;
  prefix: number;
  network: bigint;
  last: bigint;
}

function parseV4(s: string): bigint {
  const parts = s.split('.');
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p) || Number(p) > 255 || (p.length > 1 && p[0] === '0')))
    throw new Error(`"${s}" is not an IPv4 address`);
  return parts.reduce((acc, p) => (acc << 8n) | BigInt(p), 0n);
}

function parseV6(s: string): bigint {
  // An embedded IPv4 tail (::ffff:192.0.2.1) is rewritten as two hex groups first.
  const text = s.replace(/(\d+\.\d+\.\d+\.\d+)$/, (v4) => {
    const n = parseV4(v4);
    return `${(n >> 16n).toString(16)}:${(n & 0xffffn).toString(16)}`;
  });
  const halves = text.split('::');
  if (halves.length > 2) throw new Error(`"${s}" has more than one "::"`);
  const groups = (h: string) =>
    (h ? h.split(':') : []).map((g) => {
      if (!/^[0-9a-fA-F]{1,4}$/.test(g)) throw new Error(`"${s}" is not an IPv6 address`);
      return BigInt('0x' + g);
    });
  const head = groups(halves[0]);
  const tail = halves.length === 2 ? groups(halves[1]) : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) throw new Error(`"${s}" is not an IPv6 address`);
  return [...head, ...Array<bigint>(halves.length === 2 ? missing : 0).fill(0n), ...tail].reduce((acc, w) => (acc << 16n) | w, 0n);
}

export function parseCidr(input: string): Network {
  const [addr, pre, extra] = input.trim().split('/');
  if (extra !== undefined || !addr) throw new Error('Expected ADDRESS/PREFIX');
  const version = addr.includes(':') ? 6 : 4;
  const bits = version === 4 ? 32 : 128;
  const prefix = pre === undefined ? bits : Number(pre);
  if (!/^\d{1,3}$/.test(pre ?? String(bits)) || prefix > bits) throw new Error(`Prefix must be 0-${bits}`);
  const ip = version === 4 ? parseV4(addr) : parseV6(addr);
  const hostBits = BigInt(bits - prefix);
  const network = (ip >> hostBits) << hostBits;
  return { version, prefix, network, last: network + (1n << hostBits) - 1n };
}

export function formatIp(n: bigint, version: 4 | 6): string {
  if (version === 4) return [24n, 16n, 8n, 0n].map((s) => String((n >> s) & 255n)).join('.');
  const words = Array.from({ length: 8 }, (_, i) => Number((n >> BigInt(112 - 16 * i)) & 0xffffn));
  // RFC 5952: compress the longest run (length >= 2) of zero words.
  let best = [-1, 0];
  for (let i = 0; i < 8; ) {
    if (words[i] !== 0) {
      i++;
      continue;
    }
    let j = i;
    while (j < 8 && words[j] === 0) j++;
    if (j - i > best[1] && j - i >= 2) best = [i, j - i];
    i = j;
  }
  const hex = words.map((w) => w.toString(16));
  if (best[0] < 0) return hex.join(':');
  return `${hex.slice(0, best[0]).join(':')}::${hex.slice(best[0] + best[1]).join(':')}`;
}

export function describe(n: Network) {
  const bits = n.version === 4 ? 32 : 128;
  const total = 1n << BigInt(bits - n.prefix);
  const f = (x: bigint) => formatIp(x, n.version);
  const mask = ((1n << BigInt(bits)) - 1n) ^ (total - 1n);
  let usable: bigint;
  let first = n.network;
  let last = n.last;
  if (n.version === 4 && n.prefix <= 30) {
    usable = total - 2n; // network and broadcast addresses are reserved
    first += 1n;
    last -= 1n;
  } else usable = total; // /31 (RFC 3021), /32 and IPv6 have no broadcast
  return {
    cidr: `${f(n.network)}/${n.prefix}`,
    network: f(n.network),
    ...(n.version === 4 ? { broadcast: n.prefix <= 30 ? f(n.last) : 'n/a', netmask: f(mask), wildcard: f(total - 1n) } : {}),
    firstHost: f(first),
    lastHost: f(last),
    totalAddresses: total.toLocaleString('en-US'),
    usableHosts: usable.toLocaleString('en-US'),
  };
}

export const overlaps = (a: Network, b: Network) => a.version === b.version && a.network <= b.last && b.network <= a.last;
export const contains = (outer: Network, inner: Network) =>
  outer.version === inner.version && outer.network <= inner.network && inner.last <= outer.last;

/** Splits a network into subnets of a longer prefix (capped to keep the page responsive). */
export function split(n: Network, newPrefix: number, cap = 256): { subnets: string[]; total: bigint } {
  const bits = n.version === 4 ? 32 : 128;
  if (newPrefix < n.prefix || newPrefix > bits) throw new Error(`New prefix must be between ${n.prefix} and ${bits}`);
  const total = 1n << BigInt(newPrefix - n.prefix);
  const size = 1n << BigInt(bits - newPrefix);
  const subnets: string[] = [];
  for (let i = 0n; i < total && i < BigInt(cap); i++) subnets.push(`${formatIp(n.network + i * size, n.version)}/${newPrefix}`);
  return { subnets, total };
}
