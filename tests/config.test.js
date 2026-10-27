import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULTS, merge, loadConfig } from '../scripts/lib/config.mjs';

test('merge: nested objects merge, arrays are replaced, underscore keys are ignored', () => {
  const m = merge(DEFAULTS, { _note: 'x', labels: { autoMerge: 'ship-it' }, ignoredPaths: [] });
  assert.equal(m.labels.autoMerge, 'ship-it');
  assert.deepEqual(m.labels.lock, ['agent:ready', 'agent:running']);
  assert.deepEqual(m.ignoredPaths, []);
  assert.equal(m._note, undefined);
});

test('loadConfig: a missing file gives the defaults; the shipped workflow.config.json is valid and equals them', () => {
  assert.deepEqual(loadConfig('does-not-exist.json'), DEFAULTS);
  const shipped = loadConfig(new URL('../workflow.config.json', import.meta.url).pathname);
  assert.deepEqual(shipped, DEFAULTS);
  JSON.parse(readFileSync(new URL('../workflow.config.json', import.meta.url), 'utf8'));
});
