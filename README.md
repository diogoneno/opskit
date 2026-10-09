# opskit

**A keyboard-first DevOps/SRE toolbox that runs entirely in your browser — your data never leaves the tab.**

Live: <https://diogoneno.github.io/opskit/> (to be enabled — see [Deploy](#deploy))

_Screenshot pending._

## Why

On-call and platform work is full of small, risky chores: decoding a token from a failing ingress, checking whether
two CIDRs overlap, turning a `docker run` into Compose, working out how much error budget an incident burned. Most
web tools for these send your input to someone else's server. opskit does not: every tool is a pure function running
in the page, it works offline once loaded (installable PWA), and it has no backend at all.

## Tools

The table is generated from `src/tools/registry.ts` by `npm run readme:tools -- --write`; a test fails if it drifts.

<!-- tools:start -->
| Tool | Category | What it does |
|---|---|---|
| [JSON formatter](https://diogoneno.github.io/opskit/#/json) | Data | Validate, pretty-print, minify and sort JSON. |
| [YAML ⇄ JSON](https://diogoneno.github.io/opskit/#/yaml-json) | Data | Convert between YAML and JSON, including multi-document YAML. |
| [JSON query (JMESPath)](https://diogoneno.github.io/opskit/#/json-query) | Data | Query JSON with JMESPath, the language behind `aws --query` and `az --query`. |
| [Text diff](https://diogoneno.github.io/opskit/#/diff) | Data | Compare two texts line by line or word by word; export a unified patch. |
| [Regex tester](https://diogoneno.github.io/opskit/#/regex) | Data | Test JavaScript regular expressions, with RE2 (Go/Prometheus/Loki) compatibility notes. |
| [Base64 / URL / hex](https://diogoneno.github.io/opskit/#/encode) | Encoding | Encode and decode Base64, base64url, URL and hex. UTF-8 safe. |
| [JWT decoder](https://diogoneno.github.io/opskit/#/jwt) | Encoding | Decode a JWT header and payload; show exp/iat/nbf as dates. Does not verify signatures. |
| [Hash generator](https://diogoneno.github.io/opskit/#/hash) | Security | SHA-1, SHA-256, SHA-384 and SHA-512 of text or a local file, via WebCrypto. |
| [Password & UUID generator](https://diogoneno.github.io/opskit/#/random) | Security | Passwords, UUIDs and random tokens from the browser CSPRNG. |
| [Secret scanner](https://diogoneno.github.io/opskit/#/secrets) | Security | Find API keys, private keys and passwords in pasted text before you commit it. |
| [Timestamp converter](https://diogoneno.github.io/opskit/#/timestamp) | Time | Convert epoch seconds/ms, ISO 8601 and RFC 2822 across time zones. |
| [Cron explainer](https://diogoneno.github.io/opskit/#/cron) | Time | Explain a cron expression, list the next runs, and emit a CronJob or systemd OnCalendar. |
| [CIDR calculator](https://diogoneno.github.io/opskit/#/cidr) | Network | IPv4/IPv6 subnet ranges, masks and host counts; check two CIDRs for overlap. |
| [HTTP request builder](https://diogoneno.github.io/opskit/#/http) | Network | Build a request, copy it as curl, or send it from your browser when you click Send. **Network:** sends only to the URL you enter, on click. |
| [Kubernetes Secret](https://diogoneno.github.io/opskit/#/k8s-secret) | Containers | Encode KEY=value pairs into a Secret manifest, or decode a pasted Secret. |
| [docker run → Compose](https://diogoneno.github.io/opskit/#/docker-compose) | Containers | Convert a `docker run` command into a Compose service. |
| [Vulnerability lookup (OSV)](https://diogoneno.github.io/opskit/#/osv) | Security | Check package-lock.json, requirements.txt or a package list against OSV.dev. **Network:** off by default; opt-in dialog. Once enabled, sends package ecosystem, name and version to OSV.dev (or your own endpoint), on click. |
| [SLO & error budget](https://diogoneno.github.io/opskit/#/slo) | Reliability | Allowed downtime for an SLO target, burn rate and multi-window alert thresholds. |
<!-- tools:end -->

## Privacy

- No backend, no analytics, no cookies, no third-party scripts or fonts. A Content-Security-Policy is set on the built page.
- Input is processed in the page and never stored or sent anywhere.
- Exactly two tools can use the network, and only when you click their button:
  - **Vulnerability lookup (OSV)** is a third-party integration that is **off by default**. Nothing is sent until you
    opt in: the first time you press *Look up*, a dialog shows exactly what would be sent (package ecosystem, name and
    version — no cookies, no identifiers) and where (`https://api.osv.dev/v1/query` by default, editable so you can use a
    self-hosted OSV instance or a proxy). *Enable and look up* stores that choice in this browser's `localStorage`
    (key `opskit.osv.integration`); *Cancel* sends nothing. *Disable integration* on the page turns it off again.
  - **HTTP request builder** sends the request you build to the URL you typed, directly from your browser (no proxy),
    only when you press *Send request (leaves the browser)*.
- This is enforced by a test (`src/test/network.test.ts`) that scans every source file for network APIs and renders
  every page with `fetch`/`XMLHttpRequest`/`WebSocket`/`EventSource`/`sendBeacon` instrumented, expecting zero calls.
  The same test clicks *Look up* on the OSV page: with no consent stored it expects zero requests and the dialog;
  with consent stored, exactly one request to the configured endpoint.

## Keyboard shortcuts

| Keys | Action |
|---|---|
| <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd> | Open the command palette (search tools by name or keyword) |
| <kbd>↑</kbd> <kbd>↓</kbd> <kbd>Enter</kbd> | Move through and open palette results |
| <kbd>Esc</kbd> | Close the palette |
| <kbd>/</kbd> | Focus the first input of the current tool |
| <kbd>Tab</kbd> | Every control, copy button and link is reachable, with a visible focus ring |

## Local development

Requires Node 22.18+ (24 recommended).

```sh
npm ci
npm run dev        # then open the URL Vite prints (path /opskit/)
npm test           # vitest: unit tests for every tool + registry, a11y-label and no-network checks
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run build      # type-check + production build into dist/
```

### Adding a tool

1. Create `src/tools/<slug>/logic.ts` (pure functions), `Page.tsx` and `<slug>.test.ts`.
2. Add one entry to `src/tools/registry.ts`. The router, sidebar, palette, home page and README table all read from it.
3. Run `npm run readme:tools -- --write` and `npm test`. The registry test fails if the page or test file is missing.

## Deploy

GitHub Pages, from a `gh-pages` branch (no CI workflow needed):

```sh
npm run deploy     # builds, then pushes dist/ to the gh-pages branch with the gh-pages package
```

One-time setup in the repository: **Settings → Pages → Build and deployment → Source: Deploy from a branch →
Branch: `gh-pages` / `(root)`**. The app is built with `base: '/opskit/'` and uses hash routes (`#/cidr`), so deep
links work without a 404 fallback.

## Engineering notes

- React 19 + Vite 7 + TypeScript (strict). Runtime dependencies: `react`, `react-dom`, `yaml`, `diff`, `jmespath`.
- Each tool is a lazy-loaded chunk; the shell loads only the registry metadata.
- Regexes run in a Web Worker with a timeout, so catastrophic backtracking cannot freeze the page.
- JSON query uses **JMESPath** (the `aws --query` language) via the `jmespath` package, which is pure JavaScript and runs in the browser.

## Licence

MIT — see [LICENSE](LICENSE).
