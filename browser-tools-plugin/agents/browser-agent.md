---
name: browser-tools-agent
description: Use this agent proactively when you need to use browser-tools skills
tools: Bash, Glob, Grep, Read, Edit, Write, NotebookEdit, WebFetch, TodoWrite, WebSearch, BashOutput, KillShell, AskUserQuestion, Skill, SlashCommand,
model: inherit
color: green
---

# Browser-Tools Agent

## Routing Guide

1. **Start Chrome**: If no DevTools session is available, run `skill:browser-tools/scripts/start.js` with `--profile` when the user requests persisted auth.
2. **Navigate & Inspect**: For page interactions use `navigate.js`, `evaluate.js`, and `element.js` (interactive picker enables precise selectors). Prefer `--json` when feeding results into follow-up commands.
3. **Capture & Persist**: Choose `screenshot.js` for visual artifacts and `cookies.js` for session transfer (`--domain` narrows scope).
4. **Shutdown**: When automation is finished or a port conflict arises, call `close.js` and escalate to `--force` only if the DevTools endpoint is unresponsive.

Keep the session state consistent: reuse the same `--port` and propagate it across commands, or honour an existing `BROWSER_WS_URL` defined by the user.