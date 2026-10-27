// Post-merge wrap-up: fake ledger text, fake checklist and a fake GitHub; no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, merge } from '../scripts/lib/config.mjs';
import { checkOffLines, run, shouldSkip, splitItems, wrapupLedger } from '../scripts/merge-wrapup.mjs';

const ledger = ({ used = '1.12 (10-26, card B-2, PR #41)', assigned = '1.13 (#47 B-3a), 1.14 (#48 B-3b)' } = {}) => `# Resource ledger

## Numbers

| Resource | Currently used | Assigned (unmerged) | Notes |
| --- | --- | --- | --- |
| Spec version | ${used} | ${assigned} | section 10 |
| Migration | 0004_orders (PR #38) | 0005 (#47 B-3a), 0006 (#52 B-4) | next is 0007 |

## Session numbers

| ID | Session | Date |
| --- | --- | --- |
| S-001 | routine, card #47 | 10-26 |

## Active cards and file locks

| Card | Level | Locked files | Numbers |
| --- | --- | --- | --- |
| #4 old card | L2 | a.js | none |
| #47 B-3a order flag | L2 | src/index.js | 1.13 |
| #48 B-3b | L2 | b.js | 1.14 |
`;
const date = '10-27';
const rows = (text) => text.split('\n');

test('moves one number to the front of Currently used, with date, card title and PR', () => {
  const r = wrapupLedger(ledger(), { pr: 60, cards: [47], date });
  assert.equal(rows(r.text).find((l) => l.startsWith('| Spec version')), '| Spec version | 1.13 (10-27, B-3a, PR #60); 1.12 (10-26, card B-2, PR #41) | 1.14 (#48 B-3b) | section 10 |');
  assert.deepEqual(r.moved, ['1.13 (#47 B-3a)', '0005 (#47 B-3a)']);
});

test('one card can move numbers on several rows', () => {
  const r = wrapupLedger(ledger(), { pr: 60, cards: [47], date });
  assert.equal(rows(r.text).find((l) => l.startsWith('| Migration')), '| Migration | 0005 (10-27, B-3a, PR #60); 0004_orders (PR #38) | 0006 (#52 B-4) | next is 0007 |');
});

test('several items on a row: only the matching ones move; all moved leaves a dash', () => {
  const r = wrapupLedger(ledger(), { pr: 60, cards: [47, 48], date });
  assert.equal(rows(r.text).find((l) => l.startsWith('| Spec version')), '| Spec version | 1.13 (10-27, B-3a, PR #60); 1.14 (10-27, B-3b, PR #60); 1.12 (10-26, card B-2, PR #41) | — | section 10 |');
});

test('an empty Currently used cell gets no stray dash', () => {
  const r = wrapupLedger(ledger({ used: '—', assigned: '1.13 (#47)' }), { pr: 60, cards: [47], date });
  assert.equal(rows(r.text).find((l) => l.startsWith('| Spec version')), '| Spec version | 1.13 (10-27, PR #60) | — | section 10 |');
});

