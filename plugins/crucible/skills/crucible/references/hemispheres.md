# Splitting the brain: left and right

One brain judging both whether a thing *works* and whether it is *good to use* tends to do the
first well and the second as an afterthought. The two require different attention. A reviewer
deep in correctness does not notice that a heading breaks mid-word; a reviewer reading the
screen as a person would does not notice that a record cites data it was forbidden to see.

So for work with both a logical substrate and a human-facing surface, split the brain in two.

> The left/right labels here are a working metaphor, not neuroscience — the popular
> logical-versus-creative hemisphere story does not survive contact with the literature. They
> are used because they are memorable and because the division of labour is real.

## The two hemispheres

| | **Left** | **Right** |
| --- | --- | --- |
| Judges | Does it work, and is it true? | Is it good to use, read, or look at? |
| Hat | Architect, data analyst, security reviewer, editor-of-fact | Designer, UX critic, copy chief, art director |
| Handles | Language as *content* — the claim, the logic, the arithmetic, the sequence | Language as *tone* — how it sounds, what it implies, whether it condescends or lands; and everything spatial and visual |
| Asks | Does the evidence support the claim? Does the structure hold? Is anything asserted that was not measured? | Can the person in front of this understand it? Is it cramped, cold, confusing, ugly? Does it respect them? |
| Rejects when | A conclusion is unsupported, a boundary leaks, a number is wrong | A person cannot act on it, the hierarchy misleads, the wording is patronising or evasive, the thing is unpleasant to use |
| Evidence it brings | Reproductions, failing cases, queries, greps, test runs | Screenshots at real sizes, the smallest screen, the largest text, a walk through the actual flow |

Both are read-only. Both can reject. Neither can edit.

The division of *language* is the one people get wrong. Both hemispheres handle words. Left owns
what a sentence **claims** — is it supported, is the arithmetic right, does the argument follow.
Right owns what it **sounds like** — whether a caveat reads as honest or as a brush-off, whether
an error message blames the user, whether a refusal respects them. A suppression reason that is
factually correct and reads as a shrug passes left and fails right, and right is right to fail it.

## The corpus callosum

Two specialists that must still work on almost everything together need a bridge, or they
fragment. The blackboard is that bridge, and when you split the brain it stops being a
convenience and becomes structural: it is the only channel through which the hemispheres share
context, because they deliberately do not read each other's criteria.

So with a split brain, the board is not optional. Left posts the spec and the surface it is
delegating; right posts its experience criteria; the hand posts findings both will need; the
referee posts what it has already verified for both. Severed, you get two reviewers judging
different things with no shared picture of the work — which is worse than one reviewer, not
better.

## How they coordinate

**Left is the entry point.** It writes the spec, because the spec is mostly a claim about what
must be true. When the work has a surface a human will look at or read, left delegates that
surface to right rather than guessing at it:

```
Left     writes the spec and the correctness criteria
   │
   ├── has this work a human-facing surface?
   │      no  → proceed as an ordinary two-agent loop
   │      yes → delegate the surface to Right
   │
Right    writes the experience criteria for that surface, in its own language
   │
   ▼
Hand     builds against both sets
   │
Left     judges correctness        Right   judges the experience
   │                                 │
   └──────────► one verdict ◄────────┘
```

**Left integrates the verdict, but may not overrule right inside right's domain.** If right
says the screen is unusable, that is a blocker even when every correctness criterion passes —
and the reverse holds too. A hand that satisfies one hemisphere and fails the other has not
finished. If the two genuinely conflict (a safety caveat right calls clutter; a layout left
calls dishonest), that is a deadlock for the human, not something left decides by seniority.

**They do not read each other's drafts before writing.** Right writing its criteria after
reading left's turns into agreement rather than a second opinion — the same reason the bidders
in a contest are kept blind. Both read the board; neither reads the other's spec until both
are posted.

## What right needs that left does not

Right cannot judge a surface it has not seen. Give it the means to look:

- **Rendered output, not descriptions.** Screenshots from a real device or simulator, the page
  opened, the document as it prints. A report that something "renders cleanly" is a claim.
- **The hostile cases.** The smallest supported width. The largest accessibility text size.
  Dark mode. Empty state, error state, one-item state, two-hundred-item state. Most design
  failures live in these and none of them appear in a happy-path screenshot.
- **Permission to reject on feel.** Right's whole value is judgement that does not reduce to a
  checklist. It still has to say *why* in terms of the person using the thing — "a heading
  broken mid-word is the cramping this screen exists to remove" is a reason; "feels off" is not.

## When to use the split

Use it when the work has both halves and getting either wrong is expensive: an app, a
dashboard, a report that will be read by people who did not commission it, a document that has
to persuade.

Skip it when the work has no human-facing surface — a migration, a parser, an API nobody reads
raw. A right hemisphere with nothing to look at will invent a surface to review, which wastes a
round and teaches the hand nothing.

Skip it also when cost dominates: this is three agents per round rather than two. Default to
one brain, and split when confabulation about the *experience* is the specific risk.

## Prompt sketches

**Left, spec phase** — the ordinary brain prompt, plus:

```
This work has a human-facing surface: <what it is>. Do NOT write experience or visual criteria
for it — a second reviewer owns that and will write them without seeing yours, so that we get a
second opinion rather than an echo. Name the surface and what it is for, and stop there.
```

**Right, spec phase:**

```
You are the RIGHT hemisphere of a crucible loop, and you are READ-ONLY.

Your hat: <designer / UX critic / copy chief>. You judge one thing — whether the person in
front of this can use it, read it, and act on it without being confused, cramped or patronised.
You do not judge correctness; another reviewer owns that and will catch what you leave.

Read <board>/ first.

<the material, and the means to see it rendered>

Write experience criteria — numbered, each checkable from a screenshot or a short interaction
by someone who did not build it. "No screen requires horizontal scrolling at 375pt" is a
criterion. "Looks clean" is not. Include at least one criterion for the smallest supported size
and one for the largest text size, because that is where this kind of work fails.

Also say what you wanted and the system cannot support.
```

**Right, judge phase** — the ordinary judge prompt, plus:

```
Judge from the rendered artifacts, not from the hand's description of them. If you were not
given a view of a state you need to rule on, say so and name the state — an unverified
criterion is a better answer than a guessed one.

Reject only on whether a person can use this. Correctness defects you happen to notice go to
backlog.md for the other reviewer; they are not your blockers.
```
