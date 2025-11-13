## Troubleshooting

### Chrome executable not found

- Provide the path explicitly: `node scripts/start.js --chrome-path /path/to/chrome`.
- On Linux ensure the binary is accessible (`/usr/bin/google-chrome`, `/usr/bin/chromium`).
- On Windows set `CHROME_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"`.

### Port 9222 already in use

- Run `node scripts/close.js` to recycle the existing session.
- Override the debugging port: `node scripts/start.js --port 9333` then pass `--port 9333` to subsequent commands.

### Element picker timeout

- Bring the Chrome window to the foreground before running `element.js` with no arguments.
- Click within 60 seconds; press `Ctrl+C` to abort the command if you need to restart.
- Use `--selector` or `--text` when pages block pointer events.

### Cookie import errors

- Ensure the JSON file contains a `cookies[]` array with `name`, `value`, and `domain` fields.
- Host-only cookies require a `domain` value (e.g., `example.com`); the script converts `sameSite` to the correct case automatically.
- If the page reload fails, refresh manually—cookies are already written to the browser profile.

### Headless or remote Chrome targets

- When connecting to a remote browser, set `BROWSER_WS_URL=ws://host:port/devtools/browser/<id>` and omit the local port flag.
- All scripts accept `--ws` to override the connection endpoint per invocation.
