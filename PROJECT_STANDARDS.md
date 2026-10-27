# Watcher project standards

Read this before auditing, fixing, or adding content. It is the yardstick audits measure the project against.

## Purpose and audience

Watcher is a public, research-oriented guide to UFO/UAP history for curious general readers, researchers and journalists. Its value is trust: readers should always be able to see where a statement comes from and how firm it is. It presents claims fairly, including believers' and skeptics' cases, and never presents an allegation as established fact.

## Design and code principles

- **Keep it static and simple.** One `index.html` plus data files, served by GitHub Pages, with no build step and no server. Don't add frameworks, build tools or packages without an explicit decision by the owner.
- **External code is pinned and fingerprinted.** Any script loaded from a CDN names an exact version and carries an integrity hash. Update both together.
- **It works without the network.** If map services, fonts or the map library fail to load, the site must still work, falling back to the drawn globe.
- **Match the surrounding code.** Use the same naming, comment style and idioms. Make no unrelated stylistic changes in a fix.
- **Escape all text** that reaches the page, especially anything typed by visitors, using `esc()`.
- **Mobile is first-class.** Every feature must work at phone width (390px) with no horizontal scrolling.
- **Accessible by default.** Interactive elements must be reachable and usable by keyboard, have a readable name, and respect reduced motion.

## Content and sourcing

- **Every statement of fact is traceable.** Each entry's text is cited at the level of individual statements (`CITE`), each to a real source (`SRC`). New entries must be fully cited before they're merged.
- **Prefer primary sources** (official documents, court records, contemporaneous reporting) for key facts. Wikipedia is fine as a starting point and for background, but shouldn't be the only source for a contested claim.
- **Distinguish the kinds of evidence**, in the text and in the source type:
  - official documents and statements (`doc`);
  - credible reporting and scholarship (`news`, `pub`);
  - reference works (`ref`);
  - archives (`arch`);
  - witness accounts and claims, which are attributed to the person ("he says", "according to").
- **Never present speculation as fact.** Use the claims ledger for contested claims, with one of its statuses: confirmed, partly confirmed, disputed, contested, unverified, officially denied, officially explained, or shown false. Give the strongest version of the claim and the official or skeptical response.
- **Write in your own words.** Summarize; don't copy. Short quotations are fine when attributed and cited.
- **Record where assets come from.** Every image, logo, dataset and media file needs a recorded source and license or permission, in `ISSUES.md` until a credits file exists. Public or declassified doesn't automatically mean free of restrictions; government seals in particular carry legal limits on use.
- **Record dates and names consistently.** Use the year the event happened for timeline placement. In the claims ledger, record when the claim was made, and the event's year (`ev`) when it differs.

## Data rules

- IDs are unique and permanent. Don't rename an ID that other entries, citations or saved notes may point to.
- Link between entries only by ID, and only to entries that exist.
- After any data change, run `node tools/check.mjs`. It must report "All checks passed."
- Edit through small, reviewable changes. Don't regenerate or reformat large blocks of data.

## Testing

Every change needs:

1. `node tools/check.mjs` passing. GitHub runs it on every pull request.
2. A check of the changed feature in a browser.
3. A cross-feature regression pass whenever shared data, styles or code change: the org chart, map (drawn globe, and satellite where possible), timeline, search, claims ledger and quiz, at desktop and phone widths, with no console errors and no horizontal scrolling.

Report honestly what was and wasn't tested.

## Security and privacy

- The site is static: no accounts, no server, no secrets. Never commit keys, tokens or passwords.
- Visitors' notes and pins stay in their own browser (`localStorage`). Don't collect personal data or add analytics or tracking without an explicit decision, and add a privacy note first.
- Accounts, payments or user submissions would need a server and a full security review before any work starts.

## Issues, fixes and audits

- Track every issue in `ISSUES.md`, with an ID, category, severity (Critical, High, Medium, Low), status, and a note on what was done.
- Fix issues in small, related batches. Each batch: state the scope, make the changes, review the diff, run the check and the regression pass, update `ISSUES.md`, then open a pull request with a preview link. Merge only with the owner's approval.
- Issues that need the owner's decision (legal, licensing, new features, removing features) stay open until the owner decides.
- Save full audits in `docs/audits/YYYY-MM-DD.md`. Run a full audit monthly or before a major release, a focused bug hunt after significant changes, and a pre-launch review before monetization.
- Automated review can find risks, but it can't establish asset ownership, guarantee security, or give legal advice. Verify those externally.
