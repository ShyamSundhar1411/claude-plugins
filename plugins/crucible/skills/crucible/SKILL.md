---
name: crucible
description: 'Run work through adversarial agents — a read-only "brain" that specs and judges, and a "hand" that builds — arguing until one is genuinely convinced, coordinating through a shared blackboard so nothing is re-derived. The brain can split into a left hemisphere judging whether the work is correct and a right hemisphere judging whether a person can actually use it, for anything with both logic and a visual or written surface. Use this whenever quality matters more than speed and a single agent would mark its own homework: building something to a standard (dashboards, reports, UIs, APIs, docs), auditing or reviewing work, or any task where "it ran without errors" is not the same as "it does the job". Reach for this when the user says review, critique, audit, get a second opinion, get it right, make it actually good, check the design, or have something verify this — and also when you notice you are about to both build and approve the same thing.'
---

# Crucible

One agent building and then declaring its own work good is the single most common way agentic work ships broken. The agent that built it is the worst possible judge of it: it knows what it *meant*, it is invested in being finished, and it will read its own output charitably.

A crucible does not make the thing. It applies enough heat that only what can survive comes out. This skill is that vessel: it splits building from judging across agents who can each overrule the other, and lets them argue until one is actually convinced.

```
crucible
 ├─ brain            read-only. specs the work, and is the only thing that can accept it
 │   ├─ left         judges whether it is correct and true
 │   └─ right        judges whether a person can actually use it      (optional split)
 ├─ the board        the only channel between them — findings, verdicts, what is already checked
 └─ hand             builds. may argue, may never declare itself finished
```

## The roles

**Brain** — the product manager. Wears whatever domain hat the job needs: BI analyst, architect, security reviewer, UX critic, editor, domain expert. It decides what "good" means *before* anything is built, writes the spec with acceptance criteria, and is the only party that can accept the result.

**Hand** — the engineer. Implements the spec. Reuses what exists before creating something new. Reports honestly on what it could not do. It may argue with the brain, but it may never declare the work finished.

**Referee** — you, the main session. Carry verdicts between them, hold the bar, keep the blackboard honest, commit accepted work, and break deadlocks.

## The three rules that make it work

Everything else is detail. These are load-bearing:

**1. The brain cannot edit anything.** Give it read-only work — reading, browsing, measuring, screenshotting. The moment a judge can fix what it is judging, it stops judging and starts finishing. Read-only is what keeps its incentives clean.

**2. The hand cannot approve its own work.** Only the brain's verdict ends the loop. The hand's job is to report what it did *and what it failed to do* — ask for that failure list explicitly, because a hand that reports "all criteria met" every time is telling you nothing.

**3. Acceptance criteria are written before the build.** A spec without them invites the brain to invent fresh objections each round, which is how loops turn into bickering. Criteria must be checkable by someone else:

> - "Every question label is fully readable without hovering."
> - "From the headline number I can reach a named individual record in at most two clicks."
> - "Every number carries a comparison — target, prior period, peer, or share of total."

Not checkable, therefore useless: *"looks good"*, *"is insightful"*, *"follows best practices"*.

## The blackboard

Agents in this loop are expensive and forgetful. Without a shared place to put things, each one re-reads the same files, re-discovers the same environment quirks, and re-verifies the same claims — and every death to a timeout or rate limit throws that work away.

So the loop keeps a **blackboard**: a directory of append-only notes that every agent reads before it starts and posts to before it stops. It is the same move as a shared workspace in any multi-agent architecture — agents coordinate through the board rather than by being handed ever-longer prompts.

```
<scratchpad>/crucible/
  spec.md         the brain's spec and acceptance criteria — written once, read by everyone
  skills.md       what skills are installed, so a hand reuses rather than rebuilds
  findings.md     facts discovered the hard way: env quirks, file locations, API shapes
  verified.md     what the referee has already checked, with the command and the result
  deviations.md   what the hand could not do, and why
  verdicts.md     rulings, and what each side conceded
  backlog.md      real defects, deliberately deferred
```

Run `scripts/init-board.sh <dir>` to scaffold it, or just create the files.

**The rules that make the board pay for itself:**

- **Read the board first.** Every prompt you write — brain, hand, judge — starts with "read `<board>/` before you begin." An agent that already knows the toolchain gotcha does not spend twenty minutes rediscovering it.
- **`findings.md` is for facts that cost something to learn.** *"The standalone toolchain on PATH shadows the IDE's and fails with a misleading missing-type error; prefix commands with the explicit path"* saves the next agent an hour. *"The project uses SwiftUI"* saves nothing. Tell agents to post the former and skip the latter.
- **`verified.md` is the referee's channel, and it is where the real savings are.** You can check a claim far more cheaply than a judge agent can. Run the test suite, run the greps, diff the file — then post the result and tell the judge *"pre-verified, do not re-run."* A judge that re-derives what you already know is paying full price for a fact you own.
- **`skills.md` is yours to post, and only you can.** Subagents cannot see the session's skill roster; you can. A hand that does not know a `dataviz` or a `pdf` or a house-standards skill exists will rebuild what it does, worse. At init, list the handful that a hand on *this* job might reach for — not the whole roster, which is a reading tax. This is how the loop composes with everything else the user has installed instead of reinventing it.
- **Tag a finding with what it applies to.** A board accumulates findings from every part of a system, and an agent working on one part pays reading cost for all of them. Lead each entry with its scope — `[backend/python]`, `[ios build]` — so an agent can skip what cannot apply to it. Untagged, a board of thirty findings is a tax, not an asset.
- **Post before you stop.** An agent that dies with its findings in its head leaves nothing. One that posted as it went leaves a working trail.
- **The board is append-only and attributed.** Who claimed it, and when. A finding that later turns out wrong gets a correction entry, not a silent edit — the next agent needs to see it was contested.

