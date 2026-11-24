# Rules for agents

<One paragraph: what this project is, the owner's role, and that the spec is `SPEC.md`. Read sections 2 (decisions) and
3 (roadmap) before starting work.>

## Who decides what

- **<Decision maker>** decides: <which decisions — money, scope, people, contracts…>.
- **The owner** passes on decisions, approves agents' plans, and handles accounts and logins.
- **Agents** research, organise, calculate, draft and propose options. A proposal is not a decision: only decisions made
  by the decision maker go into `SPEC.md` section 2, with the date and who decided.

## How to work

1. **Propose first**: say what you will do, which files you will produce and who must decide; start after the owner
   agrees. Small things (one lookup, a typo) can be done directly.
2. **Facts need sources**: <the primary sources for this field — laws, official sites, statements, original documents>.
   Use current versions, with a link and the date checked. Blogs and consultants are leads only. Anything written from
   memory is marked **[to verify]**.
3. **Money, contracts and irreversible decisions** are debated with evidence first (see "Multi-model review").
4. **Numbers come from code or a spreadsheet**: calculations live in `finance/` (or `scripts/`); a language model only
   quotes the results. Every assumption lists its source or "estimate by <person>".
5. **Keep the spec current**: when a decision, the roadmap or a key requirement changes, update the matching section
   of `SPEC.md` in the same task and add a line to section 6.

## Personal data and confidential material

- <What must never enter this folder or be given to any AI: names, ID numbers, records, photos, accounts…>. Use invented
  examples marked "fictional" when an example is needed.
- Originals (IDs, licences, contracts, statements) go in `private/`: not in git, not uploaded, never given to the
  reviewing models. Ask the owner before using anything from it.
- Agents do not log in, submit, pay or sign on anyone's behalf. They prepare documents and step lists; people submit.

## Multi-model review

- **When to debate**: <this project's big decisions>. Follow the evidence-debate method (`docs/evidence-debate.md` in
  the workflow repository): evidence pack first, then both reviewers, then a conclusion split into verified and inferred.
- Debates are stored in `docs/debates/<date>-<topic>/` (start from `docs/debates/_template/`).
- If the project holds personal data, reviewers never get the folder: the lead model writes a de-identified summary into
  the question.

## Where things go

| Path | Contents |
|---|---|
| `SPEC.md` | spec: goal, decisions, roadmap, requirements, changelog |
| `docs/research/` | research notes, one topic per file, with sources and dates |
| `docs/debates/` | evidence packs and debates |
| `finance/` | calculations and assumption tables |
| `private/` | originals; not in git |

## Before you report

- [ ] Facts have sources and dates; anything unverified is marked [to verify].
- [ ] Nothing from `private/` or any personal data went into git or to another model.
- [ ] Numbers come from code or a spreadsheet, with their assumptions.
- [ ] `SPEC.md` sections and the changelog are updated.
- [ ] Committed.

Report in plain language: results first, then what someone has to decide.
