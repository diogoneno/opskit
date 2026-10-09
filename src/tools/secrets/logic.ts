export type Severity = 'high' | 'medium';

export interface Rule {
  id: string;
  name: string;
  severity: Severity;
  pattern: RegExp; // must be global; capture group 1 (if any) is the secret part
}

// Linear-time patterns only (no nested quantifiers), so a large paste cannot hang the tab.
export const rules: Rule[] = [
  { id: 'private-key', name: 'Private key block', severity: 'high', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----/g },
  { id: 'aws-access-key', name: 'AWS access key ID', severity: 'high', pattern: /\b((?:AKIA|ASIA)[0-9A-Z]{16})\b/g },
  { id: 'aws-secret-key', name: 'AWS secret access key', severity: 'high', pattern: /aws_?secret_?access_?key\s*[:=]\s*['"]?([A-Za-z0-9/+=]{40})(?![A-Za-z0-9/+=])/gi },
  { id: 'github-token', name: 'GitHub token', severity: 'high', pattern: /\b(gh[pousr]_[A-Za-z0-9]{36,255})\b/g },
  { id: 'github-pat', name: 'GitHub fine-grained token', severity: 'high', pattern: /\b(github_pat_[A-Za-z0-9_]{60,255})\b/g },
  { id: 'gitlab-token', name: 'GitLab personal access token', severity: 'high', pattern: /\b(glpat-[A-Za-z0-9_-]{20,})(?![\w-])/g },
  { id: 'google-api-key', name: 'Google API key', severity: 'high', pattern: /\b(AIza[0-9A-Za-z_-]{35})(?![\w-])/g },
  { id: 'slack-token', name: 'Slack token', severity: 'high', pattern: /\b(xox[abposr]-[A-Za-z0-9-]{10,})(?![\w-])/g },
  { id: 'slack-webhook', name: 'Slack webhook URL', severity: 'high', pattern: /(https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+)/g },
  { id: 'stripe-key', name: 'Stripe live key', severity: 'high', pattern: /\b((?:sk|rk)_live_[0-9a-zA-Z]{24,})\b/g },
  { id: 'sk-api-key', name: 'LLM / OpenAI-style API key (sk-…)', severity: 'high', pattern: /\b(sk-(?:[a-z]+-)?[A-Za-z0-9_-]{32,})(?![\w-])/g },
  { id: 'npm-token', name: 'npm access token', severity: 'high', pattern: /\b(npm_[A-Za-z0-9]{36})\b/g },
  { id: 'sendgrid-key', name: 'SendGrid API key', severity: 'high', pattern: /\b(SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43})(?![\w-])/g },
  { id: 'azure-storage', name: 'Azure storage account key', severity: 'high', pattern: /AccountKey=([A-Za-z0-9+/]{86}==)/g },
  { id: 'jwt', name: 'JSON Web Token', severity: 'medium', pattern: /\b(eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})/g },
  { id: 'url-credentials', name: 'Password in a connection URL', severity: 'high', pattern: /\b[a-z][a-z0-9+.-]{1,20}:\/\/[^\s:@/]{1,64}:([^\s@/]{3,128})@[^\s/]+/gi },
  {
    id: 'generic-assignment',
    name: 'Hard-coded secret assignment',
    severity: 'medium',
    pattern: /\b[A-Za-z0-9_.-]{0,40}(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|client[_-]?secret)[A-Za-z0-9_.-]{0,20}\s*[:=]\s*['"]?([^\s'"#,;]{8,})/gi,
  },
];

const placeholder = /^(?:\$\{.*\}|\$[A-Z_]+|<.*>|\{\{.*\}\}|changeme|change-me|example|xxx+|\*+|none|null|true|false|redacted|your[_-].*|process\.env.*|os\.environ.*)$/i;

export interface Finding {
  rule: string;
  name: string;
  severity: Severity;
  line: number;
  column: number;
  redacted: string;
}

/** Shows enough to locate the secret, never the whole value. */
export function redact(secret: string): string {
  if (secret.length <= 8) return '*'.repeat(secret.length);
  return `${secret.slice(0, 4)}…${'*'.repeat(4)} (${secret.length} chars)`;
}

export function scan(text: string): Finding[] {
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1);
  const lineOf = (idx: number) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= idx) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };

  const taken: [number, number][] = [];
  const findings: Finding[] = [];
  for (const rule of rules) {
    rule.pattern.lastIndex = 0;
    for (const m of text.matchAll(rule.pattern)) {
      const secret = m[1] ?? m[0];
      const start = m.index + m[0].indexOf(secret);
      const end = start + secret.length;
      if (rule.id === 'generic-assignment' && placeholder.test(secret)) continue;
      // A specific rule already covered this span: skip the generic duplicate.
      if (taken.some(([a, b]) => start < b && end > a)) continue;
      taken.push([start, end]);
      const line = lineOf(start);
      findings.push({
        rule: rule.id,
        name: rule.name,
        severity: rule.severity,
        line: line + 1,
        column: start - lineStarts[line] + 1,
        redacted: redact(secret),
      });
    }
  }
  return findings.sort((a, b) => a.line - b.line || a.column - b.column);
}

// Sample secrets are assembled at runtime from fragments so that no complete
// credential-shaped literal exists in the source tree. All values are fake.
export function sample(): string {
  const r = (s: string, n: number) => s.repeat(Math.ceil(n / s.length)).slice(0, n);
  return [
    '# .env pasted by mistake',
    `AWS_ACCESS_KEY_ID=${'AKIA' + 'IOSFODNN7' + 'EXAMPLE'}`,
    `aws_secret_access_key = ${r('wJalrXUtnFEMIK7MDENGbPxRfiCY', 40)}`,
    `GITHUB_TOKEN=${'gh' + 'p_' + r('A1b2C3d4E5', 36)}`,
    `DATABASE_URL=postgres://app:${'s3cr3t' + 'P4ss'}@db.internal:5432/app`,
    `SLACK_WEBHOOK=${'https://hooks.slack' + '.com/services/' + 'T0000000/B0000000/' + r('XyZ', 24)}`,
    'DB_PASSWORD=${DB_PASSWORD}   # placeholder: not reported',
    `api_key: "${r('q9w8e7r6', 32)}"`,
    '-----BEGIN ' + 'OPENSSH PRIVATE KEY-----',
  ].join('\n');
}