**Be honest about when it pays.** On round one the board is nearly empty, so reading it is close to pure overhead — a smoke test of exactly this returned "mostly ceremony: the useful entry saved a two-minute lookup, and the detailed ones were about a part of the system my task never touched." That is the expected shape. The board earns its keep from round two onward, and most of all across a death and a resume, where the alternative is an agent rediscovering what a dead one already knew. If your whole job is one round, skip the board and just brief the agents directly.

The board is also what makes **resuming cheap**. When an agent dies — and over a long run they do — the resume message is a *delta*, not a re-sent spec: what died, what is on disk now, what remains. Everything else is on the board.

## The loop

```
Brain: read board → study material → write spec + criteria → post to spec.md
   ↓
Hand: read board → build → post findings + deviations → report what's done AND what isn't
   ↓
Referee: verify the cheap claims yourself → post to verified.md
   ↓
Brain: read board → verify independently → ACCEPT or REVISE → post to verdicts.md
   ↓
   REVISE → Hand revises (or argues back with evidence) → Brain re-judges
   ↓
   ...until one side is genuinely convinced
```

**Run it until someone is convinced — not for a fixed number of rounds.** The loop ends when the brain accepts the work, *or* when the brain is persuaded its own requirement was wrong and withdraws it. Both are convergence. A round cap would cut off the argument exactly when it is doing its job.

**Expect conviction to flow both directions.** In real runs the brain concedes often — that its spec contained a measurement error, that a file path it cited did not exist, that a requirement written for an earlier design no longer applied. None of those corrections happen with one agent, or with a hand that cannot push back. When the brain concedes, record it in `verdicts.md`: a withdrawn requirement that is not written down comes back next round.

**Deadlock is the exception, not the cap.** If a third exchange produces no movement — the same objection restated, the same defence restated — stop and bring both positions to the human. That is a genuine disagreement about what "good" means, and it is the human's call, not something to burn more rounds on.

## Judging requires interaction, not observation

The brain must *use* the thing, not look at it. Its best findings come from interacting — following a number to the record it rests on, running the query, booting the app, curling the endpoint. Tell it to verify claims **itself** rather than trusting the hand's report. A report is a claim, not evidence.

The sharpest version of this is **reproducing the failure**. A brain that writes "this could cite a record it was forbidden to see" has an opinion; one that pastes the two-line output showing it happening has a blocker nobody can argue with. Ask for that.

The same applies to tests: a brain that mutation-tests a claim — break the thing the test covers, confirm the test fails — can tell a real test from one that passes vacuously. Worth asking for whenever a round's headline evidence is "and I added tests".

## Keep the brain in its hat

This is the failure mode that costs the most, and it is easy to miss because the output still looks like good work.

A brain told to interact will start finding **defects**, and defects are seductive — concrete, provable, satisfying to report. Within a round or two your product manager is filing bug reports: a dropdown with the wrong default, a label clipped at some width, an option list that should be filtered. All real. None of them the PM's job. Meanwhile nobody is asking the only question the PM was hired for — *can the audience make the decision this was built for?*

Two disciplines keep it in role:

**The brain rejects in the language of its hat.** A product manager blocks because a decision cannot be made from the result. A security reviewer blocks because something is exploitable. An editor blocks because the argument does not land. Defects it stumbles across go to `backlog.md` — they do not appear in the verdict unless they break the decision. Say this to the brain directly: *"You are not QA. Report defects separately. Reject only on whether this does the job for its audience."*

Something like a clipped label can legitimately become a blocker — but only via the hat: *"this exhibit goes to an audit committee, and a truncated legend is not cosmetic there."* If the brain cannot make that connection, it is a bug, not a rejection.

**Do not smuggle technical criteria into the brain's spec.** You will be tempted to add the constraint you know matters — a schema rule, an API limit, a framework gotcha. The moment you do, the brain adopts that register and judges in it for the rest of the run. One injected constraint about which measures were legal against which table was enough to tip a business spec into an engineering one. Keep those in the **hand's** brief, where they belong: the hand must satisfy them, the brain must never have to know they exist.

## The instruction that produces real rejections

State this to the brain explicitly:

> A result can satisfy every acceptance criterion and still fail the job. If that is what you find, say so.

Without it you get compliant checklist-ticking. With it, a brain will accept nine of nine criteria and still reject the work — because the thing was built to prove a finding and then could not open the evidence for it. *"Nine boxes tick. The evidence pack does not close."*

