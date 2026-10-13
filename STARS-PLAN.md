# STARS-PLAN — making opskit easier to star (2026-10-13)

Branch: `stars-2026-10-13`. Nothing has been pushed; nothing remote was changed. Everything below was verified
against the checkout on 2026-10-13 (build/test/lint before and after: 21 files / 161 tests passing, lint clean, both times).

## 1. First-time-visitor audit

| Item | Before (main @ 699bfac) | After (this branch) |
|---|---|---|
| Live app | `https://diogoneno.github.io/opskit/` → HTTP 200 in 0.39 s; the deployed `index-DUjDhAw2.js` is byte-identical to a local build of `main`, and the OSV opt-in dialog is present in the live chunk | unchanged (deploy needs `npm run deploy` after merge) |
| README first screen | Title, one-line pitch, then **"Live: … (to be enabled — see Deploy)"** and **"_Screenshot pending._"** — both stale since the site is up | Hero: icon + title, pitch, "live app" badge, truthful badges (MIT, no backend, PWA, 5 runtime deps), 800 px home screenshot linking to the app, 3-line clone/run |
| Screenshots | none | 7 real ones in `docs/screenshots/` (home dark/light, cron, CIDR, JWT, palette, mobile 390×844@2x), taken from `vite preview` of this build with headless Chromium 124 |
| "Who is it for" | implicit | explicit paragraph under Why |
| Feature list vs code | Table generated from `src/tools/registry.ts`, test-enforced (`src/test/readme.test.ts`) — accurate by construction; spot-checked unified patch, CIDR overlap, `OnCalendar=`, burn rate, regex worker timeout in code | kept, plus a "How is this different from it-tools / CyberChef" section whose claims map 1:1 to code/tests |
| Badges | none | 5 static badges, none claims CI (there is no CI, by design) |
| LICENSE | MIT, present, 2026 Diogo Neno | unchanged |
| CHANGELOG / tags | `CHANGELOG.md` says 0.1.1; `package.json` said **1.0.0**; no git tag, no GitHub release | `package.json` 0.1.1 (+ lockfile); `Unreleased` section added; tag command below |
| package.json metadata | name, description, license only | + `homepage`, `repository`, `bugs`, `author`, `keywords` (23), `engines` (node ≥ 22.18, matches README) |
| Link previews (OG) | none — a shared link shows no image | `og:*` + `twitter:card` in `index.html`, `public/og.png` 1280×640 served at `/opskit/og.png` (verified present in `dist/`) |
| CONTRIBUTING / issue templates | CONTRIBUTING.md present (9 lines, fine) | + `.github/ISSUE_TEMPLATE/` bug report, tool request, config with a "try the live app" link (markdown templates, no Actions) |
| Repo description | set (18 tools, nothing leaves the browser) | keep; see §2 |
| Repo topics | **none** | see §2 |
| Repo homepage ("About" URL) | **empty** | see §2 |
| Social preview image | not set (cannot verify via API; assume default) | upload `docs/social-preview.png`, see §2 |
| Accessibility basics | skip link, `aria-current`, labelled inputs (test-enforced), visible focus ring, `role=status` on copy, `<dialog>` palette with Esc; `prefers-color-scheme` dark/light | unchanged (nothing found to fix) |
| Mobile | single column + Menu toggle below 768 px, no horizontal scroll at 390 px (screenshot `mobile-home.png`) | unchanged |

Not verified: whether a social preview image is currently set (the REST API does not expose it); GitHub's rendering
of the README (not pushed).

## 2. Set these in the GitHub UI (cannot be done from here)

**Description** (keep, it is good; optional shorter variant):

> Keyboard-first DevOps/SRE toolbox that runs entirely in your browser: JSON/YAML/JMESPath, CIDR, cron, JWT, hashes, k8s Secret, docker run→Compose, SLO error budget, OSV lookup. Nothing leaves the tab; works offline.

**Website:** `https://diogoneno.github.io/opskit/`

**Topics** (20 max; the comparables use `developer-tools`, `tools`, `typescript`, and category words):

```
devops sre developer-tools toolbox client-side offline-first pwa privacy
json yaml jmespath cidr cron jwt kubernetes docker-compose slo osv react vite
```

**Social preview:** Settings → General → Social preview → upload `docs/social-preview.png` (1280×640, 166 KB; GitHub
recommends 1280×640, minimum 640×320, under 1 MB). The same file is `public/og.png` for link previews.

**Release:** after merge, tag so the README's version claims have an anchor:

```sh
git tag -a v0.1.1 -m "opskit 0.1.1" && git push origin v0.1.1
gh release create v0.1.1 -R diogoneno/opskit --title "opskit 0.1.1" --notes-file CHANGELOG.md
```

## 3. Comparables (star counts from the GitHub API, 2026-10-13)

| Repo | Stars | The one thing it does that opskit lacks |
|---|---|---|
| CorentinTh/it-tools | 40,838 | **Self-host one-liner at the top of the README** (`docker run … corentinth/it-tools`), plus listings on Cloudron/Tipi/Unraid — the homelab crowd stars what it can run |
| gchq/CyberChef | 36,101 | **Deep links that carry the input and the recipe**; every result is a shareable URL |
| DevToys-app/DevToys | 32,075 | **Extensibility** (third-party tool packages) and a distinct visual identity (logo + Fluent look) |

Common to all three: a logo/wordmark, a screenshot in the first screen, a "Try it" link in the first sentence.
opskit now has all three of those.

## 4. Feature ideas, ranked by expected star impact ÷ effort (ideas only, none built)

1. **Shareable tool URLs** — encode the current input in the hash (`#/cidr?q=10.0.0.0/22`) so a link reproduces a
   result; it is what makes CyberChef links travel in incident channels. Medium effort, highest impact.
2. **Self-host one-liner** — a 6-line `Dockerfile` (nginx serving `dist/`) + `docker run` in the README, then submit to
   awesome-selfhosted / Unraid CA. Still client-side (static files). Low effort, high impact (it-tools' main growth path).
3. **x509 / PEM certificate decoder** — subject, SANs, expiry, chain order; the most common on-call paste after JWTs.
   Needs an ASN.1 parser (pure JS, one dependency or ~300 lines). Medium effort, high impact.
4. **"Show HN" + r/sre / r/devops / r/selfhosted posts** once 1–2 are done — zero code; stars come from distribution,
   and the README is now ready for it. Low effort, high impact.
5. **3-second GIF** of <kbd>Ctrl</kbd> <kbd>K</kbd> → "cidr" → result in the README hero (record with the same
   headless setup). Low effort, medium impact.
6. **logfmt ⇄ JSON / structured-log line parser** — paste a Loki/Promtail line, get fields; pairs with the RE2 notes.
   Low–medium effort, medium impact.
7. **Kubernetes resource units calculator** — `500m`, `1.5Gi`, requests × replicas → node sizing. Low effort, medium impact.
8. **PromQL / alert-rule explainer** (parse, pretty-print, explain `for:`/windows) — medium–high effort, medium impact.
9. **Manual theme toggle** (light/dark/system) — low effort, low impact, frequently requested.
10. **Submit to awesome-sre / awesome-devops lists** — zero code, small steady impact.

## 5. Commands for the operator (nothing has been run)

```sh
cd /home/neno/opskit
git push -u origin stars-2026-10-13          # review on GitHub, then merge into main
git checkout main && git pull && npm run deploy   # builds dist/ and pushes it to gh-pages (no Actions)
```

Then set description / website / topics / social preview as in §2 and, optionally, create the `v0.1.1` release.
