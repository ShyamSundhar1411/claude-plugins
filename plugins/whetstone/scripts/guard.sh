#!/usr/bin/env bash
# whetstone guard — PreToolUse hook for Edit / Write / MultiEdit / NotebookEdit.
#
# While a gym session is open (.whetstone/gym.lock exists in the project), Claude may
# write only inside .whetstone/ and to the learning log. Everything else is refused with
# exit 2, which blocks the tool call and hands the message below back to Claude.
#
# No session open -> exit 0, the plugin is invisible.
set -u

root="${CLAUDE_PROJECT_DIR:-$PWD}"
lock="$root/.whetstone/gym.lock"
[ -f "$lock" ] || exit 0

input="$(cat)"
path=""
if command -v python3 >/dev/null 2>&1; then
  path="$(printf '%s' "$input" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin).get("tool_input", {})
    print(d.get("file_path") or d.get("notebook_path") or "")
except Exception:
    print("")
' 2>/dev/null)"
else
  path="$(printf '%s' "$input" | sed -n 's/.*"\(file_path\|notebook_path\)"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\2/p' | head -n 1)"
fi

case "$path" in
  "") ;;                       # unknown target: fail closed, fall through to the refusal
  /*) ;;
  *) path="$root/$path" ;;
esac

# The learning log: $WHETSTONE_LOG, else the path stored in ~/.whetstone/log-path.
log="${WHETSTONE_LOG:-}"
if [ -z "$log" ] && [ -f "$HOME/.whetstone/log-path" ]; then
  log="$(head -n 1 "$HOME/.whetstone/log-path")"
fi

if [ -n "$path" ]; then
  case "$path" in
    *..*) ;;                                 # no climbing out of the allowed directory
    "$root/.whetstone/"*) exit 0 ;;
  esac
  if [ -n "$log" ] && [ "$path" = "$log" ]; then exit 0; fi
fi

topic="$(sed -n 's/^topic=//p' "$lock" | head -n 1)"
cat >&2 <<MSG
whetstone: a gym session is open (${topic:-untitled}). The learner writes the code; you do not.
Refused: write to ${path:-<unknown path>}
What you can do instead: ask a question, give the next hint (/whet-hint), or review without fixing (/whet-review).
Only the learner can end the session (/whet-done). Do not work around this with Bash.
MSG
exit 2
