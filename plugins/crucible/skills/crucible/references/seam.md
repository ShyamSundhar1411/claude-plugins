# The seam: defects that live between the judges

Split the brain and you create a boundary. Some defects live on it, and neither hemisphere can
see them — because each is looking at its own side and each side is individually correct.

This is not hypothetical. A real run produced it exactly:

> The backend generated linkage sentences. Its tests read whole sentences, asserted they were all
> distinct, and passed — correctly. The canvas rendered those sentences into a node label with a
> 40-character budget. Every sentence began with the same 15 characters, so every label truncated
> inside the shared prefix and rendered identically — correctly failing the design critic.
>
> **The left hemisphere was right. The right hemisphere was right. The product was broken.**

Nobody was wrong, so nobody filed it. It surfaced only because a hand refused a task and
explained why, and the referee happened to carry the explanation across.

## When you need a seam check

Whenever the work crosses a boundary that no single judge owns:

- Two services with a wire contract between them
- A producer and a renderer — anything that generates text, numbers or images that something
  *else* decides how to display
- A library and its consumer
- Anything where one side's tests assert on data the other side **truncates, rounds, paginates,
  samples, caches or reformats**

That last one is the tell. **A defect hides wherever one side's unit of truth is larger than the
other side's unit of display.** Whole sentence versus label. Full precision versus two decimal
places. Complete list versus first page. Raw timestamp versus relative time.

## Who does it

The **referee**, not a hemisphere. It is the only role that sees both reports, and the check is
cheap — it is a question, not an investigation:

> For each thing one side produces and the other consumes: what is the producer's unit, what is
> the consumer's budget, and what happens to the part that does not fit?

Run it once per round, after both reports are in and before you carry blockers back.

## The three questions that find these

1. **Has either side actually talked to the other?** In the run above, the two services had never
   exchanged a request at the point both were judged — the frontend ran against its own mock, the
   backend against its own tests. Each was verified in isolation and the integration was assumed.
   **Make one real round-trip before accepting anything.** It is minutes of work and it is the
   single highest-yield check in this document.

2. **Does each side's fixture match what the other side actually sends?** A mock that drifts from
   the real contract makes both sides pass and the system fail. Diff the shapes.

3. **Who owns the constraint, and does the other side know it exists?** In the example the
   40-character budget was real, measured, and *invisible from the backend*. Constraints that live
   on one side of a boundary must be written into the board where the other side will read them,
   or they get rediscovered as a defect every round.

## Recording it

A seam finding is **binding on both sides**, so it does not belong only in one hemisphere's
verdict. Write it into the board as a cross-service constraint, in the consumer's terms, with the
real number:

> **Label budget is 40 characters** (median; floor 33), invariant to the user's font size.
> **The first 28 characters must be unique to the pair.** Gate:
> `len({t[:28] for t in labels}) == len(labels)`. No shared template stem at character 0.

That is checkable by either side, on its own, without understanding the other. Which is the test
of whether you have written it down properly.

## The cost

One question per round from the referee. It needs no extra agent — which is the argument for
doing it every time rather than only when you suspect something.
