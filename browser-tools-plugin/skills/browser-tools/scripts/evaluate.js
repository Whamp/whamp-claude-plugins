#!/usr/bin/env node

import { readFile } from "node:fs/promises";
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
    string: ["file", "ws", "host"],
    number: ["port", "timeout", "truncate"],
    alias: {
        j: "json",
        q: "quiet",
    },
    defaults: {
        port: DEFAULT_PORT,
        timeout: 30000,
        truncate: 8000,
    },
});

const jsonOutput = Boolean(args.json);
const logger = createLogger({ quiet: Boolean(args.quiet), json: jsonOutput });

const expression = await resolveExpression(args);

if (!expression) {
    fail("No JavaScript provided. Pass an expression or use --file/STDIN.", { json: jsonOutput });
}

const timeout = normalizeNumber(args.timeout, 30000);
const port = normalizeNumber(args.port, DEFAULT_PORT);

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
    const page = await getActivePage(browser, { index: -1 });
    if (!page) {
        fail("No active page found. Navigate to a page first.", { json: jsonOutput });
    }

    const result = await page.evaluate(async (code) => {
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        const fn = new AsyncFunction(`return (${code})`);
        return await fn();
    }, expression);

    const truncated = truncateResult(result, normalizeNumber(args.truncate, 8000));

    if (jsonOutput) {
        printJSON({ ok: true, result });
    } else {
        process.stdout.write(`${truncated}\n`);
        logger.info(truncated);
    }
} catch (error) {
    fail(`Evaluation failed: ${error.message}`, { json: jsonOutput });
} finally {
    if (browser) await browser.disconnect();
}

async function resolveExpression(parsed) {
    if (parsed.file) {
        const content = await readFile(parsed.file, "utf8");
        return content.trim();
    }

    if (parsed._.length > 0) {
        return parsed._.join(" ");
    }

    if (!process.stdin.isTTY) {
        const chunks = [];
        for await (const chunk of process.stdin) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8").trim();
    }

    return null;
}

function truncateResult(value, maxLength) {
    if (value === undefined) return "undefined";
    if (value === null) return "null";

    if (typeof value === "string") {
        return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
    }

    const serialized = JSON.stringify(value, null, 2);
    if (!serialized) return String(value);
    return serialized.length > maxLength ? `${serialized.slice(0, maxLength)}…` : serialized;
}