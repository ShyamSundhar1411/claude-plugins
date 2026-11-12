---
description: Open a gym session — you write every line, Claude can only hint, question and review. Arms the write guard.
argument-hint: <what you are going to build or practise>
---

Open a whetstone gym session on: **$ARGUMENTS**

1. If `$ARGUMENTS` is empty, ask what they want to practise and stop.
2. Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/session.sh" start $ARGUMENTS`. If a session is already open, show `session.sh status` and ask whether to continue it or close it with `/whet-done`.
3. Tell the learner in two lines: the guard is armed, so you cannot write their source; they can ask for `/whet-hint`, `/whet-review`, `/whet-quiz`, and only they can end it with `/whet-done`.
4. Ask, and wait for the answers:
   - What does "done" look like for this session? (one sentence)
   - What do you predict will be the hard part?
5. Then ask for the test table first: the cases, before any implementation. Do not suggest cases.

Follow the whetstone skill's session loop from here. Do not explain the topic unless asked.
