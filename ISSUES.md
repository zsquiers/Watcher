# Watcher issues

Started from the 2026-10-23 audit (`docs/audits/2026-10-23.md`). Severity: Critical, High, Medium, Low. Status: **Open**, **Needs decision** (waiting on the owner), **Fixed** (with the batch that fixed it), or **Closed** (no change needed).

## Open and waiting on a decision

| ID | Category | Severity | Status | Issue | Next step |
|---|---|---|---|---|---|
| L-1 | Copyright / legal | High (if monetized) | Needs decision | 21 agency seals and program emblems are embedded in `index.html` (`LOGOS`), including the CIA, FBI, DoD and Presidential seals. U.S. government works aren't copyrighted, but federal law restricts using several of these seals in ways that imply endorsement. Several program emblems may be unofficial. No per-image source or license is recorded. | Record each image's source. Owner decides: keep, replace with text badges, or get legal review before monetizing. |
| L-2 | Licensing | High (if monetized) | Needs decision | Satellite imagery and labels come straight from Esri's public tile servers with no account key. Esri's terms for commercial use need checking. | Read Esri's terms before monetizing, or switch to a provider with clear commercial terms. |
| SEO-2 | Discoverability | High (for growth) | Needs decision | Entries have no address of their own, so they can't be shared or found by search engines. | Feature: add a link for each entry (such as `#/person/pp-grusch`), with the browser's back button working. |
| L-3 | Licensing | Medium | Needs decision | No `LICENSE`. The terms for the site's own text aren't stated. The bundled map-drawing code (`geolib`, which appears to be d3-geo and topojson, ISC license) lacks its license notice. | Owner picks content terms. Then add the ISC notice for the bundled code. |
| PR-1 | Privacy | Low | Needs decision | Google Fonts and the map tile services receive visitors' IP addresses. There's no privacy note. | Host the fonts on the site (the font license allows it). Add a short privacy note before monetizing. |
| C-1 | Code | Low | Needs decision | Leftover code (`buildDoc`, `save`'s `artifactNS` publish path) from when the site was a self-publishing Claude artifact. It never runs on GitHub Pages. | Remove it, or keep it deliberately and document why. |
| T-1 | Research | Medium | Open | No statement-level citations ("Citations pending") on: 6 of 48 org chart boxes, 90 of 123 people, 176 of 262 map pins, 36 of 79 milestones, 32 of 68 books. All 52 claims are fully cited. 164 of 236 sources are Wikipedia. | Cite in batches, people and map pins first, preferring primary sources for key facts. |
| UX-1 | UX | Medium | Open | No About or methodology panel explaining sourcing, the claim statuses, data credits and a disclaimer. | Add an About panel. |
| P-1 | Performance | Medium | Open | `data/geo.json` (2.0 MB) is fetched on every visit, even if the map is never opened. | Fetch it only when the map opens, at least on mobile, or shrink it. |
| D-2 | Provenance | Medium | Open | The source of `data/detail.json` (county and town lines, probably U.S. Census) isn't recorded. `data/geo.json` looks like Natural Earth (public domain) but isn't credited. | Confirm both and add them to the README credits. |
| C-4 | Accessibility | Low | Open | Color contrast hasn't been measured, and no automated accessibility checker has been run. | Run axe or Lighthouse in a browser and fix what it finds. |
| W-3 | Repository | Low | Open | The working clone's remote URL still uses the old repository name (`UAP-Org-Tree-Map-Timeline`). GitHub redirects it, but warns on every push. | Update the remote with `git remote set-url origin https://github.com/zsquiers/Watcher.git`. Left alone in batch 1 because Claude's session access is tied to the old name. |

## Fixed or closed

| ID | Category | Severity | Status | What was done |
|---|---|---|---|---|
| M-1 | Maintainability | High | Fixed (batch 1) | Added `tools/check.mjs` and a GitHub Action that runs it on every pull request and push to `main`. Verified it fails on a planted syntax error, a missing source, a stale cited phrase and a broken link. |
| D-1 | Documentation | Medium | Fixed (batch 1) | Added `README.md`, `PROJECT_STANDARDS.md`, this file, and `docs/audits/2026-10-23.md`. |
| W-1 | Data | Medium | Fixed (batch 1) | 12 Wikipedia links pointed at articles that don't exist. Each replacement was confirmed to load: Pascagoula incident, Aztec crashed saucer hoax, Raymond E. Fowler (Allagash), Stephenville Texas, Tinley Park Lights, Farmington New Mexico, Malmstrom UFO incident (Echo Flight), Aguadilla Puerto Rico, UFO sightings in Brazil (Trindade), and 2004 Mexican UFO incident. Two cases have no Wikipedia coverage: the Coyne case now cites a case file that includes the crew's Army report, and Dalnegorsk cites a Listverse article. The Allagash pin also cites the Yankee Magazine timeline. |
| W-2 | Data | Low | Fixed (batch 1) | Removed a stale citation on the Lake Huron pin. Merged three duplicate sources (the Pentagon videos, Fowler and Malmstrom articles). Removed two never-cited sources (`dod-wiki`, `uaptf-wiki`). |
| S-1 | Security | Medium | Fixed (batch 1) | MapLibre's script and stylesheet now carry integrity hashes. Tested: the genuine files load, and a tampered file is refused, with the site falling back to the drawn globe. |
| SEO-1 | Discoverability | Medium | Fixed (batch 1) | Added a meta description, canonical URL, and Open Graph and Twitter preview tags. |
| C-2 | Code | Low | Fixed (batch 1) | Removed three functions that were never called: `gMakeStars`, `zToK`, `setNight`. |
| C-3 | Accessibility | Low | Closed (no change needed) | The "empty" heading is the welcome card's logo, a `role="img"` element labeled "Watcher", so screen readers announce it correctly. |
| F-1 | Branding | Low | Fixed (PR #53) | The favicon came in two designs and was embedded as data URIs. It's now one design, linked as files from `brand/`. |
