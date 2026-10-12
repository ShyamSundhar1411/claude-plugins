---
description: Resume a crucible run after an agent died — rebuilds state from the board and sends a delta, never a re-sent spec.
argument-hint: [optional: board path, if not ./.crucible]
---

Resume the crucible run whose board is at **$ARGUMENTS** (default `./.crucible`).

Agents die. Over a long run they hit rate limits, context limits and stall watchdogs, and every death costs restart overhead. The board exists so that a death costs the *round*, not the *knowledge* — but only if the resume is done as a **delta** rather than a re-sent brief.

## 1. Read the board, then measure the world yourself

Read `spec.md`, `verdicts.md`, `verified.md`, `findings.md`, `deviations.md`. That tells you what was *supposed* to happen.

Then find out what actually did — **do not trust the board about the working tree**:

```
git status --short
git log --oneline -5
<the project's test command>
<the project's build command>
```

## 2. Check whether the work survived the death

This is the step people skip, and the dangerous case is specific: **a half-applied refactor that still compiles.** An agent killed mid-edit may have left scaffolding, a renamed-but-unreferenced symbol, or a temporary revert it made to capture a "before" state.

So do not take a green build as proof of coherence. Look at the file the agent died in. If it was mid-replacement of one approach with another, check whether *both* are present and whether both are called on purpose.

## 3. Post what you measured to `verified.md`

Before resuming anything, write down what you now know to be true, with the command and its real output. The resumed agent must not pay to rediscover it.

## 4. Send a delta, never the spec

The board already holds the spec. The resume message is short:

```
You were killed by <rate limit / timeout / stall> mid-sentence, at "<its last words>".
Resume — do not restart, and do not redo what is on disk.

State as I measured it just now, so you need not rediscover it:
<paste the actual git status / test output / build result>

Your work is <committed as <sha> / snapshotted to <path>>, so nothing is at risk.

## What remains
<numbered, short>

## One thing to resolve before you finish, because the brain will raise it
<the judgement call you can see coming, with the options and which you lean toward>

Everything else from your original brief stands. The board has the rest: <board path>
```

**Reassure it that the work is safe.** A hand that fears it lost its output re-verifies everything, which is the expensive failure mode this command exists to avoid.

Prefer resuming the *same* agent by name or id where your harness supports it — it keeps its own reasoning and costs far less than a fresh agent re-reading the same files. A resumed agent on a good board typically finishes in a fraction of the tool calls the original spent.

## 5. If the board itself is gone

Boards kept in a temp directory get reaped. If `.crucible/` is missing, reconstruct it from the richest surviving source — the main session's transcript, the commit messages, the PR description — and **write it into the repo this time**, not a scratch directory. Then note in `findings.md` that it was lost and rebuilt, so the next agent knows which entries are reconstructions rather than contemporaneous notes.
