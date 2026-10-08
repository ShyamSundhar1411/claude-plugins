# crucible

An agent that builds something and then declares it good is the worst possible judge of it. It
knows what it *meant*, it is invested in being finished, and it reads its own output
charitably. Self-approval is the most common way agentic work ships broken.

A crucible does not make the thing. It applies enough heat that only what can survive comes out.
`crucible` is that vessel: it splits building from judging across agents that can each overrule
the other, and makes them argue until one is genuinely convinced.

## Installation

```
/plugin marketplace add ShyamSundhar1411/claude-plugins
/plugin install crucible@shyam-plugins
/reload-plugins
```

The skill triggers on its own when a task calls for it. You can also invoke it directly:

```
/crucible audit the payment reconciliation job before we ship it
```

## The three roles

| Role | Can edit | Job |
| --- | --- | --- |
| **Brain** | No — read-only, structurally | Wears the domain hat the job needs. Writes the spec and acceptance criteria *before* anything is built. The only party that can accept the result. |
| **Hand** | Yes | Implements the spec. Reports what it could **not** do. May argue with the brain; may never declare itself finished. |
| **Referee** | Yes | Your main session. Carries verdicts, verifies cheap claims itself, commits accepted work, breaks deadlocks. |

The read-only constraint on the brain is the load-bearing part. A judge that can fix what it is
judging stops judging and starts finishing.

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

The loop ends when the brain accepts the work **or** when the hand convinces the brain that its
own requirement was wrong. Both are convergence. There is no round cap, because a cap would cut
the argument off exactly where it earns its keep.

## The blackboard

Agents are expensive and forgetful. Without somewhere shared to put things, each one re-reads
the same files, rediscovers the same environment quirks, and re-verifies the same claims — and
every agent lost to a timeout or a rate limit takes its findings with it.

So the loop keeps an append-only board that every agent reads before starting and posts to
before stopping:

| File | Written by | Why it exists |
| --- | --- | --- |
| `spec.md` | Brain, once | So a resume never has to re-send it |
| `skills.md` | Referee | What else is installed. Subagents cannot see the session's skill roster, so a hand that does not know a charting or document skill exists rebuilds what it does, worse |
| `findings.md` | Hands | Facts that cost real time to learn — toolchain traps, non-obvious locations, commands that look right and silently do nothing |
| `verified.md` | **Referee** | What has already been checked, with the command and its output. The judge is told: do not re-run these |
| `deviations.md` | Hand | What it could not do, and where it thinks the spec is wrong |
| `verdicts.md` | Brain | Rulings — including requirements it **withdrew**, which otherwise get re-argued next round |
| `backlog.md` | Brain | Real defects that do not block, filed here instead of in the verdict |

`verified.md` is where most of the saving is: you can check a claim far more cheaply than a
judge agent can, and a judge re-deriving a fact you already own pays full price for it.

Scaffold one with `scripts/init-board.sh <dir>`; it refuses to overwrite an existing board.

**When it pays, and when it does not.** On round one the board is nearly empty, so reading it
is close to pure overhead. A smoke test of exactly that case reported it as "mostly ceremony" —
the one useful entry saved a two-minute lookup, and the detailed entries described a part of the
system that task never touched. The board earns its keep from round two onward, and most of all
across an interrupted agent, where the alternative is the next one rediscovering what the dead
one already knew. For a single-round job, skip it and brief the agents directly.

## Splitting the brain

One reviewer judging both whether a thing *works* and whether it is *good to use* does the
first well and the second as an afterthought. For work with both a logical substrate and a
human-facing surface, the brain splits in two:

| | **Left** | **Right** |
| --- | --- | --- |
| Judges | Does it work, and is it true? | Can a person actually use it? |
| Hat | Architect, analyst, security reviewer | Designer, UX critic, copy chief |
| Rejects when | A conclusion is unsupported, a boundary leaks, a number is wrong | The hierarchy misleads, the thing is cramped, a person cannot act on it |
| Evidence | Reproductions, failing cases, test runs | Screenshots at the smallest width and the largest text size |

Left writes the spec and delegates the surface. Neither reads the other's criteria before
writing — otherwise right agrees with left instead of giving a second opinion. Left integrates
the verdict but cannot overrule right inside right's domain: an unusable screen is a blocker
even when every correctness criterion passes.

This is an extra agent per round, so it is opt-in. Reach for it when both halves matter and
getting either wrong is expensive. Skip it when there is no human-facing surface — a right
hemisphere with nothing to look at will invent something to review.

Full detail in [`references/hemispheres.md`](skills/crucible/references/hemispheres.md).

## When to use it

Work where "it ran without errors" is not the same as "it does the job" — building to a
standard, auditing, reviewing, anything a single agent would mark its own homework on.

**When not to.** Mechanical or already-verified work: a rename, a dependency bump, a change
with a test that genuinely covers it. Each round is a build plus an independent verification
pass, so the overhead only pays for itself when judgment is involved and being wrong is
expensive.

## What it costs

A full round is two agents doing real work, and a run is several rounds. On a multi-day project
this ran to roughly 700k subagent tokens across three rounds, with long single agents hitting
session limits more than once.

The skill is built to absorb that: the blackboard means an interrupted agent costs the round
rather than the knowledge, and rounds are meant to be scoped by file set so each fits inside one
session window. Budget for it anyway.

## Prior art

The insight that an adversarial verifier catches what self-verification misses is not new.
Anthropic's `math-proof:siege` runs rounds of judge and worker sub-agents, `math-olympiad`
attacks proofs with fresh-context verifiers, and `code-review` scores pull-request findings
across several agents. Each is good, and each is domain-locked — proofs, competition
mathematics, pull requests.

`crucible` differs in three ways:

- **Domain-general.** The brain wears whatever hat the work needs, and the spec is written
  before anything is built rather than reverse-engineered from the artifact afterwards.
- **Conviction runs both ways.** The loop also ends when the hand convinces the brain its own
  requirement was wrong — something a one-directional verifier cannot do.
- **State persists.** The blackboard carries findings, pre-verified checks and withdrawn
  requirements between rounds, so a long run does not re-derive itself.

## Maturity

Version 1.2.0. Honest status:

- The loop itself has been run end to end on a production-sized project and found defects a
  single agent did not: a citation path that would have silently promoted suppressed records,
  a fabricated UI card shipping to users, a safety verdict hardcoded to `pass`, and several
  false claims in a repository's own documentation. It also produced several occasions where
  the judge was argued out of its own requirement.
- That evidence comes from **one** project with one person as referee. It has not been
  validated across domains or operators.
- The blackboard was smoke-tested on a real round and reported back as mostly ceremony for a
  first round — see the note above. The hemisphere split formalises something that worked in
  practice (separate architecture and design reviewers finding disjoint classes of defect) but
  has not been run under this skill's own prompts.
- There is no automated eval suite. Benchmarking it means spawning real loops, which is
  expensive; contributions welcome.

## Contents

```
skills/crucible/
  SKILL.md                    the loop, the board, the hazards
  references/prompts.md       templates for the four prompts a run needs
  references/hemispheres.md   the left/right split for work with a human-facing surface
  references/specialist.md    the three-layer variant for deep domains
  scripts/init-board.sh       scaffolds a blackboard
```

## License

MIT — see the [repository root](../../LICENSE).
