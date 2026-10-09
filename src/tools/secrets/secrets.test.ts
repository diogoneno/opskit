import { describe, expect, it } from 'vitest';
import { redact, rules, sample, scan } from './logic';

const r = (s: string, n: number) => s.repeat(Math.ceil(n / s.length)).slice(0, n);

describe('secret scanner', () => {
  it('known-positive control: the built-in sample fires 7 findings across 7 rules', () => {
    const f = scan(sample());
    expect(f.map((x) => x.rule)).toEqual([
      'aws-access-key',
      'aws-secret-key',
      'github-token',
      'url-credentials',
      'slack-webhook',
      'generic-assignment',
      'private-key',
    ]);
  });
  it('every rule has a positive example that fires it', () => {
    const examples: Record<string, string> = {
      'private-key': '-----BEGIN ' + 'RSA PRIVATE KEY-----',
      'aws-access-key': 'ASIA' + r('ABCD2345', 16),
      'aws-secret-key': `AWS_SECRET_ACCESS_KEY: ${r('abcDEF123/', 40)}`,
      'github-token': 'gh' + 'o_' + r('x1', 36),
      'github-pat': 'github' + '_pat_' + r('A_1b', 82),
      'gitlab-token': 'gl' + 'pat-' + r('a-B_', 20),
      'google-api-key': 'AI' + 'za' + r('Sy0_-', 35),
      'slack-token': 'xo' + 'xb-' + r('1234-', 24),
      'slack-webhook': 'https://hooks.slack' + '.com/services/T01/B02/' + r('ab', 24),
      'stripe-key': 'sk' + '_live_' + r('a1B2', 24),
      'sk-api-key': 'sk' + '-proj-' + r('Ab1_', 40),
      'npm-token': 'np' + 'm_' + r('Aa9', 36),
      'sendgrid-key': 'SG' + '.' + r('a', 22) + '.' + r('b', 43),
      'azure-storage': 'AccountKey=' + r('Ab+/', 86) + '==',
      jwt: 'eyJ' + r('hbGci', 12) + '.eyJ' + r('zdWIi', 12) + '.' + r('sig', 12),
      'url-credentials': 'mongodb://root:' + 'pa55word' + '@mongo:27017',
      'generic-assignment': 'client_secret = "' + r('zx9', 20) + '"',
    };
    expect(Object.keys(examples).sort()).toEqual(rules.map((x) => x.id).sort());
    for (const [id, text] of Object.entries(examples)) {
      expect(scan(text).map((f) => f.rule), id).toContain(id);
    }
  });
  it('does not report placeholders or ordinary text', () => {
    expect(scan('password: ${DB_PASSWORD}\ntoken = <your-token>\nsecret: changeme\nThe password policy is strict.')).toEqual([]);
  });
  it('reports line and column and never returns the full secret', () => {
    const key = 'AKIA' + r('Q7W3', 16);
    const [f] = scan(`first line\n  key=${key}`);
    expect(f).toMatchObject({ line: 2, column: 7, rule: 'aws-access-key' });
    expect(JSON.stringify(f)).not.toContain(key);
    expect(redact('abcdefghijkl')).toBe('abcd…**** (12 chars)');
    expect(redact('short')).toBe('*****');
  });
  it('stays fast on a large adversarial input', () => {
    const t = performance.now();
    scan('password='.repeat(5000) + 'a'.repeat(50000) + ' eyJ'.repeat(5000));
    expect(performance.now() - t).toBeLessThan(2000);
  });
});
