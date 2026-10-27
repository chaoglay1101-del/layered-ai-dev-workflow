// CI check: a PR that changes code must say whether the spec document was kept in sync.
//
// The PR description carries one line per spec:
//   Spec: 1.48 <what changed>          or   Spec: not affected: <reason>
//   SEO spec: 1.8 <what changed>       or   SEO spec: not affected: <reason>   (only when a file in seoFiles changes)
// The version must be greater than the one in spec-sync.json on the base ref; "not affected" needs a reason.
// Without those lines it falls back to spec-sync.json (spec_version / last_change, seo_spec_version / seo_last_change):
//   - spec_version is greater than on the base ref, or
//   - spec_version is unchanged and last_change starts with "Spec not affected:" followed by a new reason.
// Which files count as code (everything not matching specSync.notCode) and which are "SEO" files (specSync.seoFiles)
// come from workflow.config.json. With seoFiles empty the second spec is switched off.
//
// Usage: node scripts/check-spec-sync.mjs <base ref>   (PR: origin/main; push to main: HEAD^1)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { DEFAULTS, loadConfig, patterns } from './lib/config.mjs';

export const SKIP_PREFIX = 'Spec not affected:';
export const SEO_SKIP_PREFIX = 'SEO spec not affected:';

export const isCode = (file, config = DEFAULTS) => !patterns(config.specSync.notCode).some((p) => p.test(file));
export const isSeo = (file, config = DEFAULTS) => patterns(config.specSync.seoFiles).some((p) => p.test(file));

export function parseVersion(value) {
  const match = String(value || '').match(/^(\d+)\.(\d+)$/);
  return match ? [Number(match[1]), Number(match[2])] : null;
}

const newer = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);

// One labelled line of the PR description. null = missing; otherwise { version, note } | { skip, reason } | { invalid, raw }
function parseLine(body, label) {
  const match = String(body || '').match(new RegExp(`^[ \\t]*${label}:[ \\t]*(.*)$`, 'mi'));
  if (!match) return null;
  const raw = match[1].trim();
  const skip = raw.match(/^not affected:\s*(.*)$/i);
  if (skip) {
    const reason = skip[1].trim();
    return { skip: true, reason: reason === '<reason>' ? '' : reason };
  }
  const ver = raw.match(/^(\d+\.\d+)(?:\s+(.*))?$/);
  if (ver) return { version: ver[1], note: (ver[2] || '').trim() };
  return { invalid: true, raw };
}

export function parsePrBody(body) {
  return { spec: parseLine(body, 'Spec'), seo: parseLine(body, 'SEO spec') };
}

function checkPrLine({ line, name, base, baseVersion, example }) {
  if (line.invalid) return { ok: false, message: `The "${name}:" line in the PR description is malformed (${JSON.stringify(line.raw)}); write "${name}: ${example} what changed" or "${name}: not affected: reason".` };
  if (line.skip) {
    if (!line.reason) return { ok: false, message: `The PR description says "${name}: not affected:" but gives no reason.` };
    return { ok: true, message: `${name} not affected (PR description): ${line.reason}` };
  }
  if (baseVersion && !newer(parseVersion(line.version), baseVersion)) {
    return { ok: false, message: `${name} version ${line.version} in the PR description is not greater than ${base}; if nothing changed write "${name}: not affected: reason".` };
  }
  return { ok: true, message: `${name} version ${base || '(new)'} -> ${line.version} (PR description): ${line.note}` };
}

