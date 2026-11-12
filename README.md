# Axion Labs — Claude Code plugins

Workflow plugins for [Claude Code](https://claude.com/claude-code).

## Installation

```
/plugin marketplace add ShyamSundhar1411/claude-plugins
/plugin install crucible@axion-labs
/plugin install whetstone@axion-labs
/reload-plugins
```

Run `/plugin` to browse what the marketplace offers.

## Plugins

| Plugin | What it does |
| --- | --- |
| [**crucible**](plugins/crucible) | Splits building from judging across two agents that can each overrule the other, so work is accepted by something that did not build it. |
| [**whetstone**](plugins/whetstone) | A coach that cannot write your code: a hook blocks Claude's edits during a gym session, so you get questions, graded hints and a review with no fixes. |

## Repository layout

```
.claude-plugin/marketplace.json   the marketplace manifest — what makes this repo installable
plugins/
  crucible/
    .claude-plugin/plugin.json    plugin metadata
    skills/crucible/              the skill itself
    README.md                     full documentation
  whetstone/
    .claude-plugin/plugin.json    plugin metadata
    skills/ agents/ commands/     the coaching rules, the read-only examiner, the commands
    hooks/ scripts/               the write guard and session ledger
    README.md                     full documentation
```

Each plugin is self-contained. Adding another means a new directory under `plugins/` and a new
entry in the marketplace manifest.

## License

MIT — see [LICENSE](LICENSE).
