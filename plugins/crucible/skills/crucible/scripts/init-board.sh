#!/usr/bin/env bash
# Scaffold a crucible blackboard — the corpus callosum between the agents.
#
#   ./init-board.sh <dir>        # e.g. "$SCRATCHPAD/crucible"
#
# The board is how the brain, the hand and the referee avoid re-deriving each
# other's work. Every agent reads it before starting and posts to it before
# stopping, so a death to a rate limit or a timeout costs the round, not the
# knowledge. Creating it is cheap; skipping it is what makes round three cost
# as much as round one.
set -euo pipefail

DIR="${1:-}"
[ -n "$DIR" ] || { echo "usage: $0 <board-dir>" >&2; exit 1; }

if [ -e "$DIR" ] && [ -n "$(ls -A "$DIR" 2>/dev/null)" ]; then
  # Refuse rather than overwrite: a board from an earlier round is the thing
  # this whole mechanism exists to preserve.
  echo "refusing to scaffold: $DIR already exists and is not empty." >&2
  echo "  That is probably a board from an earlier round. Append to it, or" >&2
  echo "  pass a new path if this is genuinely a new run." >&2
  exit 1
fi

mkdir -p "$DIR"
STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

write() { printf '%s\n' "$2" > "$DIR/$1"; }

write spec.md "# Spec and acceptance criteria

The brain writes this once, before anything is built. Everyone else reads it.
Criteria are numbered and checkable by someone who did not build the thing.

_empty — posted by the brain at the end of the spec phase_"

write findings.md "# Findings

Facts that cost something to learn. Environment quirks, non-obvious file
locations, API shapes, commands that look right and silently do nothing.

Worth posting: \"the standalone toolchain on PATH shadows the IDE's and fails
with a misleading missing-type error — prefix commands with the explicit path\".
Not worth posting: \"the project uses SwiftUI\".

Append, attribute, and date. If a finding turns out wrong, add a correction
entry rather than editing it away — the next agent needs to see it was contested.

_board created ${STAMP}_"

write verified.md "# Verified by the referee

Checks the referee has already run, with the command and its actual output.
The judge is told: pre-verified, do not re-run.

This is where the loop saves the most — a judge agent re-deriving a fact the
referee already owns pays full price for it.

_empty_"

write deviations.md "# Deviations

What the hand could not do, and why. Also its push-backs: where it thinks the
spec is wrong, with the evidence. The brain rules on every entry here.

_empty_"

write verdicts.md "# Verdicts

Rulings, round by round. Record what each side conceded — a requirement the
brain withdrew but nobody wrote down comes back next round and gets argued again.

_empty_"

write skills.md "# Skills available in this session

The referee posts this at init: one line per installed skill, name and what it is for.

Agents cannot see each other's skill rosters, and a hand that does not know a skill exists
rebuilds what it already does — chart code, document generation, a review checklist someone
already wrote down. One line here is cheaper than a rediscovery.

Keep it to skills a hand on THIS job could plausibly reach for. A full roster of forty is a
reading tax; the five that might apply are an asset.

Format:
  - \`<name>\` — what it does, and when to reach for it

_empty — posted by the referee_"

write backlog.md "# Backlog

Real defects that do not block acceptance. The brain files them here instead of
in its verdict, which is what keeps it judging the job rather than doing QA.

_empty_"

echo "board ready: $DIR"
ls -1 "$DIR" | sed 's/^/  /'
