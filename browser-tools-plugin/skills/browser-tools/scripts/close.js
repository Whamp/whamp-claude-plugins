#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { platform } from "node:os";
import puppeteer from "puppeteer-core";

import {
    DEFAULT_PORT,
    createLogger,
    delay,
    parseArgs,
    printJSON,
    resolveBrowserConnection,
    normalizeNumber,
} from "./config.js";

const args = parseArgs(process.argv.slice(2), {
    boolean: ["force", "json", "quiet"],
    string: ["ws", "host"],
    number: ["port", "timeout"],
    alias: {
        j: "json",
        q: "quiet",
    },
    defaults: {
        port: DEFAULT_PORT,
        timeout: 5000,
    },
});

const jsonOutput = Boolean(args.json);
const logger = createLogger({ quiet: Boolean(args.quiet), json: jsonOutput });

const port = normalizeNumber(args.port, DEFAULT_PORT);
const timeout = normalizeNumber(args.timeout, 5000);

const connectionOptions = resolveBrowserConnection({ port, host: args.host, ws: args.ws });

const result = {
    ok: true,
    port,
    graceful: false,
    forced: false,
    closedTabs: 0,
};

logger.info("🔄 Shutting down browser...");

let browser;
if (!args.force) {
    try {
        browser = await puppeteer.connect({
            ...connectionOptions,
            timeout,
        });
        const pages = await browser.pages();
        result.closedTabs = pages.length;
        await browser.close();
        result.graceful = true;
        logger.info(`✅ Closed browser gracefully (${pages.length} tabs)`);
    } catch (error) {
        logger.warn(`⚠️  Graceful shutdown failed: ${error.message}`);
    } finally {
        if (browser) await browser.disconnect();
    }
}

if (!result.graceful) {
    const forced = await forceCloseProcesses({ logger, port });
    result.forced = forced;
    if (!forced) {
        logger.warn("⚠️  No Chrome processes were terminated");
    }
}

await delay(300);

if (jsonOutput) {
    printJSON(result);
} else {
    process.stdout.write(`${JSON.stringify(result)}\n`);
    logger.info("🎉 Browser shutdown complete");
}

async function forceCloseProcesses({ logger: log, port: debuggingPort }) {
    const commands = buildTerminationCommands();
    let anyKilled = false;

    for (const command of commands) {
        const { file, args } = command;
        const execution = spawnSync(file, args, { stdio: "ignore" });
        if (execution.status === 0) {
            anyKilled = true;
            log.info(`🔨 Executed ${file} ${args.join(" ")}`);
        }
    }

    // Attempt to free the port via lsof if available (Unix only)
    if (platform() !== "win32") {
        const killByPort = spawnSync("bash", ["-c", `lsof -ti:${debuggingPort} 2>/dev/null | xargs -r kill -9`], {
            stdio: "ignore",
        });
        if (killByPort.status === 0) {
            anyKilled = true;
            log.info(`🔨 Cleared processes on port ${debuggingPort}`);
        }
    }

    return anyKilled;
}

function buildTerminationCommands() {
    if (platform() === "win32") {
        return [
            { file: "taskkill", args: ["/F", "/IM", "chrome.exe", "/T"] },
            { file: "taskkill", args: ["/F", "/IM", "msedge.exe", "/T"] },
        ];
    }

    return [
        { file: "pkill", args: ["-f", "Google Chrome"] },
        { file: "pkill", args: ["-f", "chrome"] },
        { file: "pkill", args: ["-f", "chromium"] },
        { file: "pkill", args: ["-f", "msedge"] },
    ];
}