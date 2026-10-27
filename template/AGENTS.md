# <PROJECT_NAME>

<One or two sentences about the project.> Architecture, decisions, settings and problem logs live in `<SPEC_DOC>`
(your spec document). This file holds only the rules an agent must follow on every turn. This file is for agents that read `AGENTS.md` (Codex, Gemini, ...). `CLAUDE.md` has the same rules without the checklist; change the rules in both files together.

## Keep the spec in step with the code

If a task changes code or deployment settings, update `<SPEC_DOC>` in the same task, before you commit
(if you keep a sync-spec skill, follow it).

- Update `spec-sync.json` in the same PR: bump `spec_version`, or keep it and start `last_change` with
  "Spec not affected:" and the reason. CI (`scripts/check-spec-sync.mjs`) blocks the merge otherwise.
- Pure text, typo or style changes that touch nothing the spec describes need no update; say so in your report.

## To-dos go in the to-do list, not in the spec

Open work lives in `<TODO_DOC>`. New items go there (numbers continue), not into the spec. Mark finished items done with
the date.

## Task cards, handoff notes and file locks

Roles (see `docs/architecture.md`): L0 is the human owner; L1 is the lead agent session (splits work, assigns numbers,
reviews, edits the spec); L2 is an executor agent (writes code from a task card); L3 is a cheap model (copy, translation,
summaries); L4 is scripts and CI. Use the lowest layer that can do the job. L1 does not do work that L2 or L3 can do:
it writes a task card and hands it over. Exception: when opening, handing over and reviewing a card costs more than doing
the work, L1 may do it directly and says so in its report. Only two cases qualify: (1) the change touches only docs,
rules, `.agents/ledger.md` or skill text; (2) a code change of at most 2 files and 20 lines with no new logic.

- Before you start, read the task card (a GitHub issue made from `.github/ISSUE_TEMPLATE/task.yml`) and its last handoff
  note. No task card, no work (unless the owner gave you the work directly in the conversation).
- **File lock**: change only the files listed under "Files and docs to change" on the card. To change anything else,
  comment on the card and wait for L1 to update the lock. Highly contended files (`<SPEC_DOC>`, `spec-sync.json`,
  `migrations/`, and whatever else you list here) go to one card at a time. CI (`lock-check`) enforces the lock.
- **Numbers**: spec versions and migration numbers come only from the card, which gets them from `.agents/ledger.md`.
  Never pick the next number yourself. Only L1 edits the ledger. CI rejects duplicate numbers.
- L2 and L3 do not merge, do not edit the spec document and do not push to `main`.
- **Handoff**: before you stop, or when your quota or max-turns is nearly used up, leave a handoff note on the card in
  four parts (done, current state, next steps, what a person must do). Format: `.claude/skills/handoff/SKILL.md`.
  Things that need the owner go in one pinned "needs owner" issue, each with an instruction a web agent can follow.
- **Data boundary**: customer personal data (names, emails, phone numbers, original requests, uploaded material), prices
  and quotes, secrets and access settings never go to L3 or any external model.
- **Where rules live**: this file holds only hard rules for every turn. Details for one role or workflow go into a skill.
  A rule a program can check becomes CI or a hook; once it exists, delete the prose rule and write "CI blocks this".
  If the same handling shows up twice, write a skill or script instead of adding a line here.
- **Priority is cost control**: prefer work that saves quota; new features come after.
- **L1 sessions** read `.claude/skills/l1-session/SKILL.md` at the start (claim S-NNN, suggest a model, save quota,
  ask the owner multiple-choice questions, self-check before replying, hand off to the next session). L2 and L3 need not.

## Development

- `npm test` runs the tests. Run it before every commit.
- Never push to `main`: branch, open a PR, merge when CI passes. A hook in `.claude/settings.json` can block
  `git push` to main, and a workflow can open an issue when someone pushes to main directly.
- Customer-supplied content is always written with `textContent`; APIs that change data check the Origin header; keys live
  in secrets, never in code.

## Pre-report checklist (write the result of every item in your report)

- [ ] Which files or settings I changed
- [ ] Which spec documents and sections I updated (if none, why)
- [ ] The spec version is bumped, and `spec-sync.json` matches the spec document
- [ ] The spec's version log has this commit (automatic or by hand)
- [ ] I re-read the spec after the change
- [ ] `npm test` passes
- [ ] I changed only the files on the task card, used only the numbers the card gives, and left a handoff note on the card

If you cannot do an item (for example you have no write access to the spec document), say so in the report - "spec not
updated, because ..." - and ask a person to do it. Do not pretend it was done.

## Handoff note format

```
## Handoff note
**Done**: ... (commits, PRs)
**Current state**: ... (branch, CI result)
**Next**: ...
**Needs a person**: ...
```
