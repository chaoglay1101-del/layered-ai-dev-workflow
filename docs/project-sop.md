# Project SOP: open, automate, pause, retire

The goal is that any new task or project gets a familiar setup that can be copied and adjusted in an hour. The lead
model follows this page and records each opening, upgrade or closing in the owner's decision log.

## 0. Five questions before starting

The lead model asks the owner and writes the answers into sections 1 and 2 of `SPEC.md`.

| # | Question | Decides |
|---|---|---|
| 1 | **Who decides?** (the owner, a family member, a partner) | "Who decides what" in `AGENTS.md` |
| 2 | **Any personal or confidential data?** (IDs, records, accounts, customer data) | a `private/` folder; reviewers never read the folder; the project can never be automated |
| 3 | **Money, contracts or irreversible decisions involved?** | which decisions must be debated with evidence |
| 4 | **What is produced?** (documents, models, code, a site) | remote repository, tests, `finance/`, `scripts/` |
| 5 | **Experiment or long-term?** | an experiment states its hypothesis, effort cap and end date, and is closed or renewed on that date |

## 1. Two levels

| Level | What it has | When |
|---|---|---|
| **One: rules only** (default) | folder, local git, `AGENTS.md`, `CLAUDE.md`, `SPEC.md`; work in conversation; important decisions debated | **every new project starts here** |
| **Two: automation** | scout, executor, cross-vendor review, autopilot | only when all conditions in section 3 hold |

Do not automate a new direction from day one: opening or closing a direction should not add a layer of management.

## 2. Open a project (level one)

1. Create the folder and `git init`.
2. `.gitignore`: at least `private/`, `.env`, `.env.*`, `*.key`; add image types if scans or photos may appear.
3. `AGENTS.md`: copy `template-lite/AGENTS.md` and fill it in from the five answers. Aim for 50–80 lines with only the
   rules this project needs; general rules stay in the global rule file.
4. `CLAUDE.md`: the single line `@AGENTS.md`, so every agent reads the same rules.
5. `SPEC.md`: copy `template-lite/SPEC.md`.
6. Register the project in the owner's project index and decision log.
7. First commit; check that nothing from `private/` is in it.
8. **Acceptance**: open a new session in the folder and ask "Who decides here? What must never be shown to another AI?"
   The project is set up when the answer is right.

## 3. Upgrade to level two (automation)

All of these must hold:

1. The project has a remote repository (the executor opens pull requests).
2. One command runs the automated tests.
3. The direction has been stable for two weeks: conversation sessions are no longer rewriting the same files every day
   (otherwise queued cards go stale).
4. No personal data, or the sensitive folders can be excluded from review.
5. There is repetitive maintenance worth handing off (test gaps, docs drifting from code, dependency updates).
6. The owner agrees.

Then: add the project to the scout and executor settings (test command, allow-listed commands, safe paths for autopilot,
folders excluded from review); keep `CLAUDE.md` as `@AGENTS.md` (an executor that loads only project settings never sees
global rules); run the first week on the lowest scout frequency with autopilot limited to tests and docs.
**Acceptance**: one full loop — scout card, owner approval, PR, both reviews, owner merge.

## 4. Close a project

### Pause (may come back)

1. Take the project out of the scout rotation.
2. Close its open cards and the executor's own PRs; list PRs opened by people for the owner instead.
3. Disable it in the automation settings; ask the owner about any CI jobs that open PRs by themselves.
4. In `SPEC.md`, record the date, the reason and the **condition for resuming**.
5. Mark it "paused" in the project index and the decision log.
6. **Acceptance**: the next owner report contains nothing from this project.

### Retire (will not come back)

Steps 1–5, then: confirm a backup exists and hand originals from `private/` back to the owner; archive the remote
repository; remove it from the automation settings and delete the executor's working copy; move it to "archived" in the
project index.

## 5. Who does what

| Step | Lead model | Owner |
|---|---|---|
| Open | asks the five questions, creates files, registers, runs the acceptance check | answers |
| Automate | checks the conditions, edits settings, runs one full loop | agrees, creates the remote, merges, chooses rotation |
| Close | closes cards and executor PRs, edits settings, registers | decides pause or retire, archives the remote |
