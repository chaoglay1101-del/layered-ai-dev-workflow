# Appendix: technology stack of the source project

A text-only description of how TechStarterWeb Consulting's own website and its tools are built. None of it is needed to use the workflow; it is
here so the case study can be read in context. No code, addresses or document identifiers are included.

## Website

- **Astro** builds the static pages. The site has three languages: Traditional Chinese, Simplified Chinese and English.
  Simplified Chinese is generated from the Traditional text with **OpenCC**, so only two sets of copy are written by
  hand.
- **Cloudflare Workers** serve the site and the API behind it (inquiry form, order handling, traffic statistics).
  **D1**, Cloudflare's SQLite database, stores inquiries and orders; schema changes are numbered migrations that are applied
  to the production database before the code that needs them is pushed.
- The admin area (order list, statistics) sits behind **Cloudflare Access**, signed in with a one-time code sent by email,
  so there is no password database to protect.
- Pushing to `main` deploys to production automatically. Branches are checked by GitHub Actions (tests and a build).
  Cloudflare's own branch builds are turned off.

## Document bridge

The spec documents, SOPs and the to-do list are Google Docs. A **Google Apps Script** acts as a small bridge so that
workflows can read documents and append rows to a version log without a service account. It is published as a numbered
deployment, and each new deployment number is assigned through the ledger like any other number.

## Prototype factory

A script factory builds a client's first-draft site from a template repository:

1. A test order selects a template and a style preset.
2. The factory creates the client's repository from the template, fills in the content fields, and marks the unfinished
   parts as "to fill".
3. It deploys a **noindex preview** so the draft can be shown without being indexed by search engines.
4. A checker compares the result against the required items in the SOP (the list of must-haves for that type of site) and
   reports what is missing.

A test order reaches a live preview in about 2.5 minutes. Six gallery templates are smoke-tested on pull requests, and
there are four style presets.

## Why it matters for the workflow

The factory, the Worker and the document bridge have many files that several people or agents want to change at once.
That is what the file locks, the ledger and the numbered deployments exist for: one card at a time on the contended files
(the spec, migrations, the admin script), numbers assigned in one place, and CI that fails when the rules are broken.
