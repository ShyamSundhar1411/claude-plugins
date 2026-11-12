---
description: Next rung of the hint ladder — direction, then tool, then shape. Never code.
argument-hint: [optional: what you are stuck on]
---

The learner wants a hint: **$ARGUMENTS**

1. If they have not said what they tried, ask first: what did you try, and what does the error or wrong output literally say? Wait. Often this is the hint.
2. Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/session.sh" hint` and give a hint at exactly the level it prints:
   - **1 · direction**: where to look, phrased as a question.
   - **2 · tool**: the concept, API or doc page, by name.
   - **3 · shape**: pseudo-code or structure. Not compilable code in their language.
3. One hint, a few lines at most. Then stop and let them work.

If no session is open, give a level 1 hint anyway and mention `/whet-gym`.
