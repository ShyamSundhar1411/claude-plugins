# claude-plugins

Workflow plugins for [Claude Code](https://claude.com/claude-code).

## Install

```bash
/plugin marketplace add ShyamSundhar1411/claude-plugins
/plugin install brain-hand@claude-plugins
```

Then restart Claude Code, or run `/plugin` to browse what the marketplace offers.

## Plugins

### brain-hand

An agent that builds something and then declares it good is the worst possible judge of it: it
knows what it *meant*, it is invested in being finished, and it reads its own output
charitably.

`brain-hand` splits those jobs between two agents that can each overrule the other — a
read-only **brain** that writes the spec and acceptance criteria before anything is built and
is the only party that can accept the result, and a **hand** that builds and must report what
it could *not* do. They argue until one is genuinely convinced, which includes the brain
withdrawing its own requirement when the hand brings better evidence.

A shared **blackboard** carries findings, pre-verified checks, deviations and verdicts between
rounds, so agents stop re-deriving each other's work and a death to a rate limit costs the
round rather than the knowledge.

Use it when quality matters more than speed: building to a standard, auditing, reviewing — any
task where "it ran without errors" is not the same as "it does the job".

**Why this and not an existing plugin.** The insight that a separate adversarial verifier
catches what self-verification misses is not new — Anthropic's `math-proof:siege` runs rounds
of judge and worker sub-agents, `math-olympiad` attacks proofs with fresh-context verifiers,
and `code-review` scores PR findings across multiple agents. Each is excellent and each is
domain-locked: proofs, competition maths, pull requests.

`brain-hand` differs in three ways. It is **domain-general** — the brain wears whatever hat the
job needs, and the spec is written before anything is built rather than derived from the
artifact afterwards. Conviction runs **both directions**: the loop also ends when the hand
convinces the brain that its own requirement was wrong, which a one-way verifier cannot do.
And the **blackboard** persists findings, pre-verified checks and withdrawn requirements across
rounds, so a long run does not re-derive itself and an agent lost to a rate limit costs the
round rather than the knowledge.

## Repository layout

```
.claude-plugin/marketplace.json     the marketplace manifest — what makes this repo installable
plugins/
  brain-hand/
    .claude-plugin/plugin.json      the plugin manifest
    skills/brain-hand/              the skill itself
      SKILL.md
      references/                   prompt templates, the three-layer variant
      scripts/init-board.sh         scaffolds a blackboard
```

## License

MIT
