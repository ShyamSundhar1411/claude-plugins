---
description: Mutation-test a suite — break what the tests cover and confirm they fail. Tells a real test from one that passes vacuously.
argument-hint: [path or module to mutate, e.g. src/pricing/]
---

Mutation-test the code at **$ARGUMENTS** (if nothing was given, infer the module most recently changed, and say which you chose and why).

This is the single highest-value check in a crucible run, and it is useful on its own. "The suite passes" is a claim about the suite, not about the code. A test that passes whatever you do to the thing it names is worse than no test, because it buys false confidence that nobody audits again.

## Method

**Do not write mutations to disk.** Apply them in memory — re-exec the mutated module source into its live module dict, monkeypatch the symbol, or use the language's equivalent — then run the suite in-process. A mutation left on disk after a crash is a corrupted working tree, and the whole point is to leave no trace.

Pick mutations that target **what the tests claim to cover**, not random character edits. Good ones, in rough order of yield:

- Invert a boundary: `<` → `<=`, `>` → `>=`
- Neutralise a term: a scoring component → constant 0, a weight → 1
- Remove a guard: drop a tie-break from a sort key, drop a validation branch
- Break an invariant the code maintains: skip a canonicalisation, skip a de-duplication
- Degrade rather than delete: replace a precise discriminator with a cruder one. **These are the revealing ones** — a suite that catches deletion but not degradation is only testing that the code runs.
- Revert a recent fix: if a round just fixed something, mutating that fix back must fail the test written for it

## What to report

A table: mutation, what it changed, and **which tests failed by name**.

Then the three things that actually matter:

1. **Survivors** — mutations no test caught. For each, say whether it is a genuine coverage hole or an *equivalent mutant* (a change that provably cannot alter behaviour — e.g. removing a tie-break from an already-sorted list). Equivalent mutants are not gaps, and calling them gaps wastes the next round.
2. **Clustering.** Scattered survivors are noise. **Survivors that fall in the same code path are the finding** — that path is unguarded, and the count matters less than the shape.
3. **Caught by name, or caught by accident?** A mutation killed by the test whose name claims to cover it is real coverage. One killed only by a golden file or a broad integration test means the behavioural rule has no named guard — record it so a later clean run is not mistaken for coverage of that line.

Finally: **check your own check.** Confirm at least one mutation you expected to be caught *was* caught, and that your harness actually ran the suite. A mutation harness that silently fails to apply anything reports a perfect score.
