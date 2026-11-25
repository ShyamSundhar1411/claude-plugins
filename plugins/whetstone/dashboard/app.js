// whetstone dashboard. Plain browser JS, no build step, no dependencies.
"use strict";

const state = { data: null, project: "", query: "", studyFilter: "open", signature: "" };
const view = document.getElementById("view");

const api = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: { "x-whetstone-token": window.WHETSTONE_TOKEN, "content-type": "application/json", ...(options.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Tiny inline Markdown: `code` and **bold**, everything escaped first. */
const md = (s) =>
  esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

const svg = (tag, attrs, children = "") =>
  `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ")}>${children}</${tag}>`;

const inProject = (item) => !state.project || item.project === state.project;
const sessions = () => state.data.sessions.filter(inProject);
const notes = () => state.data.notes.filter(inProject);
const study = () => state.data.study.filter(inProject);

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
/** First half vs second half, the same trend `session.sh stats` prints. */
const halves = (xs) => {
  if (xs.length < 2) return null;
  const h = Math.floor(xs.length / 2);
  return [mean(xs.slice(0, h)), mean(xs.slice(h))];
};

// ---------------------------------------------------------------- overview

function lineChart(rows) {
  const W = 640, H = 220, P = { l: 32, r: 12, t: 12, b: 28 };
  if (!rows.length) return `<p class="empty">No sessions yet.</p>`;
  const series = [
    { key: "red", color: "var(--red)", label: "🔴 first review" },
    { key: "yellow", color: "var(--yellow)", label: "🟡 first review" },
    { key: "hints", color: "var(--blue)", label: "Hints" },
  ];
  const max = Math.max(1, ...rows.flatMap((r) => series.map((s) => r[s.key])));
  const x = (i) => P.l + (rows.length === 1 ? (W - P.l - P.r) / 2 : (i / (rows.length - 1)) * (W - P.l - P.r));
  const y = (v) => P.t + (1 - v / max) * (H - P.t - P.b);
  let out = "";
  for (let t = 0; t <= 4; t++) {
    const v = Math.round((max * t) / 4);
    out += svg("line", { x1: P.l, x2: W - P.r, y1: y(v), y2: y(v), stroke: "var(--line)" });
    out += svg("text", { x: P.l - 8, y: y(v) + 4, "text-anchor": "end", "font-size": 10, fill: "var(--muted)", "font-family": "var(--mono)" }, v);
  }
  const step = Math.max(1, Math.ceil(rows.length / 8));
  rows.forEach((r, i) => {
    if (i % step === 0 || i === rows.length - 1)
      out += svg("text", { x: x(i), y: H - 8, "text-anchor": "middle", "font-size": 10, fill: "var(--muted)", "font-family": "var(--mono)" }, r.date.slice(5));
  });
  for (const s of series) {
    const d = rows.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(r[s.key]).toFixed(1)}`).join("");
    out += svg("path", { d, fill: "none", stroke: s.color, "stroke-width": 2.2, "stroke-linejoin": "round" });
    rows.forEach((r, i) => (out += svg("circle", { cx: x(i), cy: y(r[s.key]), r: 3.2, fill: s.color }, `<title>${esc(r.date)} · ${esc(r.topic)}: ${s.label} ${r[s.key]}</title>`)));
  }
  return (
    svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Findings and hints per session" }, out) +
    `<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join("")}</div>`
  );
}

function heatmap(rows) {
  const minutes = new Map();
  for (const r of rows) minutes.set(r.date, (minutes.get(r.date) || 0) + r.minutes);
  const weeks = 26;
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay() - (weeks - 1) * 7);
  const max = Math.max(30, ...minutes.values());
  let cols = "";
  for (let w = 0; w < weeks; w++) {
    let cells = "";
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + w * 7 + d);
      const key = day.toISOString().slice(0, 10);
      const m = minutes.get(key) || 0;
      const style = m ? `background: color-mix(in srgb, var(--accent) ${Math.round(25 + (75 * m) / max)}%, var(--panel-2))` : "";
      cells += `<div class="cell" style="${style}" title="${key}${m ? ` · ${m} min` : ""}"></div>`;
    }
    cols += `<div class="col">${cells}</div>`;
  }
  return `<div class="heat">${cols}</div>`;
}

function trendKpi(label, values, unit) {
  const h = halves(values);
  if (!h) return kpi(label, values.length ? values[0].toFixed(1) : "–", "need 2+ sessions for a trend");
  const [a, b] = h;
  const better = b < a;
  return kpi(label, b.toFixed(1), `<span class="${b === a ? "" : better ? "good" : "bad"}">${a.toFixed(1)} → ${b.toFixed(1)}</span> ${unit}`);
}

const kpi = (label, value, sub) =>
  `<div class="card kpi"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div></div>`;

function renderOverview() {
  const rows = sessions();
  const minutes = rows.reduce((s, r) => s + r.minutes, 0);
  const open = study().filter((s) => !s.done).length;
  if (!state.data.sessions.length) return renderEmpty();
  view.innerHTML = `
    <h1>Overview</h1>
    <p class="lede">Two numbers should fall over the weeks: 🔴 findings and hints per session. If neither moves, the sessions are too easy or the real work is happening elsewhere.</p>
    <div class="grid kpis">
      ${kpi("Sessions", rows.length, `${(minutes / 60).toFixed(1)} hours in the gym`)}
      ${trendKpi("🔴 per session", rows.map((r) => r.red), "first half → second half")}
      ${trendKpi("Hints per session", rows.map((r) => r.hints), "first half → second half")}
      ${kpi("Open study items", open, `<a href="#/study">review them →</a>`)}
    </div>
    <div class="grid two">
      <div class="card chart"><h2>Per session</h2>${lineChart(rows)}</div>
      <div class="card"><h2>Gym days</h2>${heatmap(rows)}
        <h2 style="margin-top:22px">Recent</h2>
        <div class="list compact">${notes().slice(0, 5).map(noteRow).join("") || `<p class="lede">No log entries yet.</p>`}</div>
      </div>
    </div>`;
}

// ---------------------------------------------------------------- sessions

const sessionOf = (note) => state.data.sessions.find((s) => s.id === note.sessionId);

function noteRow(n) {
  const s = sessionOf(n);
  const chips = [
    n.project && `<span class="chip project">${esc(n.project)}</span>`,
    s && `<span class="chip red">🔴 ${s.red}</span>`,
    s && `<span class="chip yellow">🟡 ${s.yellow}</span>`,
    s && `<span class="chip">${s.minutes} min</span>`,
  ].filter(Boolean);
  return `<a class="row" href="#/note/${n.id}"><span class="date">${n.date}</span><span class="topic">${esc(n.topic)}</span><span class="chips">${chips.join("")}</span></a>`;
}

function renderNotes() {
  const q = state.query.toLowerCase();
  const list = notes().filter((n) => !q || `${n.topic} ${n.body}`.toLowerCase().includes(q));
  view.innerHTML = `
    <h1>Sessions</h1>
    <p class="lede">Every entry in your learning log, newest first.</p>
    <div class="toolbar"><input type="search" id="search" placeholder="Search topics and notes" value="${esc(state.query)}" /></div>
    <div class="list">${list.map(noteRow).join("") || `<p class="empty">Nothing matches.</p>`}</div>`;
  const input = document.getElementById("search");
  input.addEventListener("input", () => {
    state.query = input.value;
    const pos = input.selectionStart;
    renderNotes();
    const again = document.getElementById("search");
    again.focus();
    again.setSelectionRange(pos, pos);
  });
}

const FIELD_LABELS = {
  learned: "Learned",
  confused: "Confused me",
  predicted: "Predicted wrong",
  findings: "Review findings",
  hints: "Hints used",
  ship: "Ship lane",
  next: "Next",
};

function renderNote(id) {
  const n = state.data.notes.find((x) => x.id === id);
  if (!n) {
    view.innerHTML = `<a class="back" href="#/notes">← Sessions</a><p class="empty">That entry is no longer in the log.</p>`;
    return;
  }
  const s = sessionOf(n);
  const fields = Object.entries(FIELD_LABELS)
    .filter(([k]) => n.fields[k])
    .map(([k, label]) => `<section class="note-field ${k}"><h3>${label}</h3><p>${md(n.fields[k])}</p></section>`)
    .join("");
  view.innerHTML = `
    <a class="back" href="#/notes">← Sessions</a>
    <h1 style="margin-top:14px">${esc(n.topic)}</h1>
    <div class="note-head">
      <span class="chip">${n.date}</span>
      ${n.project ? `<span class="chip project">${esc(n.project)}</span>` : ""}
      ${s ? `<span class="chip">${s.minutes} min</span><span class="chip">${s.hints} hints</span><span class="chip red">🔴 ${s.red}</span><span class="chip yellow">🟡 ${s.yellow}</span>` : ""}
    </div>
    <div class="note-fields">${fields || `<section class="note-field"><p>${md(n.body)}</p></section>`}</div>`;
}

// ---------------------------------------------------------------- study list

const KIND_LABELS = { confused: "Confused me", predicted: "Predicted wrong", next: "Next" };

function renderStudy() {
  const all = study();
  const list = all.filter((s) => (state.studyFilter === "open" ? !s.done : state.studyFilter === "done" ? s.done : true));
  view.innerHTML = `
    <h1>Study list</h1>
    <p class="lede">Everything that confused you, every prediction that was wrong and every "next", gathered from all sessions. Tick items off as you close them.</p>
    <div class="toolbar">
      <select id="study-filter">
        <option value="open">Open (${all.filter((s) => !s.done).length})</option>
        <option value="done">Done (${all.filter((s) => s.done).length})</option>
        <option value="all">All (${all.length})</option>
      </select>
    </div>
    <div>${
      list
        .map(
          (s) => `
      <label class="study-item ${s.done ? "done" : ""}">
        <input type="checkbox" data-id="${s.id}" ${s.done ? "checked" : ""} />
        <div>
          <div class="text">${md(s.text)}</div>
          <div class="meta"><span class="kind ${s.kind}">${KIND_LABELS[s.kind]}</span><span>${s.date}</span><a href="#/note/${s.noteId}">${esc(s.topic)}</a></div>
        </div>
      </label>`,
        )
        .join("") || `<p class="empty">${state.studyFilter === "open" ? "Nothing open. Good work." : "Nothing here yet."}</p>`
    }</div>`;
  const filter = document.getElementById("study-filter");
  filter.value = state.studyFilter;
  filter.addEventListener("change", () => {
    state.studyFilter = filter.value;
    renderStudy();
  });
  view.querySelectorAll("input[type=checkbox]").forEach((box) =>
    box.addEventListener("change", async () => {
      const item = state.data.study.find((s) => s.id === box.dataset.id);
      item.done = box.checked;
      updateCount();
      await api("/api/study", { method: "POST", body: JSON.stringify({ id: item.id, done: item.done }) });
      setTimeout(renderStudy, 250);
    }),
  );
}

// ---------------------------------------------------------------- graph

const STOP = new Set("the and for with from into that this then than your what when where which while about after before over under phase design using via just more less into onto".split(" "));
const keywords = (topic) => [...new Set((topic.toLowerCase().match(/[a-z][a-z0-9+#.-]{3,}/g) || []).filter((w) => !STOP.has(w)))];

let graphStop = null;

function renderGraph() {
  const rows = sessions();
  view.innerHTML = `
    <h1>Graph</h1>
    <p class="lede">Sessions linked to their project and to the themes they share. Drag to move, scroll to zoom, click a session to open it.</p>
    <div class="card graph-wrap"><canvas id="graph"></canvas>
      <div class="graph-legend"><span><i style="background:var(--accent)"></i>Project</span><span><i style="background:var(--red)"></i>Session (redder = more 🔴)</span><span><i style="background:var(--blue)"></i>Theme</span></div>
    </div>`;
  const canvas = document.getElementById("graph");
  const ctx = canvas.getContext("2d");
  const nodes = [];
  const links = [];
  const byId = new Map();
  const add = (node) => {
    if (!byId.has(node.id)) {
      byId.set(node.id, node);
      nodes.push(node);
    }
    return byId.get(node.id);
  };
  // Themes need to appear in at least two sessions, unless there are only a few sessions.
  const counts = new Map();
  rows.forEach((r) => keywords(r.topic).forEach((k) => counts.set(k, (counts.get(k) || 0) + 1)));
  const minShared = rows.length >= 4 ? 2 : 1;
  const maxRed = Math.max(1, ...rows.map((r) => r.red));
  for (const r of rows) {
    const p = add({ id: `p:${r.project}`, kind: "project", label: r.project, r: 13 });
    const s = add({ id: `s:${r.id}`, kind: "session", label: r.topic, r: 6 + Math.min(10, r.minutes / 12), heat: r.red / maxRed, noteId: r.noteId });
    links.push([s, p]);
    for (const k of keywords(r.topic)) if (counts.get(k) >= minShared) links.push([s, add({ id: `k:${k}`, kind: "keyword", label: k, r: 4 + counts.get(k) })]);
  }
  nodes.forEach((n, i) => {
    const a = (i / nodes.length) * Math.PI * 2;
    n.x = Math.cos(a) * 160 + (Math.random() - 0.5) * 20;
    n.y = Math.sin(a) * 160 + (Math.random() - 0.5) * 20;
    n.vx = 0;
    n.vy = 0;
  });

  let scale = 1, ox = 0, oy = 0, drag = null, pan = null, hover = null, alpha = 1;
  const css = getComputedStyle(document.documentElement);
  const color = (v) => css.getPropertyValue(v).trim();
  const size = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = r.width * dpr;
    canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return r;
  };
  let rect = size();
  const toWorld = (e) => {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left - rect.width / 2 - ox) / scale, (e.clientY - r.top - rect.height / 2 - oy) / scale];
  };
  const pick = (e) => {
    const [x, y] = toWorld(e);
    return nodes.find((n) => (n.x - x) ** 2 + (n.y - y) ** 2 < (n.r + 4) ** 2) || null;
  };

  const tick = () => {
    // Repulsion between every pair, springs along links, a gentle pull to the centre.
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        const d2 = dx * dx + dy * dy || 0.01;
        const f = (1400 / d2) * alpha;
        const d = Math.sqrt(d2);
        dx /= d; dy /= d;
        a.vx -= dx * f; a.vy -= dy * f; b.vx += dx * f; b.vy += dy * f;
      }
    for (const [a, b] of links) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = ((d - 70) / d) * 0.05 * alpha;
      a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
    }
    for (const n of nodes) {
      if (n === drag) continue;
      n.vx = (n.vx - n.x * 0.002 * alpha) * 0.82;
      n.vy = (n.vy - n.y * 0.002 * alpha) * 0.82;
      n.x += n.vx; n.y += n.vy;
    }
    alpha = Math.max(0.02, alpha * 0.995);
  };

  const draw = () => {
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.save();
    ctx.translate(rect.width / 2 + ox, rect.height / 2 + oy);
    ctx.scale(scale, scale);
    ctx.strokeStyle = color("--line");
    ctx.lineWidth = 1 / scale + 0.4;
    for (const [a, b] of links) {
      const lit = hover && (a === hover || b === hover);
      ctx.globalAlpha = hover && !lit ? 0.25 : 1;
      ctx.strokeStyle = lit ? color("--accent") : color("--line");
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const n of nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle =
        n.kind === "project" ? color("--accent") : n.kind === "keyword" ? color("--blue") : `color-mix(in srgb, ${color("--red")} ${Math.round(35 + 65 * n.heat)}%, ${color("--panel-2")})`;
      // color-mix isn't valid for canvas in every browser; fall back to the plain red.
      if (n.kind === "session" && !CSS.supports("color", ctx.fillStyle)) ctx.fillStyle = color("--red");
      ctx.globalAlpha = n.kind === "session" ? 0.45 + 0.55 * n.heat : 1;
      ctx.fill();
      ctx.globalAlpha = 1;
      if (n === hover) { ctx.lineWidth = 2; ctx.strokeStyle = color("--ink"); ctx.stroke(); }
      if (n.kind !== "session" || n === hover) {
        ctx.fillStyle = n.kind === "session" ? color("--ink") : color("--muted");
        ctx.font = `${n.kind === "project" ? 600 : 400} ${12 / Math.sqrt(scale)}px ${color("--sans")}`;
        const text = n.label.length > 60 ? n.label.slice(0, 57) + "…" : n.label;
        ctx.fillText(text, n.x + n.r + 4, n.y + 4);
      }
    }
    ctx.restore();
  };

  let running = true;
  let fitFrames = 180;
  const fit = () => {
    const pad = 60;
    const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
    const w = Math.max(...xs) - Math.min(...xs) + pad * 2 + 120;
    const h = Math.max(...ys) - Math.min(...ys) + pad * 2;
    const target = Math.min(2.2, Math.max(0.4, Math.min(rect.width / w, rect.height / h)));
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    scale += (target - scale) * 0.08;
    ox += (-cx * scale - ox) * 0.08;
    oy += (-cy * scale - oy) * 0.08;
  };
  const loop = () => {
    if (!running) return;
    if (fitFrames-- > 0 && nodes.length) fit();
    tick();
    draw();
    requestAnimationFrame(loop);
  };
  loop();
  graphStop = () => (running = false);

  canvas.addEventListener("pointerdown", (e) => {
    fitFrames = 0;
    canvas.setPointerCapture(e.pointerId);
    const n = pick(e);
    if (n) { drag = n; drag.moved = false; alpha = Math.max(alpha, 0.3); }
    else pan = { x: e.clientX - ox, y: e.clientY - oy };
  });
  canvas.addEventListener("pointermove", (e) => {
    if (drag) { [drag.x, drag.y] = toWorld(e); drag.vx = drag.vy = 0; drag.moved = true; return; }
    if (pan) { ox = e.clientX - pan.x; oy = e.clientY - pan.y; return; }
    hover = pick(e);
    canvas.style.cursor = hover ? "pointer" : "grab";
  });
  canvas.addEventListener("pointerup", () => {
    if (drag && !drag.moved && drag.noteId) location.hash = `#/note/${drag.noteId}`;
    drag = null; pan = null;
  });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    fitFrames = 0;
    scale = Math.min(4, Math.max(0.3, scale * (e.deltaY < 0 ? 1.1 : 0.9)));
  }, { passive: false });
  window.addEventListener("resize", () => (rect = size()), { once: true });
}

