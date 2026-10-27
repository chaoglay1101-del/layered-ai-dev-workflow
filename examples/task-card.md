# Example task card (de-identified)

This is the body of a real task card (#197, to-do item B-49), translated and trimmed of project-specific names. It was
written by L1 and executed by an L2 agent on a GitHub Actions run after the label `agent:ready` was added. The headings
match `template/.github/ISSUE_TEMPLATE/task.yml`.

---

**Title**: B-49 CI checks file locks and numbers on every PR

### To-do number

B-49

### Goal

Every PR gets an automatic check of file locks and number collisions. L1 no longer relies on memory, and CLAUDE.md can
drop these prose rules and say one sentence instead: "CI blocks this".

### Background links

- Collaboration spec, section on task cards and the ledger
- Existing helpers: the ledger reader in `scripts/status-check.mjs`, the lock parser in the agent queue script
- Origin of the problem: on one day three PRs took the same spec version because the ledger did not exist yet

### Execution level

L2 sonnet (feature work, opens a PR)

### Files and docs to change

- scripts/lock-check.mjs (new)
- tests/lock-check.test.js (new)
- .github/workflows/lock-check.yml (new)
- spec-sync.json

### Pre-assigned numbers

none (the change does not affect the spec: write "Spec not affected: ..." in `last_change`)

### Acceptance criteria

1. The workflow runs on `pull_request`.
2. When the PR description has `Closes #N`, changing a file outside the file lock of card #N fails the check.
3. Overlap with other open cards only warns.
4. In the ledger, the same number twice in one "Assigned" cell, an assigned number that is also in "Currently used", and a
   duplicate S-NNN all fail.
5. The tests cover each case and make no API calls.
6. Pure functions and GitHub calls are separate.

### Do not

- Do not edit `ci.yml` (locked by another card).
- Do not edit shared modules.
- Do not edit the ledger or the rule files.
- Do not edit the spec document.

### Limits

max-turns 25, 30 minutes

---

What happened: the executor opened branch `agent/197` with a PR and 15 tests. See `handoff.md` for the two notes that
followed. The result is `scripts/lock-check.mjs` in this repository (rewritten to be configurable).
