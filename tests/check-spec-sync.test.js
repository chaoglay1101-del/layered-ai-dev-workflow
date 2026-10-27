// Spec sync check (what CI runs on a PR). Pure functions, no git. Patterns come from the config.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, merge } from '../scripts/lib/config.mjs';
import { checkSeoSync, checkSpecSync, isCode, isSeo, parsePrBody, parseVersion } from '../scripts/check-spec-sync.mjs';

const config = merge(DEFAULTS, { specSync: { seoFiles: ['^src/pages/', '^src/layouts/', '^public/robots\\.txt$'] } });
const base = { spec_version: '1.5', last_change: 'added AGENTS.md' };
const run = (extra) => checkSpecSync({ config, ...extra });
const runSeo = (extra) => checkSeoSync({ config, ...extra });

test('docs and tests do not need a spec update; code does', () => {
  for (const f of ['README.md', 'AGENTS.md', 'CLAUDE.md', 'docs/notes.md', '.claude/skills/x/SKILL.md', 'tests/a.test.js', '.agents/ledger.md', '.agents/usage/1.json', '.github/ISSUE_TEMPLATE/task.yml']) {
    assert.equal(isCode(f, config), false, f);
  }
  for (const f of ['src/index.js', 'src/pages/index.html', 'package.json', '.github/workflows/ci.yml']) assert.equal(isCode(f, config), true, f);
  assert.equal(run({ changed: ['README.md', 'tests/x.test.js'], base, head: base }).ok, true);
});

test('the not-code patterns are configurable', () => {
  const cfg = merge(DEFAULTS, { specSync: { notCode: ['^only-docs/'] } });
  assert.equal(isCode('README.md', cfg), true);
  assert.equal(isCode('only-docs/a.md', cfg), false);
});

test('mixing docs with code still requires the update and names the code file', () => {
  const r = run({ changed: ['docs/x.md', 'src/a.js'], base, head: base });
  assert.equal(r.ok, false);
  assert.match(r.message, /src\/a\.js/);
});

test('code changed but spec-sync.json not updated fails', () => {
  const r = run({ changed: ['src/index.js'], base, head: base });
  assert.equal(r.ok, false);
  assert.match(r.message, /src\/index\.js/);
});

test('version must go up; same or lower fails', () => {
  assert.equal(run({ changed: ['src/index.js', 'spec-sync.json'], base, head: { spec_version: '1.6', last_change: 'x' } }).ok, true);
  assert.equal(run({ changed: ['src/index.js', 'spec-sync.json'], base, head: { spec_version: '2.0' } }).ok, true);
  assert.equal(run({ changed: ['src/index.js', 'spec-sync.json'], base, head: { spec_version: '1.4' } }).ok, false);
  assert.equal(run({ changed: ['src/index.js', 'spec-sync.json'], base, head: { spec_version: '1.5', last_change: 'edited text' } }).ok, false);
  assert.equal(run({ changed: ['src/index.js', 'spec-sync.json'], base: { spec_version: '1.9' }, head: { spec_version: '1.10' } }).ok, true);
});

test('"not affected" keeps the version but needs a new reason', () => {
  const skip = { spec_version: '1.5', last_change: 'Spec not affected: fixed a typo' };
  assert.equal(run({ changed: ['src/index.js', 'spec-sync.json'], base, head: skip }).ok, true);
  assert.equal(run({ changed: ['src/index.js', 'spec-sync.json'], base, head: { spec_version: '1.5', last_change: 'Spec not affected:' } }).ok, false);
  assert.equal(run({ changed: ['src/index.js', 'spec-sync.json'], base: skip, head: skip }).ok, false);
});

test('version format and first-time addition', () => {
  assert.deepEqual(parseVersion('1.12'), [1, 12]);
  assert.equal(parseVersion('v1.5'), null);
  assert.equal(run({ changed: ['src/index.js', 'spec-sync.json'], base, head: { spec_version: 'v1.6' } }).ok, false);
  assert.equal(run({ changed: ['src/index.js', 'spec-sync.json'], base: null, head: { spec_version: '1.6' } }).ok, true);
  assert.equal(run({ changed: ['src/index.js'], base: null, head: null }).ok, false);
});