// ---------------------------------------------------------------- shell

function renderEmpty() {
  view.innerHTML = `<div class="empty">
    <h1>No gym sessions yet</h1>
    <p>Open one with <code>/whet-gym &lt;topic&gt;</code>, close it with <code>/whet-done</code>, and it shows up here.</p>
    <p>Already have sessions in another project? Run <code>bash scripts/session.sh register</code> there once.</p>
  </div>`;
}

function updateCount() {
  const open = state.data.study.filter((s) => inProject(s) && !s.done).length;
  document.getElementById("study-count").textContent = open || "";
}

function render() {
  if (!state.data) return;
  if (graphStop) { graphStop(); graphStop = null; }
  const [, route, arg] = (location.hash || "#/").split("/");
  document.querySelectorAll("nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === (route === "note" ? "notes" : route || "overview")));
  updateCount();
  if (route === "notes") renderNotes();
  else if (route === "note") renderNote(arg);
  else if (route === "study") renderStudy();
  else if (route === "graph") renderGraph();
  else if (route === "coach") renderCoach();
  else renderOverview();
}

async function refresh() {
  try {
    const data = await api("/api/data");
    const signature = JSON.stringify([data.sessions, data.notes, data.study]);
    const select = document.getElementById("project-filter");
    const names = data.projects.map((p) => p.name);
    if (select.options.length - 1 !== names.length) {
      select.innerHTML = `<option value="">All projects</option>` + names.map((n) => `<option>${esc(n)}</option>`).join("");
      select.value = state.project;
    }
    if (signature === state.signature) return;
    state.signature = signature;
    state.data = data;
    // Don't yank the graph or a half-typed search out from under the user.
    const route = (location.hash || "#/").split("/")[1];
    if (route !== "graph" && route !== "coach" && document.activeElement?.id !== "search") render();
    else updateCount();
  } catch (e) {
    view.innerHTML = `<div class="empty"><h1>Can't reach the dashboard server</h1><p>Start it again with <code>/whet-dash</code>.</p></div>`;
  }
}

document.getElementById("project-filter").addEventListener("change", (e) => {
  state.project = e.target.value;
  render();
});
document.getElementById("theme-toggle").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("whetstone-theme", next); } catch (e) {}
  render();
});
window.addEventListener("hashchange", render);
refresh().then(render);
setInterval(refresh, 4000);

