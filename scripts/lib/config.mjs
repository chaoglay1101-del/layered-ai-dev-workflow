// Reads workflow.config.json (repo root) and merges it over the defaults. Keys starting with "_" are ignored.
import { readFileSync } from 'node:fs';

export const DEFAULTS = {
  repo: null,
  timezone: 'UTC',
  ledgerPath: '.agents/ledger.md',
  ledgerHeadings: { numbers: 'Numbers', sessions: 'Session numbers', locks: 'Active cards and file locks' },
  ledgerColumns: { used: 'Currently used', assigned: 'Assigned' },
  cardHeadings: { files: 'Files and docs to change' },
  labels: { lock: ['agent:ready', 'agent:running'], autoMerge: 'auto-merge', statusReport: 'status-check' },
  botBranchPrefix: 'bot/',
  needsOwnerIssue: null,
  ignoredPaths: ['.agents/usage/'],
  specSync: {
    specFile: 'spec-sync.json',
    notCode: [
      '^README\\.md$', '^AGENTS\\.md$', '^CLAUDE\\.md$', '^TODO\\.md$', '^docs/', '^tests/', '^\\.claude/',
      '^spec-sync\\.json$', '^\\.agents/ledger\\.md$', '^\\.agents/usage/', '^\\.github/ISSUE_TEMPLATE/',
      '^\\.github/pull_request_template\\.md$',
    ],
    seoFiles: [],
  },
};

const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

export function merge(base, extra) {
  const out = { ...base };
  for (const [key, value] of Object.entries(extra || {})) {
    if (key.startsWith('_')) continue;
    out[key] = isObject(value) && isObject(base[key]) ? merge(base[key], value) : value;
  }
  return out;
}

export function loadConfig(path = 'workflow.config.json') {
  let user = {};
  try {
    user = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw new Error(`Cannot read ${path}: ${err.message}`);
  }
  return merge(DEFAULTS, user);
}

export const patterns = (list) => (list || []).map((p) => new RegExp(p));
