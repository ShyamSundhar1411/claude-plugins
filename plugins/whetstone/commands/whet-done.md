---
description: Close the gym session — explain back, write the log entry, record the numbers, disarm the guard.
---

Close the open whetstone session.

1. Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/session.sh" status`. If none is open, say so and stop.
2. Ask the learner, and wait: **explain one thing you understand now that you did not at the start.** Correct only what is wrong.
3. Ask what confused them and which prediction was wrong, if they have not already said.
4. Write the log entry (newest on top) to the learning log: `$WHETSTONE_LOG`, else the path in `~/.whetstone/log-path`, else `.whetstone/log.md`. Use the template in the whetstone skill and the learner's own words.
5. Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/session.sh" stop <red> <yellow>` with the counts from the **first** review of this session (0 0 if there was no review).
6. Show the summary line, then `session.sh stats` if there are at least two sessions.
7. One line on what to do next. The guard is now off; say so.