// ---------------------------------------------------------------- coach
//
// Talks to Claude Code through the dashboard server, which runs `claude -p`
// in the chosen project with whetstone loaded. Each project keeps its own
// conversation, continued with --resume.

const coach = { project: "", busy: false, abort: null, threads: {}, model: "" };
try {
  coach.model = localStorage.getItem("whetstone-coach-model") || "";
} catch (e) {}
try {
  coach.threads = JSON.parse(localStorage.getItem("whetstone-coach") || "{}");
} catch (e) {}
const saveThreads = () => {
  try {
    // Keep the last 60 messages per project so storage stays small.
    for (const t of Object.values(coach.threads)) t.messages = t.messages.slice(-60);
    localStorage.setItem("whetstone-coach", JSON.stringify(coach.threads));
  } catch (e) {}
};
const thread = () => (coach.threads[coach.project] ??= { sessionId: null, messages: [] });

/** Markdown for coach replies: fenced code, headings, lists, paragraphs. */
function mdBlock(text) {
  const out = [];
  const parts = String(text).split(/```[a-zA-Z0-9-]*\n?/);
  parts.forEach((part, i) => {
    if (i % 2) return out.push(`<pre>${esc(part.replace(/\n$/, ""))}</pre>`);
    let list = null;
    const flush = () => {
      if (list) out.push(`<${list.tag}>${list.items.map((x) => `<li>${md(x)}</li>`).join("")}</${list.tag}>`);
      list = null;
    };
    for (const para of part.split(/\n{2,}/)) {
      for (const line of para.split("\n")) {
        const ul = line.match(/^\s*[-*]\s+(.*)/);
        const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
        const h = line.match(/^#{1,4}\s+(.*)/);
        if (ul || ol) {
          const tag = ul ? "ul" : "ol";
          if (!list || list.tag !== tag) { flush(); list = { tag, items: [] }; }
          list.items.push((ul || ol)[1]);
        } else if (h) { flush(); out.push(`<h4>${md(h[1])}</h4>`); }
        else if (line.trim()) { flush(); out.push(`<p>${md(line)}</p>`); }
      }
      flush();
    }
  });
  return out.join("");
}

const ACTIONS = [
  { label: "Open gym", needs: "What are you going to build or practise?", run: (a) => `/whetstone:whet-gym ${a}`, when: "closed" },
  { label: "Hint", run: () => "/whetstone:whet-hint", when: "open" },
  { label: "Review my work", run: () => "/whetstone:whet-review", when: "open" },
  { label: "Quiz me", needs: "Which file or topic?", run: (a) => `/whetstone:whet-quiz ${a}` },
  { label: "Rebuild from memory", needs: "Which file?", run: (a) => `/whetstone:whet-rebuild ${a}`, when: "open" },
  { label: "Explain AI code", run: () => "/whetstone:whet-explain", when: "closed" },
  { label: "Close session", run: () => "/whetstone:whet-done", when: "open" },
];

async function renderCoach() {
  const projects = state.data.projects;
  if (!projects.length) return renderEmpty();
  coach.project = coach.project || state.project || projects[0].name;
  const status = await api(`/api/status?project=${encodeURIComponent(coach.project)}`).catch(() => ({ open: false, available: false }));
  const t = thread();
  view.innerHTML = `
    <div class="coach">
      <div>
        <h1>Coach</h1>
        <p class="lede" style="margin-bottom:0">Run whetstone from here instead of the terminal. The coach works in the selected project, and the same write guard applies: during a gym session it can hint, question and review, never write your code.</p>
      </div>
      <div class="coach-bar">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <select id="coach-model" title="Model the coach runs on">
            ${[["", "Default model"], ["opus", "Opus"], ["sonnet", "Sonnet"], ["haiku", "Haiku"]].map(([v, l]) => `<option value="${v}" ${v === coach.model ? "selected" : ""}>${l}</option>`).join("")}
          </select>
          <select id="coach-project">${projects.map((p) => `<option ${p.name === coach.project ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>
          <span class="status ${status.open ? "open" : ""}">${status.open ? `<span class="dot"></span> Gym open: ${esc(status.topic)} · ${status.minutes} min · ${status.hints} hints` : "No gym session open"}</span>
        </div>
        <div class="actions">
          ${ACTIONS.map((a, i) => `<button class="action" data-action="${i}" ${(a.when === "open" && !status.open) || (a.when === "closed" && status.open) ? "disabled" : ""}>${a.label}</button>`).join("")}
          <button class="action" id="new-thread" title="Start a fresh conversation">New chat</button>
        </div>
      </div>
      <div class="transcript" id="transcript">${
        t.messages.map(messageHtml).join("") ||
        `<p class="empty" style="padding:30px">${status.available === false ? "The <code>claude</code> command was not found, so the coach can't run. Make sure Claude Code is installed and on your PATH." : "Pick an action above, or just ask the coach something."}</p>`
      }</div>
      <div>
        <form class="composer" id="composer">
          <textarea id="prompt" rows="1" placeholder="Reply to the coach, or type a /whet command" ${coach.busy ? "disabled" : ""}></textarea>
          <button class="primary" id="send" type="submit">${coach.busy ? "Stop" : "Send"}</button>
        </form>
        <p class="hint-line" style="margin-top:6px">Enter to send, Shift+Enter for a new line. Runs Claude Code on your machine with your login.</p>
      </div>
    </div>`;
  const tr = document.getElementById("transcript");
  tr.scrollTop = tr.scrollHeight;
  document.getElementById("coach-project").addEventListener("change", (e) => {
    coach.project = e.target.value;
    renderCoach();
  });
  document.getElementById("coach-model").addEventListener("change", (e) => {
    coach.model = e.target.value;
    try { localStorage.setItem("whetstone-coach-model", coach.model); } catch (err) {}
  });
  document.getElementById("new-thread").addEventListener("click", () => {
    coach.threads[coach.project] = { sessionId: null, messages: [] };
    saveThreads();
    renderCoach();
  });
  view.querySelectorAll("[data-action]").forEach((b) =>
    b.addEventListener("click", () => {
      const a = ACTIONS[Number(b.dataset.action)];
      let arg = "";
      if (a.needs) {
        arg = prompt(a.needs);
        if (!arg) return;
      }
      send(a.run(arg.trim()));
    }),
  );
  const box = document.getElementById("prompt");
  box.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      document.getElementById("composer").requestSubmit();
    }
  });
  box.addEventListener("input", () => {
    box.style.height = "auto";
    box.style.height = Math.min(180, box.scrollHeight) + "px";
  });
  document.getElementById("composer").addEventListener("submit", (e) => {
    e.preventDefault();
    if (coach.busy) return coach.abort?.abort();
    const text = box.value.trim();
    if (text) send(text);
  });
  if (!coach.busy) box.focus();
}

