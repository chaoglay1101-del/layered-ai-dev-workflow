# Layered AI Dev Workflow

A way to run several AI coding-agent sessions on one repository at the same time, with task cards, file locks, a number
ledger and handoff notes, plus the small Node scripts that enforce the rules in CI.

[繁體中文](README.zh-TW.md)

## New in v2 (2026-11): several projects, not one repository

v1 (below) ran parallel agent sessions on one code repository. A month later the same method had to cover several
unrelated projects at once, including projects that are only documents and decisions. What changed
([docs/v2-multi-project.md](docs/v2-multi-project.md)):

- **One brain, two reviewers from different vendors.** One model judges and writes; two models from other vendors review
  every pull request and only give opinions; the owner alone merges.
- **Decisions debated with evidence.** Numbered, graded evidence for and against, claims without evidence marked, and an
  anchoring warning ([docs/evidence-debate.md](docs/evidence-debate.md)).
- **A local scout and executor with guardrails**: allow-listed commands, file locks, at most two automatic repairs, quota
  gates, and one short report for the owner.
- **Two project levels and a closing checklist.** Every project starts as "rules only" and is automated only when it is
  stable ([docs/project-sop.md](docs/project-sop.md), templates in [`template-lite/`](template-lite/)).
- **Stale-work hygiene**: work finished in conversation closes the related cards and PRs; dead branches are not retried.
- **What did not work** is written down too: building faster than measuring, and a system that creates its own chores.

## The problem

When more than one agent session works on a repo in parallel, three things go wrong:

- **Context has to be repeated.** Every new session starts from nothing, so the same background is explained again.
- **Numbers collide.** Spec versions and migration numbers are picked by whoever is fastest. In the project this comes
  from, three PRs took the same spec version on one day.
- **Quota runs out.** Each turn re-reads the whole conversation, so long sessions and expensive models burn through the
  budget on work a cheaper layer could have done.

## The approach

Split the work into layers and use the lowest layer that can do each step. State lives on GitHub (task cards, PRs, the
ledger), never in a conversation.

```mermaid
flowchart TB
  L0["L0 - Human owner<br/>decides, pays, merges, holds secrets"]
  L1["L1 - Lead agent session<br/>splits work, assigns numbers and locks, reviews, edits the spec"]
  L2["L2 - Executor agents<br/>write code from a task card and open a PR"]
  L3["L3 - Cheap model<br/>copy, translation, summaries"]
  L4["L4 - Scripts and CI<br/>lock-check, spec-sync, merge-wrapup, status-check"]
  L0 --> L1
  L1 -- "task card + agent:ready" --> L2
  L1 -- "task card (no personal data)" --> L3
  L2 -- "PR" --> L4
  L3 -- "draft PR" --> L4
  L4 -- "pass / fail" --> L1
  L1 -- "needs-owner issue" --> L0
```

The rules an agent must follow every turn are short (`template/CLAUDE.md`). Anything only one role needs is a skill.
Anything a program can check becomes CI, and the prose rule is deleted.

## Quick start

1. Copy the template into your repository:
   `cp -r template/. /path/to/your-repo/` (this brings `CLAUDE.md`, `AGENTS.md`, the skills, the issue template,
   `.agents/ledger.md` and an example `spec-sync.yml`).
2. Copy the checks: `scripts/`, `workflow.config.json`, `package.json` (or merge its `test` script) and
   `.github/workflows/{ci,lock-check,merge-wrapup}.yml`.
3. Edit `workflow.config.json` (time zone, labels, which files count as code) and replace the `<PLACEHOLDERS>` in
   `CLAUDE.md` and `AGENTS.md` (`<SPEC_DOC>`, `<TODO_DOC>`, `<PROJECT_NAME>`).
4. Open your first task card from the "Task card" issue template, fill in "Files and docs to change" (the file lock),
   add a row for it in `.agents/ledger.md`, then add the label `agent:ready`.
5. Run `npm test` (Node 20 or newer, no packages to install). Push a branch and open a PR with `Closes #<card>`:
   `lock-check` will compare the changed files with the card's lock.

For a project that is not a code repository (planning, research, documents), start from `template-lite/` instead and
follow [docs/project-sop.md](docs/project-sop.md): copy `AGENTS.md`, `CLAUDE.md`, `SPEC.md` and `.gitignore`, answer the
five questions, and add `docs/debates/` when the first important decision comes up.

## Case numbers

As of 2026-10-27, for 2026-10-24 to 2026-10-27. Source: GitHub statistics of the private repo of the project this came from.
Details and caveats are in [docs/case-study.md](docs/case-study.md).

| Measure | Value |
| --- | --- |
| Pull requests opened / merged | 135 / 130 |
| Issues opened / closed | 84 / 55 |
| Merged PRs from agent-run branches (`agent/<card>`) | 30 |
| Docs PRs merged automatically | 5 |
| GitHub Actions workflows / `.mjs` scripts / test files | 17 / 20 / 34 |
| L1 sessions chained by ledger numbers and handoff notes | S-001 to S-016 |
| L2/L3 calls in the usage log / cheap-model calls and their cost | 30 / 10 calls, about US$0.03 |
| `CLAUDE.md` size after moving L1-only rules into skills | about 39% smaller |
| Spec versions | main spec v1.61, collaboration spec v1.16 |

## Repository layout

```
README.md                 this page
README.zh-TW.md           Traditional Chinese version
docs/architecture.md      layers, task card lifecycle, handoff, ledger, data boundary, cost
docs/case-study.md        the project this came from: problem, approach, results
docs/stack.md             appendix: the technology stack of that project (text only)
docs/v2-multi-project.md  v2: what changed for several projects, and what did not work
docs/evidence-debate.md   v2: debating decisions between models with an evidence pack
docs/project-sop.md       v2: open a project, automate it, pause or retire it
template/                 copy into your repo: CLAUDE.md, AGENTS.md, skills, sub-agent,
                          issue template, ledger, spec-sync example
template-lite/            v2: rules-only project: AGENTS.md, CLAUDE.md, SPEC.md, .gitignore,
                          debate templates
examples/                 a de-identified task card, handoff notes, a ledger excerpt
scripts/                  lock-check, check-spec-sync, merge-wrapup, status-check (+ scripts/lib)
tests/                    node:test tests for the scripts (fake data, no network)
.github/workflows/        ci, lock-check, merge-wrapup
workflow.config.json      settings the scripts read (labels, time zone, headings, file patterns)
```

Not included from the original project: the delegation script that calls a cheap model, usage-cost reporting, the
to-do-list sync that reads a Google Doc, and anything specific to that project's website. The status check in
this repo compares the ledger with GitHub only; the original also compared a to-do document.

## Acknowledgements

Built at TechStarterWeb Consulting (techstarterweb.com). Thanks to Co-founder Ivan (Fu Lap Hang) at TechStarterWeb
Consulting. Author: Yu-Chen Chao.

## License

MIT, see [LICENSE](LICENSE).
