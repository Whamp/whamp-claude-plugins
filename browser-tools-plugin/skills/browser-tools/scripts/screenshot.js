#!/usr/bin/env node

import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
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
    boolean: ["json", "quiet"],
    string: ["element", "format", "ws", "host", "out"],
    number: ["port", "timeout", "quality"],
    alias: {
        j: "json",
        q: "quiet",
    },
    defaults: {
        port: DEFAULT_PORT,
        timeout: 30000,
        format: "png",
    },
});

const jsonOutput = Boolean(args.json);
const logger = createLogger({ quiet: Boolean(args.quiet), json: jsonOutput });

const timeout = normalizeNumber(args.timeout, 30000);
const port = normalizeNumber(args.port, DEFAULT_PORT);

const format = normalizeFormat(args.format);
if (!format) {
    fail("Invalid --format. Use png or jpeg.", { json: jsonOutput });
}

const quality = determineQuality(args.quality, format);

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

const outputFile = args.out ? args.out : await allocateTempFile(format);

try {
    const page = await getActivePage(browser, { index: -1 });
    if (!page) {
        fail("No active page found. Navigate first.", { json: jsonOutput });
    }

    let dimensions;
    let buffer;

    if (args.element) {
        const handle = await page.$(args.element);
        if (!handle) {
            fail(`Element not found: ${args.element}`, { json: jsonOutput });
        }
        const box = await handle.boundingBox();
        if (!box) {
            fail(`Element not visible: ${args.element}`, { json: jsonOutput });
        }
        buffer = await handle.screenshot({
            path: outputFile,
            type: format,
            quality,
        });
        dimensions = {
            width: Math.round(box.width),
            height: Math.round(box.height),
        };
    } else {
        const metrics = await page.evaluate(() => {
            const width = Math.max(
                document.documentElement.scrollWidth,
                document.body?.scrollWidth ?? 0,
                window.innerWidth,
            );
            const height = Math.max(
                document.documentElement.scrollHeight,
                document.body?.scrollHeight ?? 0,
                window.innerHeight,
            );
            return {
                width: Math.round(width),
                height: Math.round(height),
            };
        });

        buffer = await page.screenshot({
            path: outputFile,
            type: format,
            quality,
            fullPage: true,
        });

        dimensions = metrics;
    }

    if (!buffer) {
        fail("Screenshot failed.", { json: jsonOutput });
    }

    const result = {
        ok: true,
        path: outputFile,
        format,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        element: Boolean(args.element),
    };

    if (jsonOutput) {
        printJSON(result);
    } else {
        logger.info(`📸 Screenshot saved (${result.width ?? "?"}×${result.height ?? "?"})`);
        process.stdout.write(`${outputFile}\n`);
    }
} catch (error) {
    fail(`Screenshot failed: ${error.message}`, { json: jsonOutput });
} finally {
    if (browser) await browser.disconnect();
}

function normalizeFormat(value) {
    if (!value) return "png";
    const normalized = String(value).toLowerCase();
    if (["png", "jpeg"].includes(normalized)) return normalized;
    return null;
}

function determineQuality(value, currentFormat) {
    if (currentFormat !== "jpeg") return undefined;
    if (value === undefined) return 80;
    const numeric = normalizeNumber(value, 80);
    return Math.min(100, Math.max(1, numeric));
}

async function allocateTempFile(currentFormat) {
    const directory = await mkdtemp(join(tmpdir(), "browser-tools-"));
    return join(directory, `screenshot-${randomUUID()}.${currentFormat}`);
}