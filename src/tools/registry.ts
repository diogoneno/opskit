import type { ComponentType } from 'react';

export const categories = [
  'Data',
  'Encoding',
  'Security',
  'Time',
  'Network',
  'Containers',
  'Reliability',
] as const;

export type Category = (typeof categories)[number];

export interface ToolEntry {
  slug: string;
  name: string;
  description: string;
  keywords: string[];
  category: Category;
  /** True only for tools that can send data over the network, and only on an explicit click. */
  network?: 'user-url' | 'osv.dev';
  load: () => Promise<{ default: ComponentType }>;
}

// The single list of tools. The router, sidebar, command palette, home grid,
// README table and tests are all generated from this array.
export const tools: ToolEntry[] = [
  {
    slug: 'json',
    name: 'JSON formatter',
    description: 'Validate, pretty-print, minify and sort JSON.',
    keywords: ['json', 'format', 'prettify', 'minify', 'validate', 'lint'],
    category: 'Data',
    load: () => import('./json/Page'),
  },
  {
    slug: 'yaml-json',
    name: 'YAML ⇄ JSON',
    description: 'Convert between YAML and JSON, including multi-document YAML.',
    keywords: ['yaml', 'json', 'convert', 'kubernetes', 'manifest', 'compose'],
    category: 'Data',
    load: () => import('./yaml-json/Page'),
  },
  {
    slug: 'json-query',
    name: 'JSON query (JMESPath)',
    description: 'Query JSON with JMESPath, the language behind `aws --query` and `az --query`.',
    keywords: ['jq', 'jmespath', 'query', 'filter', 'kubectl', 'aws', 'jsonpath'],
    category: 'Data',
    load: () => import('./json-query/Page'),
  },
  {
    slug: 'diff',
    name: 'Text diff',
    description: 'Compare two texts line by line or word by word; export a unified patch.',
    keywords: ['diff', 'compare', 'patch', 'drift', 'config'],
    category: 'Data',
    load: () => import('./diff/Page'),
  },
  {
    slug: 'regex',
    name: 'Regex tester',
    description: 'Test JavaScript regular expressions, with RE2 (Go/Prometheus/Loki) compatibility notes.',
    keywords: ['regex', 'regexp', 're2', 'match', 'prometheus', 'loki', 'pattern'],
    category: 'Data',
    load: () => import('./regex/Page'),
  },
  {
    slug: 'encode',
    name: 'Base64 / URL / hex',
    description: 'Encode and decode Base64, base64url, URL and hex. UTF-8 safe.',
    keywords: ['base64', 'base64url', 'url', 'percent', 'hex', 'encode', 'decode'],
    category: 'Encoding',
    load: () => import('./encode/Page'),
  },
  {
    slug: 'jwt',
    name: 'JWT decoder',
    description: 'Decode a JWT header and payload; show exp/iat/nbf as dates. Does not verify signatures.',
    keywords: ['jwt', 'token', 'oidc', 'oauth', 'bearer', 'claims'],
    category: 'Encoding',
    load: () => import('./jwt/Page'),
  },
  {
    slug: 'hash',
    name: 'Hash generator',
    description: 'SHA-1, SHA-256, SHA-384 and SHA-512 of text or a local file, via WebCrypto.',
    keywords: ['hash', 'sha', 'sha256', 'sha512', 'checksum', 'digest'],
    category: 'Security',
    load: () => import('./hash/Page'),
  },
  {
    slug: 'random',
    name: 'Password & UUID generator',
    description: 'Passwords, UUIDs and random tokens from the browser CSPRNG.',
    keywords: ['password', 'uuid', 'guid', 'token', 'random', 'secret', 'generate'],
    category: 'Security',
    load: () => import('./random/Page'),
  },
  {
    slug: 'secrets',
    name: 'Secret scanner',
    description: 'Find API keys, private keys and passwords in pasted text before you commit it.',
    keywords: ['secret', 'scan', 'leak', 'credentials', 'api key', 'gitleaks'],
    category: 'Security',
    load: () => import('./secrets/Page'),
  },
  {
    slug: 'timestamp',
    name: 'Timestamp converter',
    description: 'Convert epoch seconds/ms, ISO 8601 and RFC 2822 across time zones.',
    keywords: ['timestamp', 'epoch', 'unix', 'date', 'time', 'timezone', 'iso'],
    category: 'Time',
    load: () => import('./timestamp/Page'),
  },
  {
    slug: 'cron',
    name: 'Cron explainer',
    description: 'Explain a cron expression, list the next runs, and emit a CronJob or systemd OnCalendar.',
    keywords: ['cron', 'crontab', 'schedule', 'cronjob', 'systemd', 'timer', 'oncalendar'],
    category: 'Time',
    load: () => import('./cron/Page'),
  },
  {
    slug: 'cidr',
    name: 'CIDR calculator',
    description: 'IPv4/IPv6 subnet ranges, masks and host counts; check two CIDRs for overlap.',
    keywords: ['cidr', 'subnet', 'ip', 'ipv4', 'ipv6', 'netmask', 'vpc', 'network'],
    category: 'Network',
    load: () => import('./cidr/Page'),
  },
  {
    slug: 'http',
    name: 'HTTP request builder',
    description: 'Build a request, copy it as curl, or send it from your browser when you click Send.',
    keywords: ['http', 'request', 'curl', 'api', 'rest', 'headers', 'fetch'],
    category: 'Network',
    network: 'user-url',
    load: () => import('./http/Page'),
  },
  {
    slug: 'k8s-secret',
    name: 'Kubernetes Secret',
    description: 'Encode KEY=value pairs into a Secret manifest, or decode a pasted Secret.',
    keywords: ['kubernetes', 'k8s', 'secret', 'base64', 'kubectl', 'manifest', 'env'],
    category: 'Containers',
    load: () => import('./k8s-secret/Page'),
  },
  {
    slug: 'docker-compose',
    name: 'docker run → Compose',
    description: 'Convert a `docker run` command into a Compose service.',
    keywords: ['docker', 'compose', 'container', 'run', 'convert', 'yaml'],
    category: 'Containers',
    load: () => import('./docker-compose/Page'),
  },
  {
    slug: 'osv',
    name: 'Vulnerability lookup (OSV)',
    description: 'Check package-lock.json, requirements.txt or a package list against OSV.dev.',
    keywords: ['osv', 'cve', 'vulnerability', 'npm', 'pypi', 'audit', 'sca', 'dependency'],
    category: 'Security',
    network: 'osv.dev',
    load: () => import('./osv/Page'),
  },
  {
    slug: 'slo',
    name: 'SLO & error budget',
    description: 'Allowed downtime for an SLO target, burn rate and multi-window alert thresholds.',
    keywords: ['slo', 'sla', 'sli', 'error budget', 'burn rate', 'availability', 'uptime', 'nines'],
    category: 'Reliability',
    load: () => import('./slo/Page'),
  },
];

export const toolBySlug = new Map(tools.map((t) => [t.slug, t]));
