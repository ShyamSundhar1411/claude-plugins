# whetstone

**A whetstone does not cut. It sharpens the blade that does.**

A coach for Claude Code that structurally cannot write your code. While a gym session is open, a hook blocks Claude's `Edit` and `Write` on everything except the learning log, so the only things it can give you are questions, graded hints and a review that ranks problems without fixing them.

## Why

AI removed the struggle from programming, and the struggle is where the learning was. Code ships; understanding does not keep up. Asking an assistant to "please just give hints" works for about ten minutes, until one of you gets impatient.

Whetstone does not ask. It keeps two lanes apart:

| | Ship lane | Gym lane |
|---|---|---|
| When | normal work, deadlines | a fixed slot, a few hours a week |
| Who types | AI may | **only you** |
| Claude is | a builder | an examiner |
| Price | explain it back before it merges | the struggle |

## Install

```
/plugin marketplace add ShyamSundhar1411/claude-plugins
/plugin install whetstone@axion-labs
/reload-plugins
```

## Commands

| Command | Lane | What it does |
|---|---|---|
| `/whet-gym <topic>` | gym | Opens a session and arms the write guard. Asks for your goal, your prediction, and your test table first. |
| `/whet-hint` | gym | Next rung of the ladder: **1** direction → **2** tool → **3** shape. Each hint is counted. Never code. |
| `/whet-review` | gym | Strict review by a read-only agent: 🔴 wrong, 🟡 weak, 🟢 note, with `file:line` and a reproduction. No fixes. |
| `/whet-quiz <file or topic>` | either | Five questions of rising difficulty. Answers withheld until you reply. |
| `/whet-rebuild <file>` | gym | Rewrite an existing file from memory, then compare behaviour with the original. |
| `/whet-explain` | ship | You explain AI-written code block by block before it merges. What you can't explain is your study list. |
| `/whet-done` | gym | Explain-back, log entry, numbers recorded, guard off. |
| `/whet-dash` | either | Opens a local dashboard of every session: trends, notes, study list and a graph. |

## How the guard works

```
/whet-gym  ->  .whetstone/gym.lock created
                    |
Claude calls Edit / Write / MultiEdit / NotebookEdit
                    |
        hooks/hooks.json (PreToolUse)  ->  scripts/guard.sh
                    |
   target inside .whetstone/ or the learning log?  -> allowed
   anything else                                   -> exit 2, call blocked,
                                                      Claude is told to hint or review instead
```

With no session open the hook exits immediately and the plugin is invisible.

**The honest limits.** `Bash` is not blocked, because the examiner has to run your tests; the prompts forbid writing through it, but that part is a rule, not a wall. And the guard only stops Claude: you can always close the session with `/whet-done` and ask for the code. That is deliberate. It is your gym.

## The numbers

Every closed session appends a row to `.whetstone/ledger.tsv`: date, minutes, hints used, 🔴 and 🟡 from the first review, topic.

```
bash plugins/whetstone/scripts/session.sh stats
```

Two things should fall over the weeks: **🔴 per session** and **hints per session**. If neither moves, the sessions are too easy or the real work is still being delegated outside them.

Commit `.whetstone/ledger.tsv` and `.whetstone/log.md` if you want the history; ignore `.whetstone/gym.lock`.

## The dashboard

```
/whet-dash
```

Opens `http://127.0.0.1:4747` in your browser, built from the same files the commands write: every project's `.whetstone/ledger.tsv` and `.whetstone/log.md`, plus the shared learning log if you set one.

- **Overview:** 🔴 and hints per session over time, the first-half vs second-half trend from `session.sh stats`, and a calendar of gym days.
- **Sessions:** every log entry as its own page, searchable and filterable by project.
- **Study list:** everything under "Confused me", "Predicted wrong" and "Next", from every session, in one list you can tick off.
- **Graph:** sessions linked to their project and to the themes they share, so recurring weak spots stand out.

It updates live when `/whet-done` writes a new entry. Projects are added to `~/.whetstone/projects` when you open a gym session; for a project with older sessions, run `bash plugins/whetstone/scripts/session.sh register` there once.

It is a single Node script with no dependencies. It listens on 127.0.0.1 only, and every request needs a random token issued at launch, so other websites cannot read your logs through it. The only thing it writes is which study items you ticked, in `~/.whetstone/study.json`.

## The learning log

By default entries go to `.whetstone/log.md`. To send them somewhere else (an Obsidian note, say):

```
mkdir -p ~/.whetstone && echo "/path/to/vault/Learning Log.md" > ~/.whetstone/log-path
```

or set `WHETSTONE_LOG`. The guard allows that one file.

## A first session

```
/whet-gym token bucket rate limiter, test-first, injected clock
```

Write the test table. Write the code. Get stuck for fifteen minutes before `/whet-hint`. Run `/whet-review`, fix what it finds yourself, run it again. `/whet-done`. A week later: `/whet-rebuild limiter.go`.

## Layout

```
.claude-plugin/plugin.json
skills/whetstone/SKILL.md        the coaching rules and session loop
agents/whetstone-examiner.md     read-only reviewer (no Edit, no Write)
commands/whet-*.md               the seven commands
hooks/hooks.json                 PreToolUse registration
scripts/guard.sh                 the write guard
scripts/session.sh               session state and the ledger
```

Requires `bash`. Uses `python3` to read the hook input when present, and falls back to `sed`.

## License

MIT
