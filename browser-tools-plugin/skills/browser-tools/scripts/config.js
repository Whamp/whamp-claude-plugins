import { existsSync } from "node:fs";
import { access, constants } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve as resolvePath, join } from "node:path";

export const DEFAULT_PORT = 9222;

const identity = (value) => value;

export function parseArgs(argv, options = {}) {
    const {
        boolean = [],
        string = [],
        number = [],
        alias = {},
        defaults = {},
    } = options;

    const boolSet = new Set(boolean.map(normalizeKey));
    const stringSet = new Set(string.map(normalizeKey));
    const numberSet = new Set(number.map(normalizeKey));

    const aliases = Object.fromEntries(
        Object.entries(alias).map(([key, target]) => [normalizeKey(key), normalizeKey(target)]),
    );

    const result = { _: [] };

    const assignValue = (key, value = true) => {
        const normalized = normalizeKey(key);
        const target = aliases[normalized] ?? normalized;
        result[target] = value;
    };

    for (let index = 0; index < argv.length; index++) {
        const token = argv[index];

        if (token === "--") {
            result._.push(...argv.slice(index + 1));
            break;
        }

        if (!token.startsWith("-")) {
            result._.push(token);
            continue;
        }

        if (token.startsWith("--no-")) {
            const key = token.slice(5);
            assignValue(key, false);
            continue;
        }

        const [rawKey, inlineValue] = token.split("=", 2);
        const key = rawKey.replace(/^--?/, "");

        if (boolSet.has(key)) {
            assignValue(key, inlineValue === undefined ? true : coerceBoolean(inlineValue));
            continue;
        }

        const expectsString = stringSet.has(key);
        const expectsNumber = numberSet.has(key);

        if (inlineValue !== undefined) {
            assignValue(key, expectsNumber ? Number(inlineValue) : inlineValue);
            continue;
        }

        const nextToken = argv[index + 1];
        const hasNext = nextToken !== undefined && !nextToken.startsWith("--");

        if ((expectsString || expectsNumber) && hasNext) {
            index += 1;
            assignValue(key, expectsNumber ? Number(nextToken) : nextToken);
        } else if (expectsString || expectsNumber) {
            assignValue(key, expectsNumber ? NaN : "");
        } else {
            assignValue(key, true);
        }
    }

    for (const [key, value] of Object.entries(defaults)) {
        if (!(key in result)) {
            result[key] = typeof value === "function" ? value() : value;
        }
    }

    return result;
}

export function createLogger({ quiet = false, json = false } = {}) {
    const format = (args) =>
        args
            .map((part) => {
                if (part instanceof Error) {
                    return part.stack ?? part.message;
                }
                return typeof part === "object" ? JSON.stringify(part) : String(part);
            })
            .join(" ");

    const write = (stream, args) => {
        stream.write(format(args));
        stream.write("\n");
    };

    return {
        info: (...args) => {
            if (!quiet && !json) write(process.stderr, args);
        },
        warn: (...args) => {
            if (!quiet && !json) write(process.stderr, args);
        },
        error: (...args) => {
            write(process.stderr, args);
        },
    };
}

export function printJSON(value) {
    process.stdout.write(`${JSON.stringify(value)}\n`);
}

export function fail(message, { code = 1, json = false } = {}) {
    if (json) {
        printJSON({ ok: false, error: message });
    } else {
        process.stderr.write(`${message}\n`);
    }
    process.exit(code);
}

export function resolveBrowserConnection(flags = {}) {
    if (flags.ws || process.env.BROWSER_WS_URL) {
        const endpoint = flags.ws ?? process.env.BROWSER_WS_URL;
        return {
            browserWSEndpoint: endpoint,
            defaultViewport: null,
        };
    }

    const host = flags.host ?? process.env.BROWSER_HOST ?? "localhost";
    const port = normalizeNumber(flags.port ?? process.env.BROWSER_PORT ?? DEFAULT_PORT, DEFAULT_PORT);

    return {
        browserURL: `http://${host}:${port}`,
        defaultViewport: null,
    };
}

export async function waitFor(fn, { timeout = 10000, interval = 250 } = {}) {
    const start = Date.now();
    let lastError;
    while (Date.now() - start < timeout) {
        try {
            const result = await fn();
            if (result) return result;
        } catch (error) {
            lastError = error;
        }
        await delay(interval);
    }
    if (lastError) throw lastError;
    return null;
}

export function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getActivePage(browser, { index = -1 } = {}) {
    const pages = await browser.pages();
    if (pages.length === 0) return null;
    return index === -1 ? pages.at(-1) : pages[index] ?? null;
}

export function expandPath(value) {
    if (!value) return value;
    if (value.startsWith("~")) {
        return resolvePath(join(homedir(), value.slice(1)));
    }
    return resolvePath(value);
}

export async function pathExists(path) {
    try {
        await access(path, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

export function normalizeNumber(value, fallback) {
    const number = typeof value === "string" ? Number(value) : value;
    return Number.isFinite(number) ? number : fallback;
}

export function findExistingPath(paths) {
    for (const candidate of paths) {
        if (!candidate) continue;
        if (existsSync(candidate)) return candidate;
    }
    return null;
}

function normalizeKey(key) {
    return key.replace(/^--?/, "");
}

function coerceBoolean(value) {
    if (typeof value === "boolean") return value;
    const normalized = String(value).toLowerCase();
    if (["false", "0", "no", "off"].includes(normalized)) return false;
    return true;
}
