import { stringify } from 'yaml';

/** Splits a shell command line: quotes, backslash escapes and line continuations. */
export function shellSplit(cmd: string): string[] {
  const out: string[] = [];
  let cur = '';
  let has = false;
  let q: '"' | "'" | null = null;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (q === "'") {
      if (c === "'") q = null;
      else cur += c;
    } else if (q === '"') {
      if (c === '"') q = null;
      else if (c === '\\' && '"\\$`'.includes(cmd[i + 1] ?? '')) cur += cmd[++i];
      else cur += c;
    } else if (c === "'" || c === '"') {
      q = c;
      has = true;
    } else if (c === '\\') {
      if (cmd[i + 1] === '\n') i++;
      else if (cmd[i + 1] === '\r' && cmd[i + 2] === '\n') i += 2;
      else {
        cur += cmd[++i] ?? '';
        has = true;
      }
    } else if (/\s/.test(c)) {
      if (cur || has) out.push(cur);
      cur = '';
      has = false;
    } else {
      cur += c;
      has = true;
    }
  }
  if (q) throw new Error('Unterminated quote');
  if (cur || has) out.push(cur);
  return out;
}

type Service = Record<string, unknown>;
type Handler = (svc: Service, value: string, ctx: Ctx) => void;
interface Ctx {
  volumes: Set<string>;
  networks: Set<string>;
  notes: string[];
}

const push = (key: string) => (svc: Service, v: string) => {
  ((svc[key] ??= []) as string[]).push(v);
};
const setKey = (key: string, conv: (v: string) => unknown = (v) => v) => (svc: Service, v: string) => {
  svc[key] = conv(v);
};
const kv = (key: string) => (svc: Service, v: string) => {
  const map = (svc[key] ??= {}) as Record<string, string>;
  const i = v.indexOf('=');
  map[i < 0 ? v : v.slice(0, i)] = i < 0 ? '' : v.slice(i + 1);
};
const health = (key: string, conv: (v: string) => unknown = (v) => v) => (svc: Service, v: string) => {
  ((svc.healthcheck ??= {}) as Record<string, unknown>)[key] = conv(v);
};

const withValue: Record<string, Handler> = {
  name: setKey('container_name'),
  publish: push('ports'),
  expose: push('expose'),
  env: (svc, v) => kv('environment')(svc, v),
  'env-file': push('env_file'),
  volume: (svc, v, ctx) => {
    const src = v.split(':')[0];
    if (v.includes(':') && !/^[./~$]/.test(src) && !/^[A-Za-z]:[\\/]/.test(v)) ctx.volumes.add(src);
    push('volumes')(svc, v);
  },
  mount: (svc, v, ctx) => {
    const o = Object.fromEntries(v.split(',').map((p) => (p.includes('=') ? [p.slice(0, p.indexOf('=')), p.slice(p.indexOf('=') + 1)] : [p, 'true'])));
    const long: Record<string, unknown> = { type: o.type ?? 'volume' };
    if (o.source ?? o.src) long.source = o.source ?? o.src;
    long.target = o.target ?? o.destination ?? o.dst;
    if (o.readonly === 'true' || o.ro === 'true') long.read_only = true;
    if (long.type === 'volume' && long.source) ctx.volumes.add(String(long.source));
    ((svc.volumes ??= []) as unknown[]).push(long);
  },
  network: (svc, v, ctx) => {
    if (['host', 'none', 'bridge'].includes(v) || v.startsWith('container:')) svc.network_mode = v;
    else {
      ctx.networks.add(v);
      ((svc.networks ??= []) as string[]).push(v);
    }
  },
  restart: setKey('restart'),
  workdir: setKey('working_dir'),
  user: setKey('user'),
  hostname: setKey('hostname'),
  entrypoint: (svc, v) => {
    svc.entrypoint = shellSplit(v);
  },
  label: kv('labels'),
  'add-host': push('extra_hosts'),
  dns: push('dns'),
  'cap-add': push('cap_add'),
  'cap-drop': push('cap_drop'),
  device: push('devices'),
  tmpfs: push('tmpfs'),
  'security-opt': push('security_opt'),
  sysctl: kv('sysctls'),
  ulimit: (svc, v) => {
    const [name, val] = v.split('=');
    const [soft, hard] = (val ?? '').split(':');
    ((svc.ulimits ??= {}) as Record<string, unknown>)[name] = hard ? { soft: Number(soft), hard: Number(hard) } : Number(soft);
  },
  memory: setKey('mem_limit'),
  'memory-reservation': setKey('mem_reservation'),
  cpus: setKey('cpus', Number),
  'shm-size': setKey('shm_size'),
  platform: setKey('platform'),
  pid: setKey('pid'),
  ipc: setKey('ipc'),
  'log-driver': (svc, v) => {
    ((svc.logging ??= {}) as Record<string, unknown>).driver = v;
  },
  'log-opt': (svc, v) => {
    const logging = (svc.logging ??= {}) as Record<string, unknown>;
    kv('options')(logging, v);
  },
  'stop-signal': setKey('stop_signal'),
  'stop-timeout': (svc, v) => {
    svc.stop_grace_period = `${v}s`;
  },
  'health-cmd': health('test', (v) => ['CMD-SHELL', v]),
  'health-interval': health('interval'),
  'health-timeout': health('timeout'),
  'health-retries': health('retries', Number),
  'health-start-period': health('start_period'),
  gpus: (svc, v, ctx) => {
    const device: Record<string, unknown> = { driver: 'nvidia', capabilities: ['gpu'] };
    if (v === 'all') device.count = 'all';
    else if (/^\d+$/.test(v)) device.count = Number(v);
    else device.device_ids = v.replace(/^"?device=/, '').replace(/"$/, '').split(',');
    svc.deploy = { resources: { reservations: { devices: [device] } } };
    ctx.notes.push('--gpus mapped to deploy.resources.reservations.devices (needs the NVIDIA container toolkit).');
  },
  pull: setKey('pull_policy', (v) => (v === 'missing' ? 'missing' : v)),
};

const booleans: Record<string, Handler> = {
  detach: (_s, _v, ctx) => ctx.notes.push('-d dropped: use `docker compose up -d`.'),
  interactive: setKey('stdin_open', () => true),
  tty: setKey('tty', () => true),
  rm: (_s, _v, ctx) => ctx.notes.push('--rm dropped: Compose manages container lifecycle (use `docker compose run --rm` for one-off runs).'),
  privileged: setKey('privileged', () => true),
  'read-only': setKey('read_only', () => true),
  init: setKey('init', () => true),
  'no-healthcheck': (svc) => {
    svc.healthcheck = { disable: true };
  },
};

const aliases: Record<string, string> = {
  p: 'publish',
  e: 'env',
  v: 'volume',
  w: 'workdir',
  u: 'user',
  h: 'hostname',
  l: 'label',
  m: 'memory',
  d: 'detach',
  i: 'interactive',
  t: 'tty',
  net: 'network',
};

export interface Converted {
  yaml: string;
  service: string;
  notes: string[];
}

export function dockerRunToCompose(cmd: string): Converted {
  let args = shellSplit(cmd.trim().replace(/^\$\s*/, ''));
  if (args[0] === 'sudo') args = args.slice(1);
  if (args[0] === 'docker' || args[0] === 'podman') args = args.slice(1);
  if (args[0] === 'container') args = args.slice(1);
  if (args[0] !== 'run') throw new Error('Expected a `docker run …` command');
  args = args.slice(1);

  const svc: Service = {};
  const ctx: Ctx = { volumes: new Set(), networks: new Set(), notes: [] };
  let i = 0;
  for (; i < args.length; i++) {
    const a = args[i];
    if (a === '--') {
      i++;
      break;
    }
    if (!a.startsWith('-') || a === '-') break;
    let name: string;
    let inline: string | undefined;
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      name = eq < 0 ? a.slice(2) : a.slice(2, eq);
      inline = eq < 0 ? undefined : a.slice(eq + 1);
    } else {
      // short flags: -dit, -p8080:80, -p=8080:80
      const letters = a.slice(1);
      let k = 0;
      for (; k < letters.length; k++) {
        const full = aliases[letters[k]];
        if (!full) throw new Error(`Unknown short flag -${letters[k]}`);
        if (full in withValue) break;
        booleans[full](svc, '', ctx);
      }
      if (k === letters.length) continue;
      name = aliases[letters[k]];
      const rest = letters.slice(k + 1).replace(/^=/, '');
      inline = rest || undefined;
    }
    name = aliases[name] ?? name;
    if (name in booleans) {
      if (inline === undefined || inline === 'true') booleans[name](svc, '', ctx);
      continue;
    }
    const handler = withValue[name];
    const value = inline ?? args[++i];
    if (value === undefined) throw new Error(`--${name} needs a value`);
    if (!handler) {
      ctx.notes.push(`--${name} ${value} is not converted; add it by hand.`);
      continue;
    }
    handler(svc, value, ctx);
  }
  const image = args[i];
  if (!image) throw new Error('No image found after the flags');
  const command = args.slice(i + 1);

  const service = String(svc.container_name ?? image.split('/').pop()!.split(/[:@]/)[0]).replace(/[^a-zA-Z0-9_.-]/g, '-').toLowerCase();
  const ordered: Service = { image, ...svc };
  if (command.length) ordered.command = command;
  const doc: Record<string, unknown> = { services: { [service]: ordered } };
  if (ctx.volumes.size) doc.volumes = Object.fromEntries([...ctx.volumes].map((v) => [v, {}]));
  if (ctx.networks.size) {
    doc.networks = Object.fromEntries([...ctx.networks].map((n) => [n, { external: true }]));
    ctx.notes.push('Networks are marked external: true because `docker run` expects them to exist already.');
  }
  return { yaml: stringify(doc, { version: '1.1', nullStr: '' }).replace(/: \{\}$/gm, ':'), service, notes: ctx.notes };
}
