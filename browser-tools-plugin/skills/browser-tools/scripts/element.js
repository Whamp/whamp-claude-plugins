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
    boolean: ["click", "scroll", "json", "quiet"],
    string: ["text", "ws", "host"],
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

const selector = args._[0] ?? null;
const textSearch = args.text ?? null;
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
    const page = await getActivePage(browser, { index: -1 });
    if (!page) {
        fail("No active page found. Navigate first.", { json: jsonOutput });
    }

    const elementResult = await resolveElement(page, { selector, textSearch, timeout });
    if (!elementResult || !elementResult.handle) {
        const message = selector
            ? `Selector not found: ${selector}`
            : textSearch
              ? `No element found containing text: ${textSearch}`
              : "No element selected.";
        fail(message, { json: jsonOutput });
    }

    const { handle, info } = elementResult;

    if (args.scroll) {
        await handle.evaluate((el) => {
            el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        });
        logger.info("↕️  Element scrolled into view");
    }

    if (args.click) {
        try {
            await handle.click({ delay: 20 });
            logger.info("🖱️  Element clicked");
        } catch (error) {
            fail(`Click failed: ${error.message}`, { json: jsonOutput });
        }
    }

    const output = {
        ok: true,
        selector: info.selector,
        tag: info.tag,
        id: info.id,
        classes: info.classes,
        text: info.text,
        attributes: info.attributes,
        rect: info.rect,
        visible: info.visible,
        children: info.children,
    };

    if (jsonOutput) {
        printJSON(output);
    } else {
        logger.info(`✅ Element ${info.selector}`);
        process.stdout.write(formatHumanOutput(output));
    }

    await handle.dispose();
} catch (error) {
    fail(`Element lookup failed: ${error.message}`, { json: jsonOutput });
} finally {
    if (browser) await browser.disconnect();
}

async function resolveElement(page, { selector: rawSelector, textSearch: rawText, timeout: timeoutMs }) {
    if (rawSelector) {
        const handle = await page.$(rawSelector);
        if (!handle) return null;
        const info = await collectElementInfo(page, handle, rawSelector);
        return { handle, info };
    }

    if (rawText) {
        const handle = await findByText(page, rawText);
        if (!handle) return null;
        const info = await collectElementInfo(page, handle);
        return { handle, info };
    }

    return await pickElement(page, timeoutMs);
}

async function collectElementInfo(page, handle, selectorOverride) {
    return await page.evaluate((el, selectorHint) => {
        const escapeIdent = (value) => {
            if (window.CSS && typeof window.CSS.escape === "function") {
                return window.CSS.escape(value);
            }
            return value.replace(/[^a-zA-Z0-9_\-]/g, (char) => `\\${char}`);
        };

        const toSelector = (element) => {
            const parts = [];
            let current = element;
            while (current && current.nodeType === 1) {
                let part = current.nodeName.toLowerCase();
                if (current.id) {
                    part = `#${escapeIdent(current.id)}`;
                    parts.unshift(part);
                    break;
                }

                if (current.classList.length > 0) {
                    part += `.${Array.from(current.classList, (cls) => escapeIdent(cls)).join('.')}`;
                }

                const parent = current.parentElement;
                if (parent) {
                    const siblings = Array.from(parent.children).filter((child) => child.nodeName === current.nodeName);
                    if (siblings.length > 1) {
                        const index = siblings.indexOf(current) + 1;
                        part += `:nth-of-type(${index})`;
                    }
                }

                parts.unshift(part);
                current = parent;
            }
            return parts.join(' > ');
        };

        const rect = el.getBoundingClientRect();
        const attributes = Object.fromEntries(
            el.getAttributeNames().map((name) => [name, el.getAttribute(name)]),
        );

        const textContent = el.innerText ?? el.textContent ?? "";

        return {
            selector: selectorHint ?? toSelector(el),
            tag: el.tagName.toLowerCase(),
            id: el.id || null,
            classes: el.classList.length ? Array.from(el.classList) : [],
            text: textContent.trim().slice(0, 160),
            attributes,
            rect: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
            },
            visible: Boolean(el.offsetParent),
            children: el.children.length,
        };
    }, handle, selectorOverride ?? null);
}