function messageHtml(m) {
  if (m.role === "user") return `<div class="msg user">${esc(m.text)}</div>`;
  const tools = m.tools?.length ? `<div class="tools">${m.tools.map((x) => `<span class="tool">${esc(x)}</span>`).join("")}</div>` : "";
  const body = m.text ? mdBlock(m.text) : m.pending ? `<span class="typing"><i></i><i></i><i></i></span>` : "";
  return `<div class="msg coach ${m.error ? "error" : ""}">${tools}${body}</div>`;
}

async function send(text) {
  const t = thread();
  t.messages.push({ role: "user", text });
  const reply = { role: "coach", text: "", tools: [], pending: true };
  t.messages.push(reply);
  coach.busy = true;
  coach.abort = new AbortController();
  renderCoach();
  const repaint = () => {
    const tr = document.getElementById("transcript");
    if (!tr || (location.hash || "#/").split("/")[1] !== "coach") return;
    const nearBottom = tr.scrollHeight - tr.scrollTop - tr.clientHeight < 80;
    tr.lastElementChild.outerHTML = messageHtml(reply);
    if (nearBottom) tr.scrollTop = tr.scrollHeight;
  };
  try {
    const res = await fetch("/api/coach", {
      method: "POST",
      signal: coach.abort.signal,
      headers: { "x-whetstone-token": window.WHETSTONE_TOKEN, "content-type": "application/json" },
      body: JSON.stringify({ project: coach.project, prompt: text, sessionId: t.sessionId, model: coach.model }),
    });
    if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        const ev = JSON.parse(line);
        if (ev.type === "text") reply.text += ev.text;
        else if (ev.type === "tool") reply.tools.push(ev.label);
        else if (ev.type === "session") t.sessionId = ev.sessionId;
        else if (ev.type === "error") { reply.error = true; reply.text += (reply.text ? "\n\n" : "") + ev.message; }
        repaint();
      }
    }
  } catch (e) {
    if (e.name !== "AbortError") {
      reply.error = true;
      reply.text = reply.text || `Couldn't reach the coach: ${e.message}`;
    } else reply.text += reply.text ? "\n\n_(stopped)_" : "(stopped)";
  } finally {
    reply.pending = false;
    coach.busy = false;
    saveThreads();
    if ((location.hash || "#/").split("/")[1] === "coach") renderCoach();
    refresh();
  }
}
