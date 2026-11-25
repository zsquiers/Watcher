# Weekly update check

Instructions for the scheduled weekly session that keeps developing stories current. The owner reviews every change:
this check only ever opens a pull request, and never merges or deploys.

## Steps

1. Clone `zsquiers/Watcher` and work on a new branch named `claude/weekly-update-YYYY-MM-DD`.
2. Read `tools/WATCHLIST.md`. For each open row, search for news since its last check, using reliable sources only:
   official releases (police, sheriff, FBI, DoD/War, ODNI, NASA, Congress), wire services and established outlets
   (AP, Reuters, CBS, NBC, NPR, major and regional newspapers, local TV), and Wikipedia for background. Do not treat
   social media, forums, podcasts or blogs as confirmation. Do not work around paywalls or site blocks.
3. For each real development, edit the affected entries in `index.html` following the conventions already in the file:
   - add each new source to `SRC` (title, publisher, date, URL, type);
   - add citations to `CITE` with phrases that are exact substrings of the entry text;
   - keep the tone neutral and factual; describe private individuals only with what reputable outlets report;
   - refresh time-stamped phrasing such as "as of November 2026" to the current month where the status is unchanged
     and you have confirmed it is unchanged;
   - never change a claim's status (`st`) yourself: describe the development in the PR and let the owner decide.
4. Run `node tools/check.mjs` and `node tools/build-pages.mjs`; both must pass. Fix anything they report.
5. Update `tools/WATCHLIST.md`: set "Last full check" to today, move resolved stories to "Resolved", and add any new
   developing story that clearly belongs on the site.
6. If anything changed on the site, open a pull request to `main` titled `Weekly update: <date>` listing each change
   with its sources, and anything you were unsure about. End the body with the Claude Code attribution footer.
   If nothing changed on the site, do not open a pull request; end the session with a one-line summary saying no
   developments were found.
7. Do not merge. Do not push to `main`. Do not touch other open pull requests.
