# Evidence-based debate between AI models

Use this when a decision involves money, architecture, something irreversible, or anything that will be written into a
spec. For small choices, give a source link and move on: every debate costs the owner attention.

Roles: one **lead model** (has the owner's context, has web access, writes the conclusion) and two **reviewers from
different vendors** (no web access, read-only, opinions only). The owner decides.

## Steps

1. **Collect evidence first** (lead model). Write `evidence.md`: numbered items `[E1]`, `[E2]`… Each item has the source
   (author, journal or institution, year, issue or URL), the relevant text quoted or faithfully summarized, and a grade:
   - **A**: peer-reviewed journals and conferences; official primary sources (laws, regulators, official documentation).
   - **B**: working papers, reports from known institutions, professional guides.
   - **C**: news, blogs, forums, aggregator sites. A lead only; it cannot carry a conclusion alone.

   Facts from the repository count as evidence too; cite file and line. **Look for evidence against the proposal as hard
   as for it.**
2. **Write the question** (`prompt.md`). Say what is decided, what the options are, and what each answer must contain.
   If the question states the lead model's or the owner's position, say so and ask the reviewers to first make the
   strongest case against it.
3. **Ask both reviewers at the same time**, giving them the question and the evidence pack. They answer independently.
   Every claim cites an item number; a claim without one is marked **[no evidence]**: it may be raised but cannot support
   a conclusion. Reviewers list "evidence still needed" at the end.
4. **Verify** (lead model). Anything a reviewer cites from outside the pack is checked on the web: does it exist, is the
   source right, does it say that? Results go back into the pack. Facts the reviewers asked for are looked up.
5. **Second round only for disagreements.** Give each side the other's answer and the new facts; ask only about the
   points they disagree on.
6. **Conclude.** Each conclusion lists its evidence items, separated into **verified** and **inferred**. State the
   anchoring risk: if the question contained a position, discount agreement with it. Then the owner decides; the
   decision and its reason go into the decision log.
7. **Archive** the question, the pack, every answer and the conclusion in `docs/debates/<date>-<topic>/`.

## Personal data

For projects with personal or confidential data, the reviewers get **no access to the project folder**: the lead model
writes a de-identified summary into the question and the pack. Running them with an empty working directory is not file
system isolation, so do not mention private paths in the question either.

## What to expect

- Reviewers tend to converge on the lead model's framing. Asking for the strongest opposing case first, and giving
  facts rather than opinions in round two, reduces this but does not remove it.
- A debate is only as good as its evidence pack. Most of the value comes from step 1.