test('which files count as SEO files comes from the config; empty list switches the check off', () => {
  assert.equal(isSeo('src/pages/faq.html', config), true);
  assert.equal(isSeo('public/robots.txt', config), true);
  assert.equal(isSeo('src/index.js', config), false);
  assert.equal(isSeo('src/pages/faq.html', DEFAULTS), false);
  assert.equal(checkSeoSync({ changed: ['src/pages/faq.html'], base, head: base }).ok, true);
});

const seoBase = { spec_version: '1.5', seo_spec_version: '1.0', seo_last_change: 'created' };

test('SEO files: seo_spec_version must go up, or give a "not affected" reason', () => {
  const changed = ['src/pages/faq.html', 'spec-sync.json'];
  assert.equal(runSeo({ changed: ['src/index.js'], base: seoBase, head: seoBase }).ok, true);
  assert.equal(runSeo({ changed, base: seoBase, head: { ...seoBase, seo_spec_version: '1.1' } }).ok, true);
  assert.equal(runSeo({ changed, base: seoBase, head: seoBase }).ok, false);
  assert.equal(runSeo({ changed, base: seoBase, head: { ...seoBase, seo_last_change: 'SEO spec not affected: button text only' } }).ok, true);
  assert.equal(runSeo({ changed, base: seoBase, head: { ...seoBase, seo_last_change: 'SEO spec not affected:' } }).ok, false);
  assert.equal(runSeo({ changed, base: { spec_version: '1.5' }, head: seoBase }).ok, true);
  assert.equal(runSeo({ changed, base: { spec_version: '1.5' }, head: { spec_version: '1.6' } }).ok, false);
});

test('PR description lines are parsed', () => {
  const pr = parsePrBody('Summary\nSpec: 1.48 changed section 4.10\nSEO spec: not affected: button only\n');
  assert.deepEqual(pr.spec, { version: '1.48', note: 'changed section 4.10' });
  assert.deepEqual(pr.seo, { skip: true, reason: 'button only' });
  assert.deepEqual(parsePrBody('nothing'), { spec: null, seo: null });
  assert.equal(parsePrBody('SEO spec: 1.8 x').spec, null);
  assert.equal(parsePrBody('Spec: not affected: <reason>').spec.reason, '');
  assert.equal(parsePrBody('Spec: abc').spec.invalid, true);
});

test('a PR description line alone is enough (spec-sync.json untouched)', () => {
  assert.equal(run({ changed: ['src/index.js'], base, head: base, pr: parsePrBody('Spec: 1.6 new feature') }).ok, true);
  assert.equal(run({ changed: ['src/index.js'], base, head: base, pr: parsePrBody('Spec: not affected: typo only') }).ok, true);
});

test('fallback: no description line, spec-sync.json updated the old way', () => {
  assert.equal(run({ changed: ['src/index.js', 'spec-sync.json'], base, head: { spec_version: '1.6', last_change: 'x' }, pr: parsePrBody('') }).ok, true);
});

test('neither a description line nor a spec-sync.json change fails and says so', () => {
  const r = run({ changed: ['src/index.js'], base, head: base, pr: parsePrBody('just text') });
  assert.equal(r.ok, false);
  assert.match(r.message, /PR description/);
});

test('description version not greater than base, or empty reason, fails', () => {
  const bad = (text, b = base) => run({ changed: ['src/index.js'], base: b, head: b, pr: parsePrBody(text) }).ok;
  assert.equal(bad('Spec: 1.5 same'), false);
  assert.equal(bad('Spec: 1.4 lower'), false);
  assert.equal(bad('Spec: not affected:'), false);
  assert.equal(bad('Spec: not affected: <reason>'), false);
  assert.equal(bad('Spec: 1.10 x', { spec_version: '1.9' }), true);
});

test('SEO line is required separately; the two specs are judged independently', () => {
  const changed = ['src/pages/faq.html'];
  assert.equal(runSeo({ changed, base: seoBase, head: seoBase, pr: parsePrBody('Spec: 1.6 x') }).ok, false);
  assert.equal(runSeo({ changed, base: seoBase, head: seoBase, pr: parsePrBody('SEO spec: 1.1 x') }).ok, true);
  assert.equal(runSeo({ changed, base: seoBase, head: seoBase, pr: parsePrBody('SEO spec: 1.0 x') }).ok, false);
  assert.equal(runSeo({ changed, base: seoBase, head: seoBase, pr: parsePrBody('SEO spec: not affected: text only') }).ok, true);
  assert.equal(run({ changed, base: seoBase, head: seoBase, pr: parsePrBody('Spec: 1.6 x') }).ok, true);
});
