#!/usr/bin/env node
// whetstone dashboard: a local, zero-dependency server for your learning history.
//
//   node dashboard.mjs [--port 4747] [--open]
//
// Reads every project listed in ~/.whetstone/projects (plus the current one):
// .whetstone/ledger.tsv, .whetstone/log.md and the shared learning log, then
// serves the dashboard on 127.0.0.1 only. Every API call needs the random token
// printed at launch, so other websites cannot reach it.
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.join(here, "..", "dashboard");
const home = path.join(os.homedir(), ".whetstone");
const args = process.argv.slice(2);
const port = Number(args[args.indexOf("--port") + 1]) || Number(process.env.WHETSTONE_DASH_PORT) || 4747;
const token = crypto.randomBytes(16).toString("hex");

const read = (file) => {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
};

const projectRoots = () => {
  const listed = (read(path.join(home, "projects")) ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  if (fs.existsSync(path.join(cwd, ".whetstone"))) listed.push(cwd);
  return [...new Set(listed)].filter((p) => fs.existsSync(path.join(p, ".whetstone")));
};

const sharedLogPath = () => {
  if (process.env.WHETSTONE_LOG) return process.env.WHETSTONE_LOG;
  const stored = read(path.join(home, "log-path"));
  return stored ? stored.split("\n")[0].trim() : null;
};

const parseLedger = (text) => {
  if (!text) return [];
  const [, ...rows] = text.trim().split("\n");
  return rows
    .map((row) => row.split("\t"))
    .filter((c) => c.length >= 6)
    .map(([date, minutes, hints, red, yellow, ...topic]) => ({
      date,
      minutes: Number(minutes) || 0,
      hints: Number(hints) || 0,
      red: Number(red) || 0,
      yellow: Number(yellow) || 0,
      topic: topic.join("\t"),
    }));
};

const FIELDS = {
  learned: /^learned$/i,
  confused: /^confused me$/i,
  predicted: /^predicted wrong$/i,
  findings: /^review findings/i,
  hints: /^hints used$/i,
  ship: /^ship lane$/i,
  next: /^next$/i,
};

/** Split a learning log into entries at each "### YYYY-MM-DD: topic" heading. */
const parseLog = (text, source) => {
  if (!text) return [];
  const entries = [];
  const heading = /^###\s+(\d{4}-\d{2}-\d{2})\s*:\s*(.+)$/gm;
  const marks = [...text.matchAll(heading)];
  marks.forEach((m, i) => {
    const body = text.slice(m.index + m[0].length, i + 1 < marks.length ? marks[i + 1].index : text.length).trim();
    const fields = {};
    let current = null;
    for (const line of body.split("\n")) {
      const bullet = line.match(/^-\s+([^:]+):\s*(.*)$/);
      const key = bullet && Object.keys(FIELDS).find((k) => FIELDS[k].test(bullet[1].trim()));
      if (key) {
        current = key;
        fields[key] = bullet[2].trim();
      } else if (current && line.trim()) {
        fields[current] += "\n" + line.trim();
      }
    }
    entries.push({ date: m[1], topic: m[2].trim(), body, fields, source });
  });
  return entries;
};

const words = (s) => new Set(s.toLowerCase().match(/[a-z0-9+#.]{3,}/g) ?? []);
const overlap = (a, b) => {
  const A = words(a);
  const B = words(b);
  let n = 0;
  for (const w of A) if (B.has(w)) n++;
  return n / Math.max(1, Math.min(A.size, B.size));
};

const id = (...parts) => crypto.createHash("sha1").update(parts.join("\u0000")).digest("hex").slice(0, 12);

/** Everything the dashboard shows, rebuilt from disk on each request. */
const collect = () => {
  const projects = projectRoots().map((root) => ({ root, name: path.basename(root) }));
  const sessions = [];
  const notes = [];
  for (const p of projects) {
    for (const row of parseLedger(read(path.join(p.root, ".whetstone", "ledger.tsv")))) {
      sessions.push({ id: id(p.root, row.date, row.topic), project: p.name, ...row });
    }
    const local = path.join(p.root, ".whetstone", "log.md");
    for (const e of parseLog(read(local), local)) notes.push({ ...e, project: p.name });
  }
  const shared = sharedLogPath();
  if (shared) {
    for (const e of parseLog(read(shared), shared)) {
      // Attribute shared-log entries to the project whose ledger has the closest topic that day.
      const best = sessions
        .filter((s) => s.date === e.date)
        .map((s) => ({ s, score: overlap(s.topic, e.topic) }))
        .sort((a, b) => b.score - a.score)[0];
      notes.push({ ...e, project: best && best.score > 0.3 ? best.s.project : null });
    }
  }
  // Link each note to its ledger row (same project and date, most similar topic).
  for (const n of notes) {
    n.id = id(n.source, n.date, n.topic);
    const match = sessions
      .filter((s) => s.date === n.date && (!n.project || s.project === n.project))
      .map((s) => ({ s, score: overlap(s.topic, n.topic) }))
      .sort((a, b) => b.score - a.score)[0];
    if (match && match.score > 0.3) {
      n.sessionId = match.s.id;
      match.s.noteId = n.id;
    }
  }
  const done = new Set(JSON.parse(read(path.join(home, "study.json")) ?? "{}").done ?? []);
  const study = [];
  const EMPTY = /^(none|nothing|n\/a|-|no)\b/i;
  for (const n of notes) {
    for (const kind of ["confused", "predicted", "next"]) {
      const text = n.fields[kind];
      if (!text || EMPTY.test(text.replace(/^["']/, ""))) continue;
      const sid = id(n.id, kind, text);
      study.push({ id: sid, kind, text, noteId: n.id, date: n.date, topic: n.topic, project: n.project, done: done.has(sid) });
    }
  }
  sessions.sort((a, b) => a.date.localeCompare(b.date));
  notes.sort((a, b) => b.date.localeCompare(a.date));
  return { projects, sessions, notes, study, sharedLog: shared, generatedAt: Date.now() };
};

const setStudyDone = (itemId, isDone) => {
  fs.mkdirSync(home, { recursive: true });
  const file = path.join(home, "study.json");
  const state = JSON.parse(read(file) ?? "{}");
  const done = new Set(state.done ?? []);
  if (isDone) done.add(itemId);
  else done.delete(itemId);
  fs.writeFileSync(file, JSON.stringify({ ...state, done: [...done] }, null, 2));
};

/** The open gym session in a project, read straight from gym.lock. */
const gymStatus = (root) => {
  const lock = read(path.join(root, ".whetstone", "gym.lock"));
  if (!lock) return { open: false };
  const get = (k) => (lock.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1] ?? "";
  return {
    open: true,
    topic: get("topic"),
    hints: Number(get("hints")) || 0,
    minutes: Math.floor((Date.now() / 1000 - Number(get("started"))) / 60) || 0,
  };
};

// Whether the `claude` CLI is on PATH, checked once at launch.
let claudeAvailable = false;
execFile("claude", ["--version"], (err) => (claudeAvailable = !err));

/** Only registered projects may be used as a working directory. */
const projectByName = (name) => projectRoots().find((root) => path.basename(root) === name);

// ---------------------------------------------------------------- coach
//
// The Coach view drives headless Claude Code (`claude -p`) in a registered
// project, with whetstone loaded so its commands and write guard apply. The
// allow-list is read-only tools plus whetstone's own state: everything else is
// refused without prompting (--permission-mode dontAsk).

const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.join(here, "..");
const running = new Map();

/** Headless mode needs plugin commands namespaced: /whet-quiz -> /whetstone:whet-quiz. */
const namespaced = (prompt) => prompt.replace(/^\/(whet-[a-z]+)\b/, "/whetstone:$1");

const allowedTools = (root) => {
  const script = path.join(pluginRoot, "scripts", "session.sh");
  const log = sharedLogPath() || path.join(root, ".whetstone", "log.md");
  const state = path.join(root, ".whetstone");
  // "//" anchors a rule at the filesystem root.
  return [
    "Read",
    "Grep",
    "Glob",
    "Agent",
    // Read-only shell commands the coach uses to look around the project.
    ...["ls", "cat", "head", "tail", "wc", "git status", "git diff", "git log", "git show"].map((c) => `Bash(${c} *)`),
    `Bash(bash "${script}" *)`,
    `Bash(bash ${script} *)`,
    `Edit(/${log})`,
    `Write(/${log})`,
    `Edit(/${state}/**)`,
    `Write(/${state}/**)`,
  ];
};

const toolLabel = (block) => {
  const input = block.input ?? {};
  const short = (s, n = 60) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  if (input.file_path) return `${block.name} ${path.basename(input.file_path)}`;
  if (input.pattern) return `${block.name} ${short(input.pattern, 40)}`;
  if (input.command) return `${block.name}: ${short(input.command.replace(pluginRoot, "<whetstone>"))}`;
  if (input.description) return `${block.name}: ${short(input.description)}`;
  return block.name;
};

const runCoach = (req, res, body) => {
  const root = projectByName(String(body.project ?? ""));
  const prompt = String(body.prompt ?? "").trim();
  if (!root) return json(res, 404, { error: "unknown project" });
  if (!prompt) return json(res, 400, { error: "prompt required" });
  if (!claudeAvailable) return json(res, 503, { error: "the claude command was not found on PATH" });
  if (running.has(root)) return json(res, 409, { error: "the coach is still answering in this project" });

  const args = ["-p", "--output-format", "stream-json", "--verbose", "--include-partial-messages", "--permission-mode", "dontAsk", "--permission-prompts", "none"];
  if (typeof body.sessionId === "string" && /^[0-9a-f-]{16,64}$/i.test(body.sessionId)) args.push("--resume", body.sessionId);
  // Optional model: an alias like "sonnet" or a full model id. Empty means Claude Code's default.
  const model = String(body.model || process.env.WHETSTONE_COACH_MODEL || "");
  if (/^[a-z0-9.\-\[\]]{2,64}$/i.test(model)) args.push("--model", model);
  args.push("--allowedTools", ...allowedTools(root));

  // A dashboard started from inside Claude Code inherits its environment; the
  // child should start as a fresh, top-level session.
  const env = { ...process.env };
  for (const key of ["CLAUDECODE", "CLAUDE_CODE_ENTRYPOINT", "CLAUDE_PROJECT_DIR", "CLAUDE_PLUGIN_ROOT"]) delete env[key];
  const child = spawn("claude", args, { cwd: root, env });
  running.set(root, child);
  child.stdin.end(namespaced(prompt));

  res.writeHead(200, { "content-type": "application/x-ndjson", "cache-control": "no-store", "x-accel-buffering": "no" });
  const emit = (event) => res.write(JSON.stringify(event) + "\n");
  let buffer = "";
  let stderr = "";
  let streamed = false;
  let wroteText = false;
  let finished = false;

  const handle = (ev) => {
    // Only the main conversation: subagents (the examiner) report back through it.
    if (ev.parent_tool_use_id) return;
    if (ev.type === "system" && ev.subtype === "init") {
      emit({ type: "session", sessionId: ev.session_id });
      if (!(ev.plugins ?? []).some((p) => p.name === "whetstone"))
        emit({ type: "error", message: "whetstone isn't enabled for Claude Code in this project, so its commands and guard won't run. Install or enable the plugin, then try again." });
    } else if (ev.type === "stream_event") {
      const e = ev.event ?? {};
      if (e.type === "content_block_start" && e.content_block?.type === "text" && wroteText) emit({ type: "text", text: "\n\n" });
      if (e.type === "content_block_delta" && e.delta?.type === "text_delta") {
        streamed = true;
        wroteText = true;
        emit({ type: "text", text: e.delta.text });
      }
    } else if (ev.type === "assistant") {
      for (const block of ev.message?.content ?? []) {
        if (block.type === "tool_use") emit({ type: "tool", label: toolLabel(block) });
        // Fallback if partial messages aren't streamed.
        if (block.type === "text" && !streamed) {
          emit({ type: "text", text: (wroteText ? "\n\n" : "") + block.text });
          wroteText = true;
        }
      }
    } else if (ev.type === "system" && ev.subtype === "permission_denied") {
      emit({ type: "tool", label: `blocked: ${ev.tool_name ?? "tool"}` });
    } else if (ev.type === "result") {
      finished = true;
      emit({ type: "session", sessionId: ev.session_id });
      if (ev.is_error) emit({ type: "error", message: (ev.errors ?? [ev.result ?? "The run ended with an error."]).join("\n") });
      else if (!wroteText && ev.result) emit({ type: "text", text: ev.result });
    }
  };

  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    let nl;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      try {
        handle(JSON.parse(line));
      } catch {
        // Not JSON (a warning line); ignore it.
      }
    }
  });
  child.stderr.on("data", (chunk) => (stderr = (stderr + chunk).slice(-2000)));
  child.on("error", (err) => {
    emit({ type: "error", message: `Couldn't start claude: ${err.message}` });
  });
  child.on("close", (code) => {
    running.delete(root);
    if (!finished && code !== 0 && code !== null)
      emit({ type: "error", message: `claude exited with code ${code}${stderr.trim() ? `: ${stderr.trim().split("\n").slice(-3).join(" ")}` : ""}` });
    res.end();
  });
  // Browser stopped or navigated away: SIGINT lets Claude end the turn cleanly.
  res.on("close", () => {
    if (child.exitCode === null) child.kill("SIGINT");
  });
};

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };

const json = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c.length + data.length > 1e6 ? "" : c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
  });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (url.pathname.startsWith("/api/")) {
    // Token plus same-origin check: a page on another site cannot drive this server.
    const origin = req.headers.origin;
    const sameOrigin = !origin || origin === `http://127.0.0.1:${port}` || origin === `http://localhost:${port}`;
    if (req.headers["x-whetstone-token"] !== token || !sameOrigin) return json(res, 403, { error: "forbidden" });
    if (url.pathname === "/api/data" && req.method === "GET") return json(res, 200, collect());
    if (url.pathname === "/api/status" && req.method === "GET") {
      const root = projectByName(url.searchParams.get("project") ?? "");
      if (!root) return json(res, 404, { error: "unknown project" });
      return json(res, 200, { ...gymStatus(root), available: claudeAvailable });
    }
    if (url.pathname === "/api/coach" && req.method === "POST") return runCoach(req, res, await readBody(req));
    if (url.pathname === "/api/study" && req.method === "POST") {
      const body = await readBody(req);
      if (typeof body.id !== "string") return json(res, 400, { error: "id required" });
      setStudyDone(body.id, Boolean(body.done));
      return json(res, 200, { ok: true });
    }
    return json(res, 404, { error: "not found" });
  }
  const rel = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  const file = path.normalize(path.join(staticDir, rel));
  if (!file.startsWith(staticDir) || !fs.existsSync(file)) {
    res.writeHead(404);
    return res.end("not found");
  }
  let content = fs.readFileSync(file);
  // Hand the token to the page that the server itself serves.
  if (rel === "index.html") content = content.toString().replace("__WHETSTONE_TOKEN__", token);
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
  res.end(content);
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error(`port ${port} is busy; is the dashboard already running? Try --port ${port + 1}`);
    process.exit(1);
  }
  throw e;
});

server.listen(port, "127.0.0.1", () => {
  const link = `http://127.0.0.1:${port}/`;
  const { projects, sessions, notes } = collect();
  console.log(`whetstone dashboard: ${link}`);
  console.log(`${projects.length} project(s), ${sessions.length} session(s), ${notes.length} log entr${notes.length === 1 ? "y" : "ies"}`);
  if (args.includes("--open")) {
    const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open";
    execFile(opener, [link], () => {});
  }
});
