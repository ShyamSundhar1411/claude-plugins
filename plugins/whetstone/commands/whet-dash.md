---
description: Open the whetstone dashboard in your browser. Sessions, trends, study list and a graph, read live from your learning log.
argument-hint: [port]
---

Start the whetstone dashboard.

1. Use `$ARGUMENTS` as the port if it is a number, otherwise 4747.
2. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/dashboard.mjs" --open --port <port>` **in the background** (it is a server and keeps running).
3. Read its first lines of output:
   - If it printed a URL, give the user that URL in one line and say it updates live whenever `/whet-done` writes a new entry.
   - If it says the port is busy, the dashboard is probably already running: give the user `http://127.0.0.1:<port>/`, or offer to start it on the next port.
4. If it reports 0 projects, tell the user that projects appear after their next `/whet-gym`, and that older projects can be added once with `bash "${CLAUDE_PLUGIN_ROOT}/scripts/session.sh" register` run from that project.

Do not open or edit any project files. The dashboard only reads `.whetstone/` and the learning log, and writes nothing except which study items are ticked off (`~/.whetstone/study.json`).