test('the PR number itself also matches an assigned item', () => {
  const r = wrapupLedger(ledger({ assigned: '1.13 (#60 B-3a)' }), { pr: 60, cards: [], date });
  assert.match(rows(r.text).find((l) => l.startsWith('| Spec version')), /1\.13 \(10-27, B-3a, PR #60\)/);
});

test('card #4 does not match #47: only the #4 lock row goes, numbers of #47 stay', () => {
  const r = wrapupLedger(ledger(), { pr: 61, cards: [4], date });
  assert.deepEqual(r.moved, []);
  assert.deepEqual(r.removedLocks, ['#4 old card']);
  assert.ok(r.text.includes('| #47 B-3a order flag'));
  assert.ok(r.text.includes('1.13 (#47 B-3a), 1.14 (#48 B-3b)'));
});

test('removes the lock row that starts with #N; other rows and mentions in the session table stay', () => {
  const r = wrapupLedger(ledger(), { pr: 60, cards: [47], date });
  assert.deepEqual(r.removedLocks, ['#47 B-3a order flag']);
  assert.ok(!r.text.includes('| #47 B-3a order flag'));
  assert.ok(r.text.includes('| #48 B-3b'));
  assert.ok(r.text.includes('| S-001 | routine, card #47 |'));
});

test('nothing to do: text is returned unchanged', () => {
  const text = ledger();
  const r = wrapupLedger(text, { pr: 999, cards: [], date });
  assert.equal(r.text, text);
  assert.deepEqual(r.moved, []);
  assert.deepEqual(r.removedLocks, []);
});

test('commas inside parentheses do not split an item', () => {
  assert.deepEqual(splitItems('1.15 (S-010 A, B), 1.16 (S-011 #200)'), ['1.15 (S-010 A, B)', '1.16 (S-011 #200)']);
});

test('a ledger with the wrong shape throws a readable error', () => {
  assert.throws(() => wrapupLedger('# no sections', { pr: 1, cards: [], date }), /no "Numbers" section/);
  assert.throws(() => wrapupLedger('## Numbers\n\n| a | b |\n| - | - |\n| x | y |\n\n## Active cards and file locks\n', { pr: 1, cards: [], date }), /do not match/);
});

test('headings and columns can be renamed in the config', () => {
  const cfg = merge(DEFAULTS, { ledgerHeadings: { numbers: 'Nummern', locks: 'Sperren' }, ledgerColumns: { used: 'Benutzt', assigned: 'Vergeben' } });
  const text = ledger().replace('## Numbers', '## Nummern').replace('## Active cards and file locks', '## Sperren').replace('Currently used', 'Benutzt').replace('Assigned (unmerged)', 'Vergeben');
  const r = wrapupLedger(text, { pr: 60, cards: [47], date }, cfg);
  assert.deepEqual(r.removedLocks, ['#47 B-3a order flag']);
  assert.equal(r.moved.length, 2);
});

test('bot branches are skipped', () => {
  assert.equal(shouldSkip('bot/wrapup-60'), true);
  assert.equal(shouldSkip('feature/x'), false);
  assert.equal(shouldSkip(undefined), false);
  assert.equal(shouldSkip('auto/x', 'auto/'), true);
});

const checklist = `# Needs owner

- [ ] Publish the script, after merge #47
- [ ] Do something after merge #470
- [ ] Before merge #4
- [x] Done already, merge #47
- [ ] Run the migration after merge #47
  - [ ] Sub item: wait for merge #47
Text mentioning merge #47 but not a checklist line
`;

test('ticks only unticked lines that say "merge #PR"; every other line is untouched', () => {
  const r = checkOffLines(checklist, { pr: 47, date });
  assert.equal(r.count, 3);
  const before = checklist.split('\n');
  const after = r.text.split('\n');
  assert.equal(after[2], '- [x] Publish the script, after merge #47 (merged 10-27, auto)');
  assert.equal(after[6], '- [x] Run the migration after merge #47 (merged 10-27, auto)');
  assert.equal(after[7], '  - [x] Sub item: wait for merge #47 (merged 10-27, auto)');
  for (const i of [0, 1, 3, 4, 5, 8, 9]) assert.equal(after[i], before[i]);
});

test('no matching line: count 0 and the text is the same', () => {
  const r = checkOffLines(checklist, { pr: 5, date });
  assert.equal(r.count, 0);
  assert.equal(r.text, checklist);
});

/* ---------------- run(): fake GitHub ---------------- */

function fakeGh({ ledgerText, failOn, noLedger = false } = {}) {
  const calls = [];
  const gh = async (method, path, body) => {
    calls.push({ method, path, body });
    if (failOn && `${method} ${path}`.startsWith(failOn)) throw new Error('boom');
    if (path.startsWith('/contents/') && method === 'GET') {
      if (noLedger) throw Object.assign(new Error('Not Found'), { status: 404 });
      return { content: Buffer.from(ledgerText).toString('base64'), sha: 'filesha' };
    }
    if (path === '/git/ref/heads/main') return { object: { sha: 'mainsha' } };
    if (path === '/pulls') return { number: 300 };
    if (path === '/issues/9') return { body: '- [ ] after merge #60' };
    if (path.startsWith('/issues/9/comments')) return [{ id: 7, body: '- [ ] merge #60' }, { id: 8, body: 'unrelated' }];
    return {};
  };
  return { gh, calls };
}
const withOwner = merge(DEFAULTS, { needsOwnerIssue: 9 });

test('run: a change opens a branch, commits only the ledger, opens a PR labelled auto-merge and ticks the checklist', async () => {
  const { gh, calls } = fakeGh({ ledgerText: ledger() });
  await run(gh, { pr: 60, body: 'Closes #47', headRef: 'feature/x', time: new Date('2026-10-27T03:00:00Z') }, withOwner);
  const put = calls.find((c) => c.method === 'PUT');
  assert.equal(put.path, '/contents/.agents/ledger.md');
  assert.equal(put.body.branch, 'bot/wrapup-60');
  assert.equal(put.body.sha, 'filesha');
  assert.match(Buffer.from(put.body.content, 'base64').toString(), /1\.13 \(10-27, B-3a, PR #60\)/);
  assert.equal(calls.filter((c) => c.method === 'PUT').length, 1);
  const pull = calls.find((c) => c.path === '/pulls');
  assert.equal(pull.body.title, 'ledger: wrap up after PR #60 (auto)');
  assert.doesNotMatch(pull.body.body, /\b(close[sd]?|fix(es|ed)?|resolve[sd]?)\b/i);
  assert.deepEqual(calls.find((c) => c.path === '/issues/300/labels').body, { labels: ['auto-merge'] });
  assert.equal(calls.filter((c) => c.method === 'PATCH').length, 2);
  assert.ok(calls.some((c) => c.path === '/issues/comments/7' && /\[x\]/.test(c.body.body)));
  assert.ok(!calls.some((c) => c.path === '/issues/comments/8'));
});

test('run: the time zone setting decides the date written into the ledger', async () => {
  const { gh, calls } = fakeGh({ ledgerText: ledger() });
  await run(gh, { pr: 60, body: 'Closes #47', headRef: 'x', time: new Date('2026-10-26T20:00:00Z') }, merge(DEFAULTS, { timezone: 'Asia/Taipei' }));
  assert.match(Buffer.from(calls.find((c) => c.method === 'PUT').body.content, 'base64').toString(), /1\.13 \(10-27,/);
});

test('run: a bot branch makes no API call', async () => {
  const { gh, calls } = fakeGh({ ledgerText: ledger() });
  await run(gh, { pr: 300, body: '', headRef: 'bot/wrapup-60' });
  assert.equal(calls.length, 0);
});

test('run: needsOwnerIssue is off by default', async () => {
  const { gh, calls } = fakeGh({ ledgerText: ledger() });
  await run(gh, { pr: 999, body: '', headRef: 'x' });
  assert.ok(!calls.some((c) => c.path.startsWith('/issues/')));
});

test('run: no change in the ledger means no PR (the checklist is still handled)', async () => {
  const { gh, calls } = fakeGh({ ledgerText: ledger() });
  await run(gh, { pr: 999, body: '', headRef: 'x' }, withOwner);
  assert.ok(!calls.some((c) => c.path === '/pulls' || c.method === 'PUT'));
  assert.ok(calls.some((c) => c.path === '/issues/9'));
});

test('run: a repo without a ledger is skipped safely', async () => {
  const { gh, calls } = fakeGh({ noLedger: true });
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  try {
    await run(gh, { pr: 5, body: 'Closes #1', headRef: 'x' });
  } finally {
    console.log = orig;
  }
  assert.ok(logs.some((l) => /nothing to wrap up/.test(l)));
  assert.ok(!logs.some((l) => /Wrap up manually/.test(l)));
  assert.ok(!calls.some((c) => c.method !== 'GET'));
});

test('run: a failing step (branch exists) only prints "Wrap up manually"; the checklist step still runs', async () => {
  const { gh, calls } = fakeGh({ ledgerText: ledger(), failOn: 'POST /git/refs' });
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  try {
    await run(gh, { pr: 60, body: 'Closes #47', headRef: 'x' }, withOwner);
  } finally {
    console.log = orig;
  }
  assert.ok(logs.some((l) => l.includes('Wrap up manually')));
  assert.ok(!calls.some((c) => c.path === '/pulls'));
  assert.ok(calls.some((c) => c.method === 'PATCH' && c.path === '/issues/9'));
});
