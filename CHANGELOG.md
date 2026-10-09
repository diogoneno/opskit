# Changelog

## 0.1.1 — 2026-10-09

### Changed

- **Vulnerability lookup (OSV) is now opt-in.** It makes no third-party request until you enable it. Pressing
  *Look up* without consent opens a dialog ("Third-party integration: OSV.dev") that states what is sent (package
  ecosystem, name and version only — no cookies, no identifiers), shows the endpoint in an editable field
  (default `https://api.osv.dev/v1/query`, or a self-hosted instance / proxy) and links to Google's privacy
  policy (OSV.dev is operated by Google). *Enable and look up* stores `{enabled, endpoint}` in `localStorage`; *Cancel* sends nothing;
  *Disable integration* clears it. The page header shows whether the integration is on and where it points.
- The OSV lookup now uses one `/v1/query` request per package against the configured endpoint, so every request
  goes to that one endpoint (previously `querybatch` plus per-advisory detail requests to `api.osv.dev`).
- HTTP request builder: the send button now reads "Send request (leaves the browser)".

### Tests

- The no-network test renders the OSV page and clicks *Look up*: no consent → 0 requests and the dialog is shown;
  *Cancel* / *Esc* → 0 requests; consent stored → exactly 1 request to the configured endpoint.
