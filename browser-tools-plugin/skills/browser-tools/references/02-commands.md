## Command Reference

All scripts accept the shared flags `--json`, `--quiet`, `--port=<number>`, `--host=<host>`, `--ws=<endpoint>`, and `--timeout=<ms>`. Without `--json`, STDOUT still emits machine-readable JSON while human logs go to STDERR.

### start.js

```bash
node scripts/start.js [--profile[=path]] [--chrome-path=<path>] [--user-data-dir=<path>]
```

- Detects Chrome/Chromium automatically across macOS, Linux, and Windows.
- Copies the default browser profile when `--profile` is set, or from a custom path when supplied.
- Returns `{ ok, port, userDataDir, chromePath, profile }`.

### navigate.js

```bash
node scripts/navigate.js <url> [--new] [--wait=domcontentloaded|networkidle0|load|none]
```

- Reuses the active tab by default; `--new` opens a new page.
- Emits `{ ok, url, newPage }`.

### evaluate.js

```bash
node scripts/evaluate.js <expression>
node scripts/evaluate.js --file snippet.js
```

- Supports inline, file-based, or piped expressions; structured clone results are returned under `result`.
- When not in `--json` mode the evaluated value (truncated to 8 KB) is echoed to STDOUT.

### screenshot.js

```bash
node scripts/screenshot.js [--element=<selector>] [--format=png|jpeg] [--quality=80] [--out=path]
```

- Saves to a temporary directory when `--out` is omitted and prints the absolute path.
- Element captures rely on the supplied selector; full-page captures default to PNG.

### element.js

```bash
node scripts/element.js <selector>
node scripts/element.js --text "Buy now"
node scripts/element.js             # interactive picker
```

- `--click` and `--scroll` act on the resolved element before returning metadata.
- Interactive mode waits up to 60 s for a click inside Chrome and restores page styling afterwards.

### cookies.js

```bash
node scripts/cookies.js --export [path] [--domain=example.com]
node scripts/cookies.js --import cookies.json
node scripts/cookies.js --clear [--domain=example.com]
```

- Uses Chrome DevTools `Network.*` commands for reliable cookie management.
- Export payloads include metadata (`exportedAt`, `pageUrl`, `cookies[]`).

### close.js

```bash
node scripts/close.js [--force]
```

- Attempts graceful shutdown first; falls back to process termination on failure.
- Returns `{ ok, port, graceful, forced, closedTabs }`.
