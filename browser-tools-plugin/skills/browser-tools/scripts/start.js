#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, rm, cp } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import net from "node:net";
import puppeteer from "puppeteer-core";

import {
    DEFAULT_PORT,
    createLogger,
    delay,
    expandPath,
    fail,
    findExistingPath,
    parseArgs,
    printJSON,
    resolveBrowserConnection,
    waitFor,
    normalizeNumber,
    pathExists,
} from "./config.js";

const args = parseArgs(process.argv.slice(2), {
    boolean: ["json", "quiet"],
    string: ["profile", "profile-path", "chrome-path", "chromePath", "host", "user-data-dir", "ws"],
    number: ["port", "timeout"],
    alias: {
        j: "json",
        q: "quiet",
    },
    defaults: {
        port: DEFAULT_PORT,
        timeout: 15000,
    },
});

const jsonOutput = Boolean(args.json);
const logger = createLogger({ quiet: Boolean(args.quiet), json: jsonOutput });

const port = normalizeNumber(args.port, DEFAULT_PORT);
const timeout = normalizeNumber(args.timeout, 15000);
const host = args.host ?? "127.0.0.1";

const userDataDir = expandPath(
    args["user-data-dir"] ?? join(homedir(), ".cache", "browser-tools", `profile-${port}`),
);

await ensurePortAvailable({ port, host });

const chromeExecutable = await resolveChromeExecutable(args);
if (!chromeExecutable) {
    fail(
        "Unable to find Chrome/Chromium executable. Provide --chrome-path or set CHROME_PATH/PUPPETEER_EXECUTABLE_PATH.",
        { json: jsonOutput },
    );
}

let profileSource = await resolveProfileSource(args);
let copiedProfile = false;

try {
    await rm(userDataDir, { recursive: true, force: true });

    if (profileSource) {
        logger.info(`⏳ Copying profile from ${profileSource}...`);
        await cp(profileSource, userDataDir, { recursive: true });
        copiedProfile = true;
    } else {
        await mkdir(userDataDir, { recursive: true });
    }
} catch (error) {
    logger.error(`Failed to prepare user data dir: ${error.message}`);
    fail("Failed to prepare profile directory", { json: jsonOutput });
}

const chromeArgs = buildChromeArguments({ port, userDataDir });

logger.info(`🚀 Launching Chrome at ${chromeExecutable} on port ${port}...`);

const chromeProcess = spawn(chromeExecutable, chromeArgs, {
    detached: true,
    stdio: "ignore",
});

chromeProcess.unref();

logger.info("⏳ Waiting for DevTools endpoint...");

const connectionOptions = resolveBrowserConnection({ port, host, ws: args.ws });

const connected = await waitFor(async () => {
    try {
        const browser = await puppeteer.connect({
            ...connectionOptions,
            timeout: 2000,
        });
        await browser.disconnect();
        return true;
    } catch {
        return false;
    }
}, { timeout, interval: 500 });

if (!connected) {
    fail(
        `Failed to connect to Chrome on ${connectionOptions.browserWSEndpoint ?? connectionOptions.browserURL}`,
        { json: jsonOutput },
    );
}

logger.info(`✅ Chrome listening on ${connectionOptions.browserWSEndpoint ?? connectionOptions.browserURL}`);

const result = {
    ok: true,
    port,
    userDataDir,
    chromePath: chromeExecutable,
    profile: copiedProfile ? profileSource : null,
};

if (jsonOutput) {
    printJSON(result);
} else {
    process.stdout.write(`${JSON.stringify(result)}\n`);
    logger.info(
        `✓ Chrome started on ${connectionOptions.browserWSEndpoint ?? connectionOptions.browserURL}`,
    );
}

async function ensurePortAvailable({ port: portToCheck, host: hostToCheck }) {
    await new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once("error", (error) => {
            if (error.code === "EADDRINUSE") {
                reject(
                    new Error(
                        `Port ${portToCheck} is already in use. If Chrome is already running, reconnect with other tools or close it first.`,
                    ),
                );
            } else {
                reject(error);
            }
        });
        server.once("listening", () => {
            server.close(() => resolve());
        });
        server.listen(portToCheck, hostToCheck);
    }).catch((error) => {
        fail(error.message, { json: jsonOutput });
    });

    // small delay to allow OS to release the port after closing the test server
    await delay(50);
}

function buildChromeArguments({ port: portValue, userDataDir: dir }) {
    return [
        `--remote-debugging-port=${portValue}`,
        `--user-data-dir=${dir}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        "--disable-sync",
        "--metrics-recording-only",
        "--enable-automation",
    ];
}

async function resolveChromeExecutable(parsed) {
    const providedPath = parsed["chrome-path"] ?? parsed.chromePath ?? process.env.CHROME_PATH;
    const puppeteerPath = process.env.PUPPETEER_EXECUTABLE_PATH;

    const platformCandidates = getDefaultChromeCandidates();

    return findExistingPath([
        providedPath && expandPath(providedPath),
        puppeteerPath && expandPath(puppeteerPath),
        ...platformCandidates,
    ]);
}

async function resolveProfileSource(parsed) {
    const raw = parsed.profile ?? parsed["profile-path"];

    if (raw === undefined || raw === false) return null;

    const normalized = typeof raw === "string" ? raw.trim() : "";

    if (normalized && normalized.toLowerCase() !== "default") {
        const expanded = expandPath(normalized);
        if (await pathExists(expanded)) return expanded;
        logger.warn(`⚠️  Profile path not found: ${expanded}`);
        return null;
    }

    const defaultPath = await resolveDefaultProfileRoot();
    if (!defaultPath) {
        logger.warn("⚠️  No default Chrome profile detected; starting with a fresh profile.");
        return null;
    }
    return defaultPath;
}

async function resolveDefaultProfileRoot() {
    const candidates = getDefaultProfileCandidates();
    for (const candidate of candidates) {
        if (!candidate) continue;
        const expanded = expandPath(candidate);
        if (await pathExists(expanded)) {
            return expanded;
        }
    }
    return null;
}

function getDefaultChromeCandidates() {
    const platform = process.platform;
    const home = homedir();

    if (platform === "darwin") {
        return [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ];
    }

    if (platform === "linux") {
        return [
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/chromium-browser",
            "/usr/bin/chromium",
            join(home, "snap", "chromium", "current", "usr", "lib", "chromium-browser", "chromium-browser"),
        ];
    }

    if (platform === "win32") {
        const localAppData = process.env.LOCALAPPDATA;
        const programFiles = process.env["PROGRAMFILES(X86)"] ?? process.env.PROGRAMFILES;
        return [
            localAppData && join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
            programFiles && join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
        ];
    }

    return [];
}

function getDefaultProfileCandidates() {
    const platform = process.platform;
    if (platform === "darwin") {
        return [
            "~/Library/Application Support/Google/Chrome",
            "~/Library/Application Support/Chromium",
        ];
    }

    if (platform === "linux") {
        return [
            "~/.config/google-chrome",
            "~/.config/chromium",
        ];
    }

    if (platform === "win32") {
        const localAppData = process.env.LOCALAPPDATA;
        if (!localAppData) return [];
        return [join(localAppData, "Google", "Chrome", "User Data")];
    }

    return [];
}