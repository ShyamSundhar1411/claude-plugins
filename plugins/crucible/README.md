# crucible

**The reviewer can be proven wrong, and has to write down that it was.**

Most critic patterns treat the reviewer as an oracle. This one doesn't. The builder is invited to
push back with evidence, and when the evidence is good the judge withdraws its own requirement
and records the concession. Conviction flows both ways, or the loop isn't working.

An agent that builds something and then declares it good is the worst possible judge of it. It
knows what it *meant*, it's invested in being finished, and it reads its own output charitably.
Self-approval is the most common way agentic work ships broken.

A crucible does not make the thing. It applies enough heat that only what survives comes out.

## Installation

```
/plugin marketplace add ShyamSundhar1411/claude-plugins
/plugin install crucible@axion-labs
/reload-plugins
```

The skill triggers on its own when a task calls for it, or invoke it directly:

```
/crucible audit the payment reconciliation job before we ship it
```

## What it caught

From one two-round run on a greenfield two-service app. Each of these would have shipped:

- **83 passing tests over a mechanism that didn't work.** Two acceptance criteria were green
  because the thing they tested produced empty output, so nothing could score against it. The
  judge found it by mutation-testing its own suite — then conceded that *its own formula* could
  not express the behaviour *its own spec* asserted two lines above it.
- **The same defect found twice from opposite ends, by judges who couldn't see each other.** One
  measured 8 distinct sentences across 34 generated proposals from the data side; the other
  counted the same card four times on screen. Neither knew the other was looking.
- **A canvas rendering one word across 42 nodes** — and that word was an error badge. The finding
  wasn't the symptom; it was that the geometry everyone had been fixing was never the cause.
- **Two services that had never exchanged a single request**, each independently verified against
  its own mock, the integration assumed by both.

## The three roles

| Role | Can edit | Job |
| --- | --- | --- |
| **Brain** (`crucible-brain`) | **No — enforced by its tool list** | Wears the domain hat the job needs. Writes the spec and acceptance criteria *before* anything is built. The only party that can accept. |
| **Hand** (`crucible-hand`) | Yes | Implements the spec. Reports what it could **not** do. May argue; may never declare itself finished. |
| **Referee** | Yes | Your main session. Carries verdicts, verifies cheap claims itself, commits accepted work, breaks deadlocks. |

The brain ships with `Edit`, `Write` and `NotebookEdit` **absent from its tool list**. That's
structural, not advice. It keeps `Bash`, because a judge that can't run the thing can't judge it
— the one hole in the wall, and its prompt forbids writing through it.

## How a run goes

```
Brain    read board → study the material → spec + acceptance criteria
   ↓
Hand     read board → build → post findings → report what is done AND what is not
   ↓
Referee  verify the cheap claims yourself → post to verified.md
   ↓
Brain    read board → verify independently → ACCEPT or REVISE
   ↓
         REVISE → hand revises, or argues back with evidence → brain re-judges
         …until one side is genuinely convinced
```

The loop ends when the brain accepts **or** when the hand convinces the brain its own requirement
was wrong. Both are convergence. No round cap, because a cap cuts the argument off exactly where
it earns its keep.

## Commands

| | |
| --- | --- |
| `/crucible <task>` | Run the loop |
| `/crucible-mutate <path>` | Break what the tests cover and confirm they fail. Useful standalone, and the highest-yield single check in the method |
| `/crucible-resume [board]` | Resume after an agent died — rebuilds state from the board and sends a delta, never a re-sent spec |

## The board

An append-only directory at **`<repo>/.crucible`** — committed, never in a temp directory. Every
agent reads it before starting and posts to it before stopping.

| File | Written by | Why it exists |
| --- | --- | --- |
| `spec.md` | Brain, once | So a resume never has to re-send it |
| `skills.md` | Referee | Subagents can't see the session's skill roster. A hand that doesn't know a charting or document skill exists rebuilds what it does, worse |
| `findings.md` | Hands | Facts that cost real time — toolchain traps, commands that look right and silently do nothing |
| `verified.md` | **Referee** | What's already checked, with the command and its output. The judge is told: do not re-run these |
| `deviations.md` | Hand | What it couldn't do, and where it thinks the spec is wrong |
| `verdicts.md` | Brain | Rulings — including requirements it **withdrew**, which otherwise get re-argued next round |
| `backlog.md` | Brain | Real defects that don't block, filed here instead of in the verdict |

**`verdicts.md` is the artifact most people end up valuing most.** It reads like a design review
log: what was claimed, what was independently verified, who conceded what and why. It's what you
show a reviewer, a client, or yourself in six months.

Scaffold with `scripts/init-board.sh` (defaults to `<repo>/.crucible`); it refuses to overwrite
an existing board.

> **Put it in the repo.** An earlier version of this skill suggested a session scratchpad. On a
> real run that resolved to a temp directory, the OS reaped it across a multi-day gap and took
> both specs, all ninety acceptance criteria, every ruling — and the backup stored helpfully
> beside it. A board that doesn't outlive your machine's tmp policy isn't a board.

On round one the board is close to pure overhead; it earns its keep from round two, and most of
all across a death. After one agent was lost to a rate limit, its replacement finished in **19
tool calls against the original's 70**, because it re-derived nothing.

## Splitting the brain

One reviewer judging both whether a thing *works* and whether it's *good to use* does the first
well and the second as an afterthought.

| | **Left** | **Right** |
| --- | --- | --- |
| Judges | Does it work, and is it true? | Can a person actually use it? |
| Hat | Architect, analyst, security reviewer | Designer, UX critic, copy chief |
| Rejects when | A conclusion is unsupported, a boundary leaks, a number is wrong | The hierarchy misleads, the thing is cramped, a person can't act on it |
| Evidence | Reproductions, failing cases, test runs | Screenshots at the smallest width and the largest text size |

They write their criteria **without reading each other's**, or you get agreement instead of a
second opinion. See `references/hemispheres.md`.

Splitting the brain also *creates a boundary*, and **some defects live on it** — each hemisphere
individually correct, the product broken. See `references/seam.md`: one question per round, no
extra agent.

## Cost, honestly

A measured two-round run on a two-service greenfield app: **~1.3M subagent tokens, 10 agents,
3 lost to rate limits.** Judges cost about as much as builders. Budget ~2× a plain build.

So don't reach for the full loop by default. **Crucible lite** — one brain, one hand, one round,
no board — keeps the two things doing the real work (a judge that can't edit, criteria written
before the build) and drops everything that only pays off across rounds. Scale up when a round
dies, when the work has both a logical and a visual surface, or when it crosses a seam.

Route models by role: hands on a cheaper model, judges on the one you're paying for. That alone
would have prevented every death in the run above.

## When not to use it

Mechanical or already-verified work — a rename, a dependency bump, a change with a passing test
that genuinely covers it. The overhead only pays when judgment is involved and being wrong is
expensive.

## License

MIT
