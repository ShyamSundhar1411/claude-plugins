---
description: Rewrite an existing piece from memory, then compare with the original — the gaps are your study list.
argument-hint: <file to rebuild>
---

Rebuild from memory: **$ARGUMENTS**

1. Confirm the file exists and is committed (`git status --short -- <file>`). If it has uncommitted changes, ask them to commit or stash first, so the original is recoverable with `git show HEAD:<file>`.
2. If no gym session is open, open one: `bash "${CLAUDE_PLUGIN_ROOT}/scripts/session.sh" start rebuild <file>`.
3. Tell the learner to empty the file **themselves** and rewrite it without looking at the original, keeping the same public interface so existing tests still apply. Do not read the original aloud or describe it.
4. While they write: the normal gym loop (predictions, hint ladder).
5. When they say they are done, launch `whetstone-examiner` to compare `git show HEAD:<file>` with the working copy: behaviour and ideas, not text. Run the existing tests against the rebuild.
6. Report: what the rebuild lost, what it misses, what it does better. Then let them choose: keep the rebuild, or `git checkout -- <file>` to restore the original (they run it).