That failure mode — passes the spec, misses the point — is exactly what a single agent never catches.

## Sizing a round

Long single agents are fragile. They hit context limits, rate limits and timeouts, and every death costs restart overhead even with a good board.

**Scope each hand round to what fits comfortably in one session window.** Split by *file set*, not by spec section — two hands must never write the same file, but adjacent sections of a spec often touch one. If a spec has six sections over twenty files, two rounds of ten files beats one round of twenty.

Keep rounds sequential when they share files, and parallel only when the file sets are provably disjoint. A read-only brain can always run alongside a writing hand.

Tell hands to read narrowly, too: ranges over whole files when they only need a region, and no re-reading what they have already seen. Re-reading large files is where a hand's budget quietly goes.

Two variants, each in `references/`, to read when the job calls for them:

- **`hemispheres.md`** — split the brain in two when the work has both a logical substrate and a human-facing surface. **Left** judges whether it works and is true; **right** judges whether a person can use it. One reviewer doing both does the first well and the second as an afterthought: the reviewer deep in correctness does not notice a heading breaking mid-word, and the one reading as a person does not notice a record citing data it was forbidden to see. Left writes the spec and delegates the surface; neither reads the other's criteria before writing, or you get agreement instead of a second opinion.
- **`specialist.md`** — put a domain expert *between* brain and hand when the gap between what the business wants and what the code does is wide enough that the brain would need a glossary. The brain then never sees code, so hat drift becomes structurally impossible rather than a rule someone has to remember.

Both cost an extra agent per round. Default to one brain and reach for these when the specific risk they address is real.

## Writing the prompts

Full templates are in `references/prompts.md` — read it when you are about to write one. The shape:

**Brain, spec phase.** Point it at the material and require the spec be grounded in what it actually found, not what it assumes. Ask for: the audience and the decision at stake, the acceptance criteria, and — valuable and usually skipped — what it *wanted* to specify but the system cannot support, and what would unlock it.

**Hand, build phase.** Give it the brain's spec verbatim as its definition of done, plus your technical constraints. Tell it to check what exists and upgrade that before creating something new, or you accumulate near-duplicates. Require an honest list of unmet criteria. Invite it to push back with evidence when the spec is wrong — this is where much of the value comes from.

**Brain, judge phase.** Give it its own criteria back, the hand's declared deviations, and `verified.md` with an explicit "do not re-run these". Require a ruling on every deviation. Ask for two lists: **blockers** (the job isn't done) and **defects** (real problems that don't block) — the split is what keeps it in its hat and stops everything reading as equally fatal. End with a single unambiguous line: `VERDICT: ACCEPT` or `VERDICT: REVISE` followed by numbered, implementable changes.

**Resume, after a death.** A delta: what died mid-sentence, what is on disk now (paste the actual `git status`), what remains, and "the board has the rest." Never re-send the spec.

## Operational hazards

Boring, and they will bite you:

- **Never run two writing agents on the same file.** They silently clobber each other. Read-only agents can run alongside a writer safely; two hands cannot. Split by file, or run them in sequence.
- **Commit each accepted increment.** Long-running agents die. Anything uncommitted when one dies is at risk. If the user has not authorised commits, snapshot a patch to the scratchpad instead — then say so.
- **Verify the work survived a death.** When an agent dies mid-task, check the tree before resuming: it may have left scaffolding, a half-finished edit, or a temporary revert it made to capture a "before" state. A half-applied refactor that still compiles is the dangerous case.
- **Check your own verification commands.** A command that silently does nothing will happily tell you everything is fine — a tool invoked without its subcommand, a grep against a path that moved. If a check returns a suspiciously clean result, confirm it ran the thing you think it ran before you report it.
- **Cost is real.** Each full round is a build plus an independent verification pass. Use this where correctness matters; don't use it to rename a variable.

## When not to use this

Mechanical or already-verified work — a rename, a dependency bump, a change with a passing test that genuinely covers it. The overhead only pays for itself when judgment is involved and being wrong is expensive.

## Worked shape

```
0. Referee: init the board. Post anything you already know to findings.md.
1. Brain (read-only): "Read <board>/. Study X. Write a spec: audience, the decision
   at stake, the questions it must answer, and acceptance criteria I can check
   without asking you. Also: what you wanted but the system can't support."
2. Hand: "Read <board>/. Here is the spec. Build it. Check what exists and upgrade
   it before creating new. Post findings as you go. Report what you could NOT meet.
   Push back with evidence if a requirement is wrong."
3. Referee: verify the cheap claims yourself → verified.md.
4. Brain (read-only): "Read <board>/. Here are your criteria, the hand's deviations,
   and what I already verified — don't re-run those. Verify the rest yourself. Rule
   on every deviation. You are not QA: defects go to backlog.md and you reject only
   on whether this does the job for its audience. Remember a result can tick every
   box and still fail the job. VERDICT: ACCEPT or REVISE."
5. Referee: accepted → commit. Revised → back to the hand with the blockers only.
   Stuck after three exchanges with no movement → take both positions to the human.
```
