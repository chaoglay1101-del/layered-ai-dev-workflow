# Resource ledger

Spec versions, migration numbers and the spec write lock are handed out here, so that two sessions never grab the same
number. (In the original project, three PRs took the same spec version on one day before this file existed.)

Rules:

- Only L1 (the lead agent session) edits this file. When a number is assigned, also write it into the task card's
  "Pre-assigned numbers" field.
- "Currently used" holds numbers already used on main. "Assigned (unmerged)" holds numbers given to a card or PR that has
  not merged yet. The next free number is the one after both.
- After a merge, the number moves from "Assigned" to "Currently used" (`scripts/merge-wrapup.mjs` does this for you).
- Only the holder of the spec write lock may edit the spec document.
- The values below are made up; replace them with your own.

## Numbers

| Resource | Currently used | Assigned (unmerged) | Notes |
| --- | --- | --- | --- |
| Spec version (`spec-sync.json`, `spec_version`) | 1.12 (10-26, PR #41); 1.11 (PR #36) | 1.13 (#47 B-03), 1.14 (#49 B-04) | |
| Migration (`migrations/`) | 0004_add_orders (10-26, PR #38); 0003_add_users | 0005 (#47 B-03), 0006 (#52 B-05) | next is 0007 |

## Session numbers

L1 sessions take the next number when they start (L1 only). The number goes into the handoff note title and into every
instruction for a person.

| ID | Session | Date |
| --- | --- | --- |
| S-001 | L1 routine: set up the ledger and the first task cards | 10-26 |
| S-002 | L1 routine: review #47 and #49, assign numbers | 10-26 |

Next is S-003.

## Spec write lock

| Holder | Scope | Since | Until |
| --- | --- | --- | --- |
| L1 session S-002 | all spec documents | 10-26 | reassigned by the owner |

## Active cards and file locks

Open cards labelled `agent:ready` or `agent:running`. Check this table and the labels on GitHub before starting; a file may
appear in only one row. The source of truth is the "Files and docs to change" field of each card;
`node scripts/status-check.mjs --locks` prints what is currently locked.

| Card | Level | Locked files and docs | Numbers |
| --- | --- | --- | --- |
| #47 B-03 order flag | L2 executor | migrations/0005_orders_flag.sql, src/orders.js, tests/orders.test.js, spec-sync.json | migration 0005, spec 1.13 |
| #49 B-04 export button | L2 executor | src/export.js, public/export.css, spec-sync.json (after #47) | spec 1.14 |