async function findByText(page, text) {
    const escaped = text.replace(/"/g, '\\"');
    const handles = await page.$x(`//*[contains(normalize-space(text()), "${escaped}")]`);
    if (!handles || handles.length === 0) return null;
    const [first, ...rest] = handles;
    await Promise.all(rest.map((handle) => handle.dispose()));
    return first;
}

async function pickElement(page, timeoutMs) {
    const result = await page.evaluate(async (timeout) => {
        const originalCursor = document.body?.style?.cursor ?? "";
        const state = {
            highlight: null,
            previousOutline: null,
            resolved: false,
        };
        let timerId = null;

        const escapeIdent = (value) => {
            if (window.CSS && typeof window.CSS.escape === "function") {
                return window.CSS.escape(value);
            }
            return value.replace(/[^a-zA-Z0-9_\-]/g, (char) => `\\${char}`);
        };

        const cleanup = () => {
            if (state.highlight) {
                state.highlight.style.outline = state.previousOutline ?? "";
            }
            document.body.style.cursor = originalCursor;
            document.removeEventListener("mouseover", onHover, true);
            document.removeEventListener("click", onClick, true);
            if (timerId) {
                clearTimeout(timerId);
                timerId = null;
            }
        };

        const highlight = (element) => {
            if (state.highlight === element) return;
            if (state.highlight) {
                state.highlight.style.outline = state.previousOutline ?? "";
            }
            state.highlight = element;
            state.previousOutline = element.style.outline;
            element.style.outline = "3px solid #ff4444";
        };

        const buildInfo = (element) => {
            const rect = element.getBoundingClientRect();
            return {
                tag: element.tagName.toLowerCase(),
                text: (element.innerText ?? element.textContent ?? "").trim().slice(0, 160),
                rect: {
                    x: Math.round(rect.x),
                    y: Math.round(rect.y),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                },
            };
        };

        const toSelector = (element) => {
            const parts = [];
            let current = element;
            while (current && current.nodeType === 1) {
                let part = current.nodeName.toLowerCase();
                if (current.id) {
                    part = `#${escapeIdent(current.id)}`;
                    parts.unshift(part);
                    break;
                }
                if (current.classList.length > 0) {
                    part += `.${Array.from(current.classList, (cls) => escapeIdent(cls)).join('.')}`;
                }
                const parent = current.parentElement;
                if (parent) {
                    const siblings = Array.from(parent.children).filter((child) => child.nodeName === current.nodeName);
                    if (siblings.length > 1) {
                        const index = siblings.indexOf(current) + 1;
                        part += `:nth-of-type(${index})`;
                    }
                }
                parts.unshift(part);
                current = parent;
            }
            return parts.join(' > ');
        };

        const resolveSelection = (element) => {
            if (!element) return null;
            const info = buildInfo(element);
            const selector = toSelector(element);
            window.__BT_PICKED_ELEMENT = element;
            return { ...info, selector };
        };

        const onHover = (event) => {
            if (state.resolved) return;
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            highlight(target);
        };

        const onClick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (state.resolved) return;
            state.resolved = true;
            cleanup();
            resolve(resolveSelection(event.target));
        };

        document.body.style.cursor = "crosshair";
        document.addEventListener("mouseover", onHover, true);
        document.addEventListener("click", onClick, true);

        return await new Promise((resolve) => {
            timerId = timeout
                ? setTimeout(() => {
                      if (state.resolved) return;
                      state.resolved = true;
                      cleanup();
                      resolve(null);
                  }, timeout)
                : null;

            window.addEventListener(
                "blur",
                () => {
                    if (state.resolved) return;
                    state.resolved = true;
                    cleanup();
                    resolve(null);
                },
                { once: true },
            );

            window.__BT_PICKER_CANCEL = () => {
                if (state.resolved) return;
                state.resolved = true;
                cleanup();
                resolve(null);
            };
        });
    }, timeoutMs || 60000);

    if (!result) return null;

    const handle = await page.evaluateHandle(() => {
        const element = window.__BT_PICKED_ELEMENT ?? null;
        delete window.__BT_PICKED_ELEMENT;
        delete window.__BT_PICKER_CANCEL;
        return element;
    });

    const element = handle.asElement();
    if (!element) {
        await handle.dispose();
        return null;
    }

    const info = await collectElementInfo(page, element, result.selector);
    return { handle: element, info };
}

function formatHumanOutput(info) {
    const lines = [];
    lines.push(`selector: ${info.selector}`);
    if (info.tag) lines.push(`tag: ${info.tag}`);
    if (info.id) lines.push(`id: ${info.id}`);
    if (info.classes?.length) lines.push(`classes: ${info.classes.join(" ")}`);
    if (info.text) lines.push(`text: ${info.text}`);
    lines.push(`visible: ${info.visible}`);
    lines.push(`children: ${info.children}`);
    if (info.rect) {
        lines.push(`position: (${info.rect.x}, ${info.rect.y})`);
        lines.push(`size: ${info.rect.width}x${info.rect.height}`);
    }
    return `${lines.join("\n")}\n`;
}