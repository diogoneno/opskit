# Contributing

1. Keep it client-side: no backend, no analytics, no new network calls (the no-network test will fail).
2. One tool = `src/tools/<slug>/{logic.ts,Page.tsx,<slug>.test.ts}` plus one entry in `src/tools/registry.ts`.
3. Put the logic in pure functions and test them with known vectors; fix a bug with a test that fails first.
4. Every input needs a label (the registry test checks rendered pages).
5. Prefer the platform (WebCrypto, Intl, TextEncoder) over new dependencies.
6. Before opening a PR: `npm run lint && npm run typecheck && npm test && npm run build`.
7. Update the README table with `npm run readme:tools -- --write`.
8. Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`).
9. Never paste real secrets into issues, tests or fixtures; build fake ones from fragments.
