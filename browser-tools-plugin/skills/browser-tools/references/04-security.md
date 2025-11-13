## Security Guidelines

- **Profiles**: Using `--profile` clones your default Chrome profile into `~/.cache/browser-tools/profile-<port>`. Remove the directory after sensitive sessions or reuse `close.js` which leaves the copy on disk for next runs.
- **Credentials**: Exported cookie JSON files may contain session tokens. Store them outside version control and delete when no longer needed.
- **JavaScript execution**: Only evaluate trusted code. Prefer passing scripts via `--file` to keep complex payloads auditable.
- **Remote endpoints**: When targeting remote Chrome instances with `--ws`, ensure the connection is tunneled (SSH, VPN) because the DevTools protocol provides full browser access.
- **Force shutdown**: `close.js --force` uses process termination (`pkill`/`taskkill`). Verify no unrelated Chrome sessions share the same user data directory before invoking it.
