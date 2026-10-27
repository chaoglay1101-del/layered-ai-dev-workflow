// File-lock and number check with fake PR data and fake ledger text; no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cardLocks, check, closedIssue, ledgerProblems, lockWarnings, numbersIn, renderSummary } from '../scripts/lock-check.mjs';

const ledger = ({ used = '1.12 (10-26, PR #41); 1.11 was card #30; 1.11 was card #31', assigned = '1.13 (#47), 1.14 (#49)', sessions = ['S-001', 'S-002'] } = {}) => `# Resource ledger

## Numbers

| Resource | Currently used | Assigned (unmerged) | Notes |
| --- | --- | --- | --- |
| Spec version | ${used} | ${assigned} | |
| Migration | 0004_orders (PR #38); 0003_users | 0005 (#47), 0006 (#52) | next is 0007 |

## Session numbers

| ID | Session | Date |
| --- | --- | --- |
${sessions.map((s) => `| ${s} | routine L1, mentions S-999 | 10-26 |`).join('\n')}

Next is S-003.
`;

const CARD = `### Goal

x

### Files and docs to change

- src/check.js
- tests/check.test.js, .github/workflows/check.yml
- spec-sync.json (after #195)

### Pre-assigned numbers

none
`;

test('cardLocks reads the lock section of a card', () => {
  assert.deepEqual(cardLocks(CARD), ['src/check.js', 'tests/check.test.js', '.github/workflows/check.yml', 'spec-sync.json']);
  assert.deepEqual(cardLocks('### Files and docs to change\n\n_No response_\n\n### Other\nx'), []);
});

test('file lock: changed files inside the lock of #N pass', () => {
  const r = check({ pr: { body: 'Closes #12', files: ['src/check.js', 'spec-sync.json'] }, cards: [], closesLocks: cardLocks(CARD), ledgerText: ledger() });
  assert.deepEqual(r.errors, []);
  assert.equal(r.closes, 12);
});

test('file lock: files outside the lock fail and are listed', () => {
  const r = check({ pr: { body: 'Closes #12', files: ['src/check.js', 'CLAUDE.md', 'src/other.js'] }, cards: [], closesLocks: cardLocks(CARD) });
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /#12/);
  assert.match(r.errors[0], /CLAUDE\.md, src\/other\.js/);
  assert.doesNotMatch(r.errors[0], /src\/check\.js/);
});

test('file lock: a folder lock covers files below it; ignored paths never count', () => {
  const r = check({ pr: { body: 'Closes #1', files: ['tests/e2e/a.js', '.agents/usage/x.json'] }, cards: [], closesLocks: ['tests/e2e/'] });
  assert.deepEqual(r.errors, []);
});

test('a PR without Closes skips the file lock check', () => {
  const r = check({ pr: { body: 'docs only', files: ['CLAUDE.md'] }, cards: [], closesLocks: null });
  assert.deepEqual(r.errors, []);
  assert.equal(r.closes, null);
});

test('overlap with another card only warns; the closed card itself is not counted', () => {
  const cards = [
    { number: 12, locks: ['spec-sync.json'] },
    { number: 20, locks: ['spec-sync.json', 'src/merge.js'] },
    { number: 30, locks: ['tests/'] },
    { number: 40, locks: ['src/unrelated.js'] },
  ];
  const r = check({ pr: { body: 'Closes #12', files: ['spec-sync.json', 'tests/x.test.js'] }, cards, closesLocks: ['spec-sync.json', 'tests/'] });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, ['Touches files locked by card #20: spec-sync.json.', 'Touches files locked by card #30: tests/x.test.js.']);
  assert.deepEqual(lockWarnings(['a.js'], cards, null), []);
});

test('numbersIn sees versions and migration numbers, not PR/issue numbers or dates', () => {
  assert.deepEqual(numbersIn('1.57 (#187 card), 1.58 (PR #1234, 10-26)'), ['1.57', '1.58']);
  assert.deepEqual(numbersIn('0012 (#187), 0013'), ['0012', '0013']);
  assert.deepEqual(numbersIn('2026-10-26'), []);
  assert.deepEqual(numbersIn('—'), []);
});

test('numbers: a clean ledger passes (repeats in the history text of "Currently used" do not count)', () => {
  assert.deepEqual(ledgerProblems(ledger()), []);
});

test('numbers: the same number twice in one Assigned cell fails', () => {
  const v = ledgerProblems(ledger({ assigned: '1.13 (#47), 1.13 (#49)' }));
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'assigned-duplicate');
  assert.match(v[0].text, /1\.13/);
  const m = ledgerProblems(ledger().replace('0005 (#47), 0006 (#52)', '0005 (#47), 0005 (#52)'));
  assert.match(m[0].text, /0005/);
});

test('numbers: an assigned number that is also in Currently used on the same row fails', () => {
  const p = ledgerProblems(ledger({ used: '1.13 (10-26)', assigned: '1.13 (#47)' }));
  assert.equal(p.length, 1);
  assert.equal(p[0].kind, 'assigned-used');
});

test('numbers: the same number on different rows is not a collision', () => {
  assert.deepEqual(ledgerProblems(ledger({ assigned: '1.13 (#47)' }).replace('0005 (#47)', '1.13 (#9)')), []);
});

test('numbers: duplicate session numbers fail once; S-NNN mentioned in notes does not count', () => {
  const p = ledgerProblems(ledger({ sessions: ['S-001', 'S-002', 'S-002', 'S-002'] }));
  assert.equal(p.length, 1);
  assert.equal(p[0].kind, 'session-duplicate');
  assert.match(p[0].text, /S-002/);
  assert.deepEqual(ledgerProblems(ledger({ sessions: ['S-001', 'S-002'] })), []);
});

test('check lists file lock and number errors together; summary separates failures from warnings', () => {
  const r = check({
    pr: { body: 'Closes #12', files: ['CLAUDE.md'] },
    cards: [{ number: 5, locks: ['CLAUDE.md'] }],
    closesLocks: ['src/check.js'],
    ledgerText: ledger({ sessions: ['S-001', 'S-001'] }),
  });
  assert.equal(r.errors.length, 2);
  assert.equal(r.warnings.length, 1);
  const s = renderSummary(r);
  assert.match(s, /\*\*Failed\*\*/);
  assert.match(s, /\*\*Warnings/);
  assert.match(renderSummary({ closes: null, errors: [], warnings: [] }), /All checks passed/);
});

test('closedIssue is re-exported for the workflow', () => {
  assert.equal(closedIssue('Closes #3'), 3);
});

test('the shipped template ledger and the example excerpt pass the number check', () => {
  for (const path of ['../template/.agents/ledger.md', '../examples/ledger-excerpt.md']) {
    assert.deepEqual(ledgerProblems(readFileSync(new URL(path, import.meta.url), 'utf8')), [], path);
  }
});
