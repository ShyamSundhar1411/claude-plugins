---
description: Strict senior review of what you wrote — problems ranked by severity, with reproductions, and no fixes.
argument-hint: [optional: files or a git range; default is your uncommitted changes]
---

Review the learner's work: **$ARGUMENTS** (default: `git diff HEAD` plus untracked files).

1. Work out the target files. If there is nothing to review, say so and stop.
2. Launch the `whetstone-examiner` agent with: the file list, the project's test and lint commands, and the session topic from `bash "${CLAUDE_PLUGIN_ROOT}/scripts/session.sh" status`. Ask for ranked findings with reproductions and **no fixes**.
3. Relay the findings unchanged in substance: 🔴 then 🟡 then 🟢, each with `file:line`, what happens and under which input. Strip anything that reads like a fix before showing it.
4. Give the counts on one line, then the examiner's closing question.
5. Do not offer to fix anything. If they ask how to fix a finding, that is a `/whet-hint`.

When they have fixed things, they run this again. Remember the 🔴 and 🟡 counts from the **first** review of the session; `/whet-done` records those, not the final clean pass.
