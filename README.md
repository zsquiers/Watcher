# Watcher

An interactive, sourced guide to UFO and UAP history. It has three views:

- **Org chart** of the U.S. government offices and programs that have handled UFO/UAP work, from Project Blue Book to AARO.
- **Map**: a 3D globe of sightings, bases, secret project sites, research groups, companies and ancient sites, with satellite and street styles.
- **Timeline** of programs, incidents, milestones and books, from 1639 to today.

There's also a **claims ledger**, which sets each public claim beside the official record with sources for both, and a **quiz** built from the site's own data.

Live site: <https://zsquiers.github.io/Watcher/>

## How it's built

A static site with no build step and no server. GitHub Pages serves the `main` branch as is.

| Path | What it is |
|---|---|
| `index.html` | The whole app: styles, code, and most of the data (org chart, people, pins, timeline, books, claims, sources, citations) |
| `data/geo.json` | Map outlines (countries, states, coastlines), fetched when the map is needed |
| `data/detail.json` | County and town lines, fetched when you zoom in close |
| `brand/` | Logo and icons |
| `tools/check.mjs` | The automatic check (see below) |
| `.github/workflows/check.yml` | Runs the check on every pull request and push to `main` |
| `PROJECT_STANDARDS.md` | Rules for content, sourcing, code, testing and the issue process |
| `ISSUES.md` | Open and closed issues |
| `docs/audits/` | Dated audit reports |

Loaded from other services at runtime: MapLibre GL 5.24.0 (jsDelivr, with an integrity check), Google Fonts, map tiles (Esri imagery and labels, OpenFreeMap street map, AWS terrain, NASA GIBS clouds and night lights). If they're unavailable, the site still works with its built-in drawn globe.

## Running it locally

Serve the folder with any static server (opening `index.html` directly works too, but the browser blocks the map files):

```
python3 -m http.server 8000
```

Then open <http://localhost:8000/>.

## Checking a change

```
node tools/check.mjs
```

Needs Node 18 or later and no packages. It checks that the page's code parses, the JSON is valid, linked files exist, every link between entries points to something real, every citation names a real source and its cited phrase is still in the text, and every claim has sources. It exits with an error if anything is wrong. GitHub runs it automatically on pull requests.

Before merging a change, also open the site and try the org chart, map, timeline, claims ledger and quiz at desktop and phone widths. See `PROJECT_STANDARDS.md`.

## How changes are made

1. Work on a branch, never directly on `main`.
2. Open a pull request. The check must pass.
3. Preview the exact version at `https://raw.githack.com/zsquiers/Watcher/<commit>/index.html`.
4. Merge, and GitHub Pages publishes it within a minute or two.

## Credits

Satellite imagery and place labels © Esri, Maxar, Earthstar Geographics and the GIS User Community. Street map © OpenFreeMap, OpenMapTiles and OpenStreetMap contributors. Terrain: Mapzen / AWS Terrain Tiles. Clouds and night lights: NASA GIBS. Fonts: Barlow, Barlow Condensed and Cormorant Garamond (SIL Open Font License). Sources for each entry are listed in its details panel.

The provenance of some assets (the agency seals and program emblems, and the county and town line data) still needs to be recorded. See `ISSUES.md`.

## License

Not yet chosen (see issue L-3 in `ISSUES.md`). Until one is added, all rights are reserved by the owner.
