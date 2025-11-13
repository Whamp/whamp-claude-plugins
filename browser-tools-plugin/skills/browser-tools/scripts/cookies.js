#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
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
    boolean: ["clear", "json", "quiet"],
    string: ["export", "import", "domain", "ws", "host"],
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

const mode = resolveMode(args);
if (!mode) {
    fail("Specify one command: --export [file] | --import <file> | --clear", { json: Boolean(args.json) });
}

const jsonOutput = Boolean(args.json);
const logger = createLogger({ quiet: Boolean(args.quiet), json: jsonOutput });

const timeout = normalizeNumber(args.timeout, 15000);
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
    const page = await getActivePage(browser, { index: 0 });
    if (!page) {
        fail("No active page found. Start a session first.", { json: jsonOutput });
    }

    const client = await page.createCDPSession();
    await client.send("Network.enable");

    if (mode === "export") {
        await handleExport({ page, client, args, logger, jsonOutput });
    } else if (mode === "import") {
        await handleImport({ page, client, args, logger, jsonOutput, timeout });
    } else {
        await handleClear({ client, args, logger, jsonOutput });
    }
} catch (error) {
    fail(`Cookie operation failed: ${error.message}`, { json: jsonOutput });
} finally {
    if (browser) await browser.disconnect();
}

function resolveMode(parsed) {
    if (typeof parsed.export === "string") return "export";
    if (typeof parsed.import === "string") return "import";
    if (parsed.clear) return "clear";
    return null;
}

async function handleExport({ page, client, args: parsed, logger: log, jsonOutput }) {
    const domainFilter = parsed.domain ?? null;
    const outputPath = parsed.export?.trim() ? parsed.export : null;

    const { cookies } = await client.send("Network.getAllCookies");

    const filtered = (domainFilter
        ? cookies.filter((cookie) => cookie.domain.includes(domainFilter))
        : cookies
    ).sort((a, b) => {
        if (a.domain !== b.domain) return a.domain.localeCompare(b.domain);
        return a.name.localeCompare(b.name);
    });

    const payload = {
        ok: true,
        exportedAt: new Date().toISOString(),
        pageUrl: page.url(),
        domain: domainFilter,
        total: filtered.length,
        cookies: filtered.map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            expires: cookie.expires,
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            sameSite: cookie.sameSite,
            priority: cookie.priority,
        })),
    };

    if (outputPath) {
        await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
        log.info(`🍪 Exported ${filtered.length} cookies to ${outputPath}`);
        if (jsonOutput) {
            printJSON({ ok: true, path: outputPath, total: filtered.length });
        }
    } else if (jsonOutput) {
        printJSON(payload);
    } else {
        process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    }
}

async function handleImport({ page, client, args: parsed, logger: log, jsonOutput, timeout }) {
    const sourcePath = parsed.import?.trim();
    if (!sourcePath) {
        fail("--import requires a file path", { json: jsonOutput });
    }

    const content = await readFile(sourcePath, "utf8");
    let payload;
    try {
        payload = JSON.parse(content);
    } catch (error) {
        fail(`Invalid JSON in ${sourcePath}: ${error.message}`, { json: jsonOutput });
    }

    if (!payload.cookies || !Array.isArray(payload.cookies)) {
        fail("Cookie file missing 'cookies' array", { json: jsonOutput });
    }

    const cookiesToSet = payload.cookies.map((cookie) => normalizeCookie(cookie));

    await client.send("Network.setCookies", { cookies: cookiesToSet });

    log.info(`✅ Imported ${cookiesToSet.length} cookies`);

    try {
        await page.reload({ waitUntil: "networkidle0", timeout });
        log.info("🔄 Page reloaded to apply cookies");
    } catch (error) {
        log.warn(`⚠️  Page reload failed: ${error.message}`);
    }

    const result = { ok: true, imported: cookiesToSet.length };
    if (jsonOutput) {
        printJSON(result);
    } else {
        process.stdout.write(`${JSON.stringify(result)}\n`);
    }
}

async function handleClear({ client, args: parsed, logger: log, jsonOutput }) {
    const domainFilter = parsed.domain ?? null;

    if (!domainFilter) {
        await client.send("Network.clearBrowserCookies");
        const result = { ok: true, cleared: "all" };
        if (jsonOutput) {
            printJSON(result);
        } else {
            process.stdout.write(`${JSON.stringify(result)}\n`);
        }
        log.info("🧹 Cleared all cookies");
        return;
    }

    const { cookies } = await client.send("Network.getAllCookies");
    const filtered = cookies.filter((cookie) => cookie.domain.includes(domainFilter));

    for (const cookie of filtered) {
        await client.send("Network.deleteCookies", {
            name: cookie.name,
            domain: cookie.domain,
            path: cookie.path,
        });
    }

    const result = { ok: true, cleared: filtered.length, domain: domainFilter };
    if (jsonOutput) {
        printJSON(result);
    } else {
        process.stdout.write(`${JSON.stringify(result)}\n`);
    }
    log.info(`🧹 Cleared ${filtered.length} cookies for ${domainFilter}`);
}

function normalizeCookie(cookie) {
    const sameSite = normalizeSameSite(cookie.sameSite);
    const param = {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path ?? "/",
    };

    if (cookie.expires && Number.isFinite(cookie.expires)) {
        param.expires = cookie.expires;
    }
    if (cookie.httpOnly !== undefined) param.httpOnly = Boolean(cookie.httpOnly);
    if (cookie.secure !== undefined) param.secure = Boolean(cookie.secure);
    if (sameSite) param.sameSite = sameSite;

    return param;
}

function normalizeSameSite(value) {
    if (!value) return undefined;
    const normalized = String(value).toLowerCase();
    if (normalized === "lax") return "Lax";
    if (normalized === "strict") return "Strict";
    if (normalized === "none") return "None";
    return undefined;
}