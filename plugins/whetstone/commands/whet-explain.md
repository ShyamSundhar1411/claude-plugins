---
description: Ship-lane check — you explain code an AI wrote, block by block, before it merges. What you can't explain becomes your study list.
argument-hint: [optional: files or a git range; default is your uncommitted changes]
---

Explain-back on: **$ARGUMENTS** (default: `git diff HEAD`).

This is for code the learner did not type. They own it once it merges, so they must be able to answer "why is it like this?" for every block.

1. Read the target and split it into blocks that each do one thing (a function, a handler, a config stanza, a test).
2. For each block, in order: name it (`file:line-range`) and ask **"what does this do, and why is it done this way?"** Wait for their answer.
3. Judge each answer: ✅ correct, 🟡 right idea with a gap (say the gap), ❌ wrong or "don't know" (now explain it, briefly).
4. For any block that is risky (concurrency, error handling, security, money, data deletion), add one "what breaks if" question.
5. Finish with: `n/total` explained, the ❌ and 🟡 blocks as a list, and a suggestion to pick one of them for `/whet-rebuild`.

Do not summarise the code up front; that gives away the answers.
