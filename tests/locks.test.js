// Pure functions for task cards and file locks (scripts/lib/locks.mjs). No network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardLocks, cardSections, closedCards, closedIssue, findOverlaps, formatDate, outsideLocks, overlaps, parseLocks } from '../scripts/lib/locks.mjs';

test('cardSections: one entry per ### heading, "_No response_" is empty, a trailing signature is dropped', () => {
  const s = cardSections('### Goal\n\nShip it\n\n### Context\n\n_No response_\n\n### Limits\n\nmax-turns 25\n---\nsigned by bot');
  assert.equal(s.Goal, 'Ship it');
  assert.equal(s.Context, '');
  assert.equal(s.Limits, 'max-turns 25');
});

test('parseLocks: one per line or comma separated; bullets, backticks and notes are dropped', () => {
  assert.deepEqual(parseLocks('- `src/a.js`\n- tests/a.test.js, docs/guide.md (only if needed)\nnone'), ['src/a.js', 'tests/a.test.js', 'docs/guide.md']);
});

test('parseLocks: nested parentheses go away as a whole; Doc: entries are split', () => {
  assert.deepEqual(parseLocks('README.md (after card #5 (in review))'), ['README.md']);
  assert.deepEqual(parseLocks('Doc: Handbook, Runbook\n./src/b.js'), ['Doc: Handbook', 'Doc: Runbook', 'src/b.js']);
});

test('cardLocks reads the configured heading; missing or empty means no locks', () => {
  const body = '### Goal\nx\n\n### Files and docs to change\n\n- src/a.js\n- lib/\n\n### Limits\nmax-turns 25';
  assert.deepEqual(cardLocks(body), ['src/a.js', 'lib/']);
  assert.deepEqual(cardLocks('### Files and docs to change\n\n_No response_'), []);
  assert.deepEqual(cardLocks('### Own heading\n\nsrc/a.js', 'Own heading'), ['src/a.js']);
  assert.deepEqual(cardLocks('nothing here'), []);
});

test('overlaps: same file, folder containing a file, same doc; different files and doc-vs-path do not', () => {
  assert.deepEqual(overlaps(['src/a.js', 'x.js'], ['src/a.js']), ['src/a.js']);
  assert.deepEqual(overlaps(['src/'], ['src/deep/a.js']), ['src/']);
  assert.deepEqual(overlaps(['src/a.js'], ['src/b.js']), []);
  assert.deepEqual(overlaps(['Doc: Handbook'], ['Doc: Handbook']), ['Doc: Handbook']);
  assert.deepEqual(overlaps(['Doc: src/'], ['src/a.js']), []);
});

test('outsideLocks: files no lock covers; ignored paths are always allowed', () => {
  assert.deepEqual(outsideLocks(['src/a.js', 'src/b.js', 'tests/x.js'], ['src/a.js', 'tests/']), ['src/b.js']);
  assert.deepEqual(outsideLocks(['.agents/usage/1.json', 'a.js'], [], ['.agents/usage/']), ['a.js']);
  assert.deepEqual(outsideLocks(['x.js'], ['Doc: x.js']), ['x.js']);
});

test('findOverlaps: one entry per colliding pair', () => {
  const cards = [{ number: 1, locks: ['a.js', 'assets/'] }, { number: 2, locks: ['assets/logo.png'] }, { number: 3, locks: ['c.js'] }];
  assert.deepEqual(findOverlaps(cards), [{ a: 1, b: 2, files: ['assets/logo.png'] }]);
});

test('closedIssue takes the first Closes/Fixes/Resolves #N; closedCards takes all', () => {
  assert.equal(closedIssue('Summary\n\nCloses #12'), 12);
  assert.equal(closedIssue('fixes #5'), 5);
  assert.equal(closedIssue('only mentions #12'), null);
  assert.deepEqual(closedCards('Closes #1, #2 and #3. Fixes #2, resolves #9'), [1, 2, 3, 9]);
  assert.deepEqual(closedCards(undefined), []);
});

test('formatDate gives MM-DD in the requested time zone', () => {
  const t = new Date('2026-10-26T20:30:00Z');
  assert.equal(formatDate(t, 'UTC'), '10-26');
  assert.equal(formatDate(t, 'Asia/Taipei'), '10-27');
  assert.equal(formatDate(t), '10-26');
});
