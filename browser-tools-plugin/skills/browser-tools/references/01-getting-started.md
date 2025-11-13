## Getting Started

The browser-tools skill wraps a set of executable Node.js scripts located in `skills/browser-tools/scripts`. They expect an existing Chrome or Chromium build with remote debugging enabled on port 9222 by default.

### Install dependencies

```bash
cd skills/browser-tools
npm install
```

### Launch Chrome

```bash
# Start with a temporary profile
node scripts/start.js

# Reuse your default profile (copies it into a sandbox)
node scripts/start.js --profile

# Specify a custom Chrome executable
node scripts/start.js --chrome-path /usr/bin/google-chrome-stable
```

After a successful start the script prints JSON describing the session (`port`, `userDataDir`, and chosen executable). All other tools assume the Chrome instance remains available on the same debugging endpoint.
