// Ledger vs GitHub consistency check: fake data, no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check, findOverlaps, parseLedger, renderLocks, renderReport, report } from '../scripts/status-check.mjs';

const LEDGER = `# Resource ledger

## Numbers

| Resource | Currently used | Assigned (unmerged) | Notes |
| --- | --- | --- | --- |
| Spec version | 1.47 | 1.48 (#73, PR #85), 1.49 (PR feature/x) | |
| Handbook | 2.2 | — | |

## Spec write lock

| Holder | Scope |
| --- | --- |
| L1 | PR #999 must not be read |

## Active cards and file locks

| Card | Level | Locked files | Numbers |
| --- | --- | --- | --- |
| #60 first card | L2 | a.js | none |
| #73 second card | L2 | b.js | 0010 |
`;

const item = (state, merged = false) => ({ state, merged });
const base = () => ({
  ledger: parseLedger(LEDGER),
  items: new Map([[60, item('open')], [73, item('open')], [85, item('open')]]),
  locks: [{ number: 1, locks: ['a.js'] }, { number: 2, locks: ['b.js'] }],
});

test('parseLedger reads active cards and PR numbers from the Assigned column only', () => {
  const l = parseLedger(LEDGER);
  assert.deepEqual(l.cards, [60, 73]);
  assert.deepEqual(l.assigned, [{ pr: 85, resource: 'Spec version' }]);
});

test('everything agrees: no problems', () => {
  const problems = check(base());
  assert.deepEqual(problems, []);
  assert.equal(renderReport(problems), 'Everything agrees');
});

test('a card in the ledger is already closed', () => {
  const c = base();
  c.items.set(60, item('closed'));
  assert.deepEqual(check(c).map((p) => p.kind), ['ledger-card-closed']);
});

test('an assigned PR is merged or closed', () => {
  const c = base();
  c.items.set(85, item('closed', true));
  const [p] = check(c);
  assert.equal(p.kind, 'ledger-pr-done');
  assert.match(p.text, /merged/);
  c.items.set(85, item('closed', false));
  assert.match(check(c)[0].text, /closed/);
});

test('numbers that could not be looked up are not reported', () => {
  const c = base();
  c.items = new Map();
  assert.deepEqual(check(c), []);
});

test('open cards with overlapping locks, including folders', () => {
  const c = base();
  c.locks = [{ number: 1, locks: ['a.js', 'assets/'] }, { number: 2, locks: ['assets/logo.png'] }, { number: 3, locks: ['c.js'] }];
  const [p] = check(c);
  assert.equal(p.kind, 'lock-overlap');
  assert.match(p.text, /#1 and #2/);
  assert.deepEqual(findOverlaps(c.locks), [{ a: 1, b: 2, files: ['assets/logo.png'] }]);
});

test('renderLocks prints a Markdown table', () => {
  const out = renderLocks([{ number: 7, title: 'Add check', labels: ['agent:ready'], locks: ['a.js', 'b.js'] }]);
  assert.match(out, /\| #7 Add check \| agent:ready \| a\.js, b\.js \|/);
  assert.match(renderLocks([]), /No open cards/);
});

// Fake GitHub: records calls and returns a canned list of "Status check" issues
const fakeGh = (found) => {
  const calls = [];
  const gh = async (method, path, body) => {
    calls.push([method, path, body]);
    if (method === 'GET' && path.startsWith('/issues?')) return found;
    if (method === 'POST' && path === '/issues') return { number: 99 };
    return null;
  };
  return { gh, calls };
};
const problem = [{ kind: 'x', text: 'something is off' }];

test('report: problems and no pinned issue yet opens one', async () => {
  const { gh, calls } = fakeGh([]);
  assert.match(await report(gh, problem, undefined, '2026-10-26'), /Opened issue #99/);
  const post = calls.find((c) => c[0] === 'POST' && c[1] === '/issues');
  assert.equal(post[2].title, 'Status check');
  assert.deepEqual(post[2].labels, ['status-check']);
});

test('report: problems and an existing issue updates and reopens it', async () => {
  const { gh, calls } = fakeGh([{ number: 4, title: 'Status check', state: 'closed' }]);
  await report(gh, problem);
  assert.deepEqual(calls.at(-1).slice(0, 2), ['PATCH', '/issues/4']);
  assert.equal(calls.at(-1)[2].state, 'open');
});

test('report: everything agrees comments and closes; with no issue it does nothing', async () => {
  const open = fakeGh([{ number: 4, title: 'Status check', state: 'open' }]);
  await report(open.gh, []);
  assert.equal(open.calls.find((c) => c[1] === '/issues/4/comments')[2].body, 'Everything agrees');
  const none = fakeGh([]);
  assert.match(await report(none.gh, []), /nothing to do/);
  assert.equal(none.calls.length, 1);
});