// changed: files changed by the PR; base / head: spec-sync.json on the base ref and now (null when the file does not exist)
export function checkSpecSync({ changed, base, head, pr, config = DEFAULTS }) {
  const specFile = config.specSync.specFile;
  const code = changed.filter((f) => isCode(f, config));
  if (!code.length) return { ok: true, message: 'Only docs or tests changed; no spec sync needed.' };
  if (pr && pr.spec) {
    return checkPrLine({ line: pr.spec, name: 'Spec', base: base && base.spec_version, baseVersion: base && parseVersion(base.spec_version), example: '1.48' });
  }
  if (!head) return { ok: false, message: `Code changed but ${specFile} was not found.` };
  const headVersion = parseVersion(head.spec_version);
  if (!headVersion) return { ok: false, message: `spec_version in ${specFile} must look like 1.6, got ${JSON.stringify(head.spec_version)}.` };
  if (!base) return { ok: true, message: `${specFile} added for the first time, spec version ${head.spec_version}.` };

  const list = code.slice(0, 10).join(', ') + (code.length > 10 ? ` and ${code.length - 10} more` : '');
  if (!changed.includes(specFile)) {
    return { ok: false, message: `Code changed (${list}) but the PR description has no "Spec: <version> <what changed>" line (or "Spec: not affected: <reason>") and ${specFile} was not updated. Update the spec document, then write the new version in the PR description.` };
  }
  const baseVersion = parseVersion(base.spec_version) || [0, 0];
  if (newer(headVersion, baseVersion)) return { ok: true, message: `Spec version ${base.spec_version} -> ${head.spec_version}: ${head.last_change || ''}` };
  const note = String(head.last_change || '');
  if (head.spec_version === base.spec_version && note.startsWith(SKIP_PREFIX) && note.length > SKIP_PREFIX.length && note !== base.last_change) {
    return { ok: true, message: `Spec version stays ${head.spec_version}. ${note}` };
  }
  return { ok: false, message: `${specFile} changed but spec_version is not greater than ${base.spec_version}; when the spec is not affected, start last_change with "${SKIP_PREFIX}" and give this change's reason.` };
}

// Second spec (for example SEO): applies only when a file in specSync.seoFiles changes
export function checkSeoSync({ changed, base, head, pr, config = DEFAULTS }) {
  const specFile = config.specSync.specFile;
  const seo = changed.filter((f) => isSeo(f, config));
  if (!seo.length) return { ok: true, message: 'No SEO-related files changed.' };
  if (pr && pr.seo) {
    return checkPrLine({ line: pr.seo, name: 'SEO spec', base: base && base.seo_spec_version, baseVersion: base && parseVersion(base.seo_spec_version), example: '1.8' });
  }
  const list = seo.slice(0, 10).join(', ') + (seo.length > 10 ? ` and ${seo.length - 10} more` : '');
  const headVersion = parseVersion(head && head.seo_spec_version);
  if (!headVersion) return { ok: false, message: `SEO-related files changed (${list}); ${specFile} needs seo_spec_version (like 1.0).` };
  const baseVersion = parseVersion(base && base.seo_spec_version);
  if (!baseVersion) return { ok: true, message: `SEO spec version ${head.seo_spec_version} added for the first time.` };
  if (newer(headVersion, baseVersion)) return { ok: true, message: `SEO spec version ${base.seo_spec_version} -> ${head.seo_spec_version}: ${head.seo_last_change || ''}` };
  const note = String(head.seo_last_change || '');
  if (head.seo_spec_version === base.seo_spec_version && note.startsWith(SEO_SKIP_PREFIX) && note.length > SEO_SKIP_PREFIX.length && note !== base.seo_last_change) {
    return { ok: true, message: `SEO spec version stays ${head.seo_spec_version}. ${note}` };
  }
  return { ok: false, message: `SEO-related files changed (${list}) but seo_spec_version is not greater than ${base.seo_spec_version}. When the SEO spec is not affected, start seo_last_change with "${SEO_SKIP_PREFIX}" and give the reason.` };
}

function git(...args) {
  // stderr is dropped on purpose: `git show` fails when the base ref has no spec-sync.json yet, which is normal
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

function main() {
  const config = loadConfig();
  const specFile = config.specSync.specFile;
  const baseRef = process.argv[2] || 'origin/main';
  const range = baseRef === 'HEAD^1' ? ['HEAD^1', 'HEAD'] : [`${baseRef}...HEAD`];
  const changed = git('diff', '--name-only', ...range).split('\n').map((l) => l.trim()).filter(Boolean);
  let head = null;
  try {
    head = JSON.parse(readFileSync(specFile, 'utf8'));
  } catch {
    head = null;
  }
  let base = null;
  try {
    base = JSON.parse(git('show', `${baseRef}:${specFile}`));
  } catch {
    base = null;
  }
  const pr = parsePrBody(process.env.PR_BODY || '');
  const results = [checkSpecSync({ changed, base, head, pr, config }), checkSeoSync({ changed, base, head, pr, config })];
  for (const result of results) console.log(result.message);
  if (results.some((r) => !r.ok)) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
