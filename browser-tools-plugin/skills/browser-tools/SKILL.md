---
name: browser-tools
description: Lightweight Chrome automation toolkit with shared configuration, JSON-first output, and six focused scripts for starting, navigating, inspecting, capturing, evaluating, and cleaning up browser sessions.
---

# Browser Tools Skill

Use these scripts to control an existing Chrome/Chromium instance via the DevTools protocol. All commands share the flags `--json`, `--quiet`, `--port=<number>` (default 9222), `--host=<host>`, `--ws=<ws-endpoint>`, and `--timeout=<ms>`. When `--json` is omitted, machine-readable results are still emitted to STDOUT; human-readable logs go to STDERR.

| Script | Purpose | Key Flags | JSON Output Snapshot |
| --- | --- | --- | --- |
| `scripts/start.js` | Launch Chrome with remote debugging and optional profile sync. | `--profile[=path]`, `--chrome-path=<path>`, `--user-data-dir=<path>` | `{ ok, port, userDataDir, chromePath, profile }` |
| `scripts/navigate.js` | Open a URL in the active tab or a new one. | `<url>`, `--new`, `--wait=domcontentloaded|networkidle0|load|none` | `{ ok, url, newPage }` |
| `scripts/screenshot.js` | Capture full page or element screenshots. | `--element=<selector>`, `--format=png|jpeg`, `--quality=<1-100>`, `--out=<path>` | `{ ok, path, format, width, height, element }` |
| `scripts/element.js` | Resolve elements by selector/text or interactively pick them. | `<selector>`, `--text=<string>`, `--click`, `--scroll` | `{ ok, selector, tag, id, classes, text, visible, rect }` |
| `scripts/evaluate.js` | Execute JavaScript in the page context. | `<expression>`, `--file=<path>` | `{ ok, result }` (with structured clone) |
| `scripts/cookies.js` | Export, import, or clear cookies via CDP. | `--export[=file]`, `--import=<file>`, `--clear`, `--domain=<filter>` | Export payload or `{ ok, imported|cleared }` |
| `scripts/close.js` | Gracefully or forcefully stop Chrome. | `--force` | `{ ok, port, graceful, forced, closedTabs }` |

## Usage Patterns

- **Start session**: `node scripts/start.js --profile` → reuse default Chrome profile; or specify `--chrome-path` on Linux/Windows.
- **Pipe commands**: combine navigation, evaluation, and screenshots within a single session: `node scripts/navigate.js https://example.com && node scripts/evaluate.js 'document.title'`.
- **JSON mode for agents**: append `--json` to produce structured payloads for toolchains.

## Element Picker Notes

`element.js` supports three modes:
- `element.js '.selector'` – direct CSS lookup.
- `element.js --text "Buy now"` – XPath text match.
- `element.js` – interactive picker; click on the desired element in Chrome within 60 s. The command captures selector metadata and emits it as JSON.

## Cookie Workflow

- Export all cookies: `node scripts/cookies.js --export cookies.json`.
- Filter by domain: add `--domain example.com` (applies to export and clear).
- Import from captured payload: `node scripts/cookies.js --import cookies.json --json` (reloads the current page).

## Shutdown

- Prefer `node scripts/close.js` for graceful closure; add `--force` when the DevTools endpoint is unresponsive.