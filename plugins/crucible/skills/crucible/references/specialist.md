# Adding a middle layer when the domain is deep

Telling the brain to stay in its hat works, but it is discipline — and discipline erodes over
rounds. When the gap between "what the business wants" and "what the code does" is wide enough
that one agent has to span it, close it structurally instead: put a **domain specialist between
the brain and the hand**.

```
Brain (PM)  ──what & why──►  Specialist  ──how to measure/design──►  Hand (builder)
     ◄──business-language report──  (reviews the build)  ◄──code & caveats──
```

The specialist is whatever expert the work needs — a senior data analyst for BI, a security
architect for a hardening job, a copy chief for a content system. Going down, it turns the
brain's business question into a design the hand can implement. Coming back up, it **reviews
the hand's work and reports to the brain in the brain's own language**.

The point is the chain of custody: **the brain never sees code.** It cannot file a bug about a
dropdown's default index because it never sees the dropdown's implementation — the specialist
filters, and reports "this exhibit doesn't support the claim" rather than "this select falls
back to index 0". Hat drift becomes structurally impossible rather than a rule someone has to
remember.

It also puts technical constraints where they belong. The rule about not smuggling schema
details into the brain's spec is easy to break when there is nobody else to give them to; with
a specialist in the middle, they have a natural home.

All three post to the same blackboard, and all three can argue. The specialist can tell the
brain its question is unanswerable as posed; the hand can tell the specialist its design is
illegal against the real system. Conviction still ends the loop, and it can now arrive from
any of the three.

## When it is worth the overhead

Use it when the domain has real depth — where a correct-looking implementation can be wrong in
a way only an expert would notice, and where explaining that wrongness to a non-expert takes a
translation step.

For a two-layer job it is overhead. If the brain can read the hand's output and judge it
directly without needing a glossary, you do not need a specialist.

## What changes in the prompts

- The **brain's** prompt is unchanged, except its material is the specialist's report rather
  than the hand's code.
- The **specialist** gets the brain's spec plus the technical constraints, and is asked for
  two outputs each round: a design the hand can build, and — after the build — a verdict in
  business language with no implementation detail in it.
- The **hand's** prompt points at the specialist's design, not the brain's spec.

Keep the verdict authority with the brain. A specialist that can both design and accept is the
same mark-your-own-homework problem one layer down.
