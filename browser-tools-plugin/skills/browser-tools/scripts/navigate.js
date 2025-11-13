#!/usr/bin/env node

import puppeteer from "puppeteer-core";

import {
    DEFAULT_PORT,
    createLogger,
    fail,
    getActivePage,
    parseArgs,
    printJSON,
    resolveBrowserConnection,
    normalizeNumber,
} from "./config.js";

const args = parseArgs(process.argv.slice(2), {
    boolean: ["new", "json", "quiet"],
    string: ["wait", "ws", "host"],
    number: ["port", "timeout"],
    alias: {
        j: "json",
        q: "quiet",
    },
    defaults: {
        port: DEFAULT_PORT,
        timeout: 30000,
        wait: "domcontentloaded",
    },
});

const url = args._[0];

if (!url) {
    fail("Usage: navigate.js <url> [--new] [--wait=domcontentloaded|networkidle0|load|none]", {
        json: Boolean(args.json),
    });
}

const jsonOutput = Boolean(args.json);
const logger = createLogger({ quiet: Boolean(args.quiet), json: jsonOutput });

const waitStrategy = normalizeWait(args.wait);
if (!waitStrategy) {
    fail("Invalid --wait value. Use domcontentloaded, networkidle0, load, or none.", { json: jsonOutput });
}

const timeout = normalizeNumber(args.timeout, 30000);
const port = normalizeNumber(args.port, DEFAULT_PORT);

logger.info(`🌐 Navigating to ${url}${args.new ? " (new tab)" : ""}...`);

const connectionOptions = resolveBrowserConnection({ port, host: args.host, ws: args.ws });

let browser;
try {
    browser = await puppeteer.connect({
        ...connectionOptions,
        timeout,
    });
} catch (error) {
    fail(`Failed to connect to browser: ${error.message}`, { json: jsonOutput });
}

try {
    const page = args.new ? await browser.newPage() : await getExistingPage(browser);
    if (!page) {
        fail("No active page found. Start Chrome with start.js or use --new to open a tab.", { json: jsonOutput });
    }

    const gotoOptions = { timeout };
    if (waitStrategy !== "none") {
        gotoOptions.waitUntil = waitStrategy;
    }

    await page.goto(url, gotoOptions);

    const currentURL = page.url();

    if (jsonOutput) {
        printJSON({ ok: true, url: currentURL, newPage: Boolean(args.new) });
    } else {
        process.stdout.write(`${JSON.stringify({ ok: true, url: currentURL, newPage: Boolean(args.new) })}\n`);
        logger.info(`✅ Navigated to ${currentURL}`);
    }
} catch (error) {
    fail(`Navigation failed: ${error.message}`, { json: jsonOutput });
} finally {
    if (browser) await browser.disconnect();
}

function normalizeWait(value) {
    if (!value) return "domcontentloaded";
    const normalized = String(value).toLowerCase();
    if (["domcontentloaded", "networkidle0", "load", "none"].includes(normalized)) {
        return normalized;
    }
    return null;
}

async function getExistingPage(browserInstance) {
    const page = await getActivePage(browserInstance, { index: -1 });
    return page;
}