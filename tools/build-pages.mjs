#!/usr/bin/env node
/* Builds a plain, readable web page for every entry in Watcher, so search engines can find and index each one:
   people, places (map pins), programs (org chart boxes), claims, timeline milestones and books. It also writes a
   list page for each section, a "browse" hub, sitemap.xml and robots.txt.

   The interactive site stays the single source of truth: this script reads the data straight out of index.html, the
   same way tools/check.mjs does, and every page links back to the entry in the interactive site.

   Run it from the repository root after changing entries (Node 18 or later, no packages):
     node tools/build-pages.mjs           writes the pages
     node tools/build-pages.mjs --check   changes nothing; fails if any page is missing or out of date

   The site's address comes from the <link rel="canonical"> in index.html. To move to a new domain, change that link
   and run the script again. */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

/* ---- reading the data out of index.html ---- */
function scriptById(id, json) {
  const m = html.match(new RegExp(`<script id="${id}"${json ? ' type="application/json"' : ""}>([\\s\\S]*?)</script>`));
  if (!m) throw new Error(`missing <script id="${id}"> in index.html`);
  return m[1];
}
const app = scriptById("app");
function literal(name, after = "var " + name + "=") {
  const i = app.indexOf(after);
  if (i < 0) return null;
  let j = i + after.length, d = 0, k = j, str = null;
  const open = app[j], close = open === "{" ? "}" : "]";
  for (; k < app.length; k++) {
    const c = app[k];
    if (str) { if (c === "\\") { k++; continue; } if (c === str) str = null; continue; }
    if (c === '"' || c === "'") str = c; else if (c === open) d++; else if (c === close && !--d) break;
  }
  return vm.runInNewContext("(" + app.slice(j, k + 1) + ")", {NOWY: 2100});
}
const SRC = literal("SRC") || {}, CITE = literal("CITE") || {}, CLAIMS = literal("CLAIMS") || [], CLST = literal("CLST") || {};
const BASE = literal("BASE") || [], TLM = literal("TLM") || [], TLBK = literal("TLBK") || [];
const PEOPLE = (literal("PEOPLE") || []).concat(literal("PEOPLE+", "PEOPLE=PEOPLE.concat(") || []);
const IMG = literal("IMG") || {}, PHOTO = literal("PHOTO") || {}, CATS = literal("CATS") || {};
const TYPE = literal("TYPE") || {};
const PINS = (JSON.parse(scriptById("mapdata", true)).pins) || [];

const canon = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
if (!canon) throw new Error('index.html has no <link rel="canonical" href="..."> to take the site address from');
const SITE = canon.endsWith("/") ? canon : canon + "/";

/* ---- helpers ---- */
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const paras = d => (Array.isArray(d) ? d : [d]).filter(Boolean).map(String);
const plain = d => paras(d).join(" ").replace(/\s+/g, " ").trim();
function describe(text, max = 158) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1), sp = cut.lastIndexOf(" ");
  return (sp > 80 ? cut.slice(0, sp) : cut).replace(/[,;:.\s]+$/, "") + "…";
}
function slugify(s) {
  return String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72).replace(/-+$/, "") || "entry";
}

/* ---- every entry, with its section, address and the link back into the interactive site ---- */
const SECTIONS = {
  people: {title: "People", blurb: "Officials, scientists, witnesses, researchers and claimants in UFO and UAP history."},
  places: {title: "Places", blurb: "Sighting sites, bases, secret project sites, research groups, companies and ancient sites, on Earth and the Moon."},
  programs: {title: "Programs and offices", blurb: "Government offices and programs that have handled UFO and UAP work, in the U.S. and other countries."},
  claims: {title: "Claims", blurb: "Public claims set beside the official record, with sources for both sides."},
  timeline: {title: "Timeline", blurb: "Milestones in UFO and UAP history."},
  books: {title: "Books", blurb: "Books that shaped the UFO and UAP story."}
};
const entries = [], byId = new Map();
function addEntry(e) {
  const used = new Set(entries.filter(x => x.sec === e.sec).map(x => x.slug));
  let slug = slugify(e.title), n = 2;
  while (used.has(slug)) slug = slugify(e.title) + "-" + n++;
  e.slug = slug; e.path = `${e.sec}/${slug}/`;
  entries.push(e); byId.set(e.id, e);
}
const custom = new Set();
for (const p of PEOPLE) addEntry({sec: "people", id: p.id, title: p.t, sub: p.s, d: p.d, raw: p, hash: "#/person/" + p.id});
for (const p of PINS) addEntry({sec: "places", id: p.id, title: p.t, sub: p.s, d: p.d, raw: p, hash: "#/map/" + p.id});
for (const b of BASE) addEntry({sec: "programs", id: b.id, title: b.t, sub: b.s, d: b.d, raw: b, hash: "#/org/" + b.id});
for (const c of CLAIMS) addEntry({sec: "claims", id: c.id, title: c.t, sub: (CLST[c.st] || [c.st])[0], d: [c.c, c.r], raw: c, hash: "#/claim/" + c.id});
for (const m of TLM) addEntry({sec: "timeline", id: m[0], title: m[2], sub: String(m[1]), d: m[5], raw: m, hash: "#/timeline/" + m[0]});
for (const b of TLBK) addEntry({sec: "books", id: "tl-b-" + b[0], title: b[2], sub: String(b[1]), d: b[4], raw: b, hash: "#/timeline/tl-b-" + b[0]});
void custom;

/* ---- page parts ---- */
const href = (from, to) => "../../" + to; // every entry page sits two folders deep
function cited(e) {
  const list = CITE[e.id] || [], order = [], perPara = {};
  for (const [pi, , keys] of list) for (const k of String(keys).split(/\s+/).filter(Boolean)) {
    if (!SRC[k]) continue;
    if (!order.includes(k)) order.push(k);
    (perPara[pi] = perPara[pi] || new Set()).add(order.indexOf(k) + 1);
  }
  return {order, perPara};
}
function bodyParas(e, ci, heads) {
  return paras(e.d).map((t, i) => {
    const nums = [...(ci.perPara[i] || [])].sort((a, b) => a - b);
    const sup = nums.length ? ' <sup class="cn">' + nums.map(n => `<a href="#s${n}">${n}</a>`).join(",") + "</sup>" : "";
    return (heads && heads[i] ? `<h2>${esc(heads[i])}</h2>` : "") + `<p>${esc(t)}${sup}</p>`;
  }).join("\n");
}
function sourceList(ci) {
  if (!ci.order.length) return "";
  return `<h2>Sources</h2>\n<ol class="src">` + ci.order.map((k, i) => {
    const s = SRC[k];
    return `<li id="s${i + 1}"><a href="${esc(s[3])}" rel="noopener" target="_blank">${esc(s[0])}</a> <span>${esc([s[1], s[2]].filter(Boolean).join(", "))}${TYPE[s[4]] ? " · " + esc(TYPE[s[4]]) : ""}</span></li>`;
  }).join("\n") + `</ol>`;
}
function linkTo(id, label) {
  const t = byId.get(id);
  return t ? `<a href="${href(null, t.path)}">${esc(label || t.title)}</a>` : null;
}
function related(e) {
  const out = [], seen = new Set([e.id]);
  const push = (id, label, why) => { if (seen.has(id)) return; const a = linkTo(id, label); if (a) { seen.add(id); out.push(`<li>${a}${why ? ` <span>${esc(why)}</span>` : ""}</li>`); } };
  const L = e.raw && e.raw.L;
  if (Array.isArray(L)) for (const l of L) push(l[1], null, l[2] && l[2] !== (byId.get(l[1]) || {}).title ? l[2] : "");
  if (e.sec === "people") for (const c of CLAIMS) if (c.by === e.id) push(c.id, null, "Claim");
  if (e.sec === "claims" && e.raw.by) push(e.raw.by, null, "Who made the claim");
  if (e.sec !== "claims") for (const c of CLAIMS) if ((c.L || []).some(l => l[1] === e.id)) push(c.id, null, "Claim");
  if (e.sec === "programs") {
    if (e.raw.p) push(e.raw.p, null, "Part of");
    for (const b of BASE) if (b.p === e.id) push(b.id, null, "Under it");
  }
  if (e.sec === "timeline") { if (e.raw[3]) push(e.raw[3], null, "Office"); if (e.raw[4]) push(e.raw[4], null, "Place"); }
  if (e.sec === "books") for (const a of e.raw[3] || []) if (/^pp-/.test(a)) push(a, null, "Author");
  for (const p of PEOPLE) if ((p.L || []).some(l => l[1] === e.id)) push(p.id, null, "Person");
  return out.length ? `<h2>Related</h2>\n<ul class="rel">${out.join("\n")}</ul>` : "";
}
function image(e) {
  if (e.sec === "people" && PHOTO[e.id]) { const ph = PHOTO[e.id]; return {src: `img/people/${e.id}.${ph[0]}`, alt: e.title, credit: `Photo: ${ph[1]}, ${ph[2]}`, url: ph[3], portrait: true}; }
  if (IMG[e.id]) { const b = IMG[e.id]; return {src: `img/places/${e.id}.${b[0]}`, alt: b[4] || e.title, credit: `${b[4] ? b[4] + ". " : ""}${/^tl-b-/.test(e.id) ? "Cover" : "Photo"}: ${b[1]}, ${b[2]}`, url: b[3]}; }
  return null;
}
function metaLine(e) {
  const r = e.raw;
  if (e.sec === "people") return r.a && r.a !== r.t ? `Also known as ${r.a}` : "";
  if (e.sec === "places") return [r.s, r.body === "moon" ? "On the Moon" : "", CATS[r.c] || "", r.lat != null ? `${Math.abs(r.lat).toFixed(3)}°${r.lat >= 0 ? "N" : "S"}, ${Math.abs(r.lon).toFixed(3)}°${r.lon >= 0 ? "E" : "W"}` : ""].filter(Boolean).join(" · ");
  if (e.sec === "programs") {
    let n = r, g = 0; const chain = []; while (n && n.p && g++ < 40) { n = BASE.find(b => b.id === n.p); if (n) chain.unshift(n.t); }
    const root = n && n.cn ? n.cn : "";
    return [root, r.s, r.st].filter(Boolean).join(" · ");
  }
  if (e.sec === "claims") { const who = r.by && byId.get(r.by) ? byId.get(r.by).title : r.byt; return `Claimed by ${who} · ${r.yr} · ${r.venue}`; }
  if (e.sec === "timeline") return `${r[1]}`;
  if (e.sec === "books") return [String(r[1]), (r[3] || []).map(a => /^pp-/.test(a) ? (byId.get(a) || {}).title : a).filter(Boolean).join(", ")].filter(Boolean).join(" · ");
  return "";
}
function jsonld(e, url, img) {
  const r = e.raw, d = describe(plain(e.d), 300), image = img ? SITE + img.src : undefined;
  const site = {"@type": "WebSite", name: "Watcher", url: SITE};
  let o;
  if (e.sec === "people") o = {"@type": "Person", name: r.t, alternateName: r.a && r.a !== r.t ? r.a.split(/,\s*/) : undefined, description: d, image};
  else if (e.sec === "places") o = {"@type": "Place", name: r.t, description: d, image,
    geo: r.body === "moon" || r.lat == null ? undefined : {"@type": "GeoCoordinates", latitude: r.lat, longitude: r.lon},
    containedInPlace: r.body === "moon" ? {"@type": "Place", name: "Moon"} : undefined};
  else if (e.sec === "programs") o = {"@type": r.p ? "GovernmentOrganization" : "GovernmentOrganization", name: r.t, alternateName: r.s || undefined, description: d};
  else if (e.sec === "claims") o = {"@type": "ClaimReview", claimReviewed: r.t, url,
    itemReviewed: {"@type": "Claim", author: {"@type": r.by ? "Person" : "Organization", name: r.by && byId.get(r.by) ? byId.get(r.by).title : r.byt}, datePublished: String(r.yr)},
    reviewRating: {"@type": "Rating", alternateName: (CLST[r.st] || [r.st])[0]}, author: {"@type": "Organization", name: "Watcher", url: SITE}};
  else if (e.sec === "books") o = {"@type": "Book", name: r[2], datePublished: String(r[1]), description: d, image,
    author: (r[3] || []).map(a => ({"@type": "Person", name: /^pp-/.test(a) ? (byId.get(a) || {}).title : a})).filter(a => a.name)};
  else o = {"@type": "Article", headline: e.title, description: d, image};
  const page = {"@context": "https://schema.org", "@type": "WebPage", name: e.title, url, isPartOf: site, mainEntity: o,
    breadcrumb: {"@type": "BreadcrumbList", itemListElement: [
      {"@type": "ListItem", position: 1, name: "Watcher", item: SITE},
      {"@type": "ListItem", position: 2, name: SECTIONS[e.sec].title, item: SITE + e.sec + "/"},
      {"@type": "ListItem", position: 3, name: e.title, item: url}]}};
  return JSON.stringify(page, (k, v) => v === undefined ? undefined : v).replace(/</g, "\\u003c");
}
function shell({title, desc, url, depth, image, ld, body}) {
  const up = "../".repeat(depth);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:site_name" content="Watcher">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
${image ? `<meta property="og:image" content="${esc(SITE + image)}">\n<meta name="twitter:card" content="summary_large_image">` : `<meta name="twitter:card" content="summary">`}
<link rel="icon" href="${up}brand/watcher-icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${up}pages.css">
${ld ? `<script type="application/ld+json">${ld}</script>` : ""}
</head>
<body>
<header class="top"><a class="brand" href="${up}"><img src="${up}brand/watcher-icon.svg" alt="" width="28" height="28">Watcher</a><nav><a href="${up}browse/">Browse</a><a href="${up}">Open the interactive site</a></nav></header>
<main>
${body}
</main>
<footer><p>Watcher is an interactive, sourced guide to UFO and UAP history. Text is shared under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>; image credits are listed on each page and in the site's credits.</p></footer>
</body>
</html>
`;
}
function entryPage(e) {
  const url = SITE + e.path, ci = cited(e), img = image(e), meta = metaLine(e);
  const status = e.sec === "claims" ? `<p class="status st-${esc(e.raw.st)}"><strong>${esc((CLST[e.raw.st] || [e.raw.st])[0])}</strong> · ${esc((CLST[e.raw.st] || ["", ""])[1])}</p>` : "";
  const heads = e.sec === "claims" ? ["The claim", "The official record"] : null;
  const fig = img ? `<figure class="${img.portrait ? "portrait" : "banner"}"><img src="../../${esc(img.src)}" alt="${esc(img.alt)}" loading="lazy"><figcaption>${esc(img.credit)}${img.url ? ` (<a href="${esc(img.url)}" rel="noopener">source</a>)` : ""}</figcaption></figure>` : "";
  const sec = SECTIONS[e.sec];
  const body = `<p class="crumb"><a href="../../browse/">Browse</a> › <a href="../">${esc(sec.title)}</a></p>
<article>
<h1>${esc(e.title)}</h1>
${e.sub && e.sec !== "claims" && e.sec !== "timeline" && e.sec !== "books" ? `<p class="sub">${esc(e.sub)}</p>` : ""}
${meta ? `<p class="meta">${esc(meta)}</p>` : ""}
${status}
${fig}
${bodyParas(e, ci, heads)}
<p class="open"><a class="btn" href="../../${e.hash}">Open in the interactive Watcher</a></p>
${related(e)}
${sourceList(ci)}
</article>`;
  const title = `${e.title}${e.sec === "claims" ? " — claim" : ""} · Watcher`;
  return shell({title, desc: describe(plain(e.d)), url, depth: 2, image: img && img.src, ld: jsonld(e, url, img), body});
}
function sectionPage(sec) {
  const s = SECTIONS[sec], list = entries.filter(e => e.sec === sec).slice()
    .sort((a, b) => sec === "timeline" || sec === "books" ? (Number(a.raw[1]) - Number(b.raw[1])) || a.title.localeCompare(b.title) : a.title.localeCompare(b.title));
  const body = `<p class="crumb"><a href="../browse/">Browse</a></p>
<h1>${esc(s.title)}</h1>
<p class="sub">${esc(s.blurb)} ${list.length} entries.</p>
<ul class="list">
${list.map(e => `<li><a href="${e.slug}/">${esc(e.title)}</a>${e.sub ? ` <span>${esc(e.sub)}</span>` : ""}</li>`).join("\n")}
</ul>`;
  return shell({title: `${s.title} · Watcher`, desc: s.blurb, url: SITE + sec + "/", depth: 1, body,
    ld: JSON.stringify({"@context": "https://schema.org", "@type": "CollectionPage", name: s.title, url: SITE + sec + "/", isPartOf: {"@type": "WebSite", name: "Watcher", url: SITE}})});
}
function browsePage() {
  const body = `<h1>Browse Watcher</h1>
<p class="sub">Every entry in Watcher as a plain page you can read, link to and share. For the org chart, the map and the timeline, <a href="../">open the interactive site</a>.</p>
<ul class="hub">
${Object.keys(SECTIONS).map(k => `<li><a href="../${k}/"><strong>${esc(SECTIONS[k].title)}</strong></a> <span>${entries.filter(e => e.sec === k).length} entries</span><p>${esc(SECTIONS[k].blurb)}</p></li>`).join("\n")}
</ul>`;
  return shell({title: "Browse · Watcher", desc: "Every entry in Watcher, the sourced guide to UFO and UAP history, as a plain page: people, places, programs, claims, milestones and books.", url: SITE + "browse/", depth: 1, body});
}
const CSS = `:root{--bg:#F4F1EA;--card:#FFFFFF;--ink:#14263D;--ink2:#4A5566;--hair:rgba(20,38,61,.14);--link:#1F5C8C;--amber:#94580A}
@media (prefers-color-scheme:dark){:root{--bg:#0B1220;--card:#121B2C;--ink:#ECE6D8;--ink2:#A7B0BE;--hair:rgba(236,230,216,.14);--link:#8CC0EA;--amber:#E0A040}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:16.5px/1.6 Barlow,"Helvetica Neue",Arial,sans-serif}
a{color:var(--link)}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 20px;border-bottom:1px solid var(--hair);background:var(--card)}
.brand{display:flex;align-items:center;gap:8px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--ink);text-decoration:none}
.top nav{display:flex;gap:16px;font-size:15px}
main{max-width:760px;margin:0 auto;padding:22px 20px 40px}
h1{font:600 2.1rem/1.15 "Cormorant Garamond",Georgia,serif;margin:6px 0 6px}
h2{font-size:1.05rem;margin:28px 0 8px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink2)}
.sub{color:var(--ink2);margin:0 0 6px;font-size:1.05rem}.meta{color:var(--ink2);font-size:.95rem;margin:0 0 14px}
.crumb{font-size:.9rem;color:var(--ink2);margin:0}
.status{border-left:4px solid var(--amber);padding:6px 12px;background:var(--card);border-radius:4px}
figure{margin:16px 0}figure img{max-width:100%;height:auto;border-radius:6px;display:block}
figure.portrait img{width:160px;height:160px;object-fit:cover;border-radius:50%}
figcaption{font-size:.82rem;color:var(--ink2);margin-top:6px}
sup.cn{font-size:.7em;margin-left:2px}sup.cn a{text-decoration:none}
.btn{display:inline-block;padding:9px 16px;border-radius:8px;background:var(--ink);color:var(--bg);text-decoration:none;font-weight:600}
.src{padding-left:22px;font-size:.93rem}.src li{margin:4px 0}.src span,.rel span,.list span,.hub span{color:var(--ink2);font-size:.9rem}
.rel,.list,.hub{padding-left:20px}.rel li,.list li{margin:4px 0}.hub{list-style:none;padding:0}.hub li{background:var(--card);border:1px solid var(--hair);border-radius:8px;padding:12px 14px;margin:10px 0}.hub p{margin:4px 0 0;color:var(--ink2)}
footer{max-width:760px;margin:0 auto;padding:0 20px 30px;font-size:.85rem;color:var(--ink2)}
`;

/* ---- write (or check) everything ---- */
const out = new Map();
for (const e of entries) out.set(e.path + "index.html", entryPage(e));
for (const k of Object.keys(SECTIONS)) out.set(k + "/index.html", sectionPage(k));
out.set("browse/index.html", browsePage());
out.set("pages.css", CSS);
const urls = [SITE, SITE + "browse/", ...Object.keys(SECTIONS).map(k => SITE + k + "/"), ...entries.map(e => SITE + e.path)];
out.set("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${esc(u)}</loc></url>`).join("\n")}\n</urlset>\n`);
out.set("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);

const managed = [...Object.keys(SECTIONS), "browse"];
const existing = new Set();
for (const dir of managed) {
  const walk = d => { if (!fs.existsSync(d)) return; for (const f of fs.readdirSync(d, {withFileTypes: true})) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else existing.add(path.relative(ROOT, p).split(path.sep).join("/")); } };
  walk(path.join(ROOT, dir));
}
const stale = [], missing = [], extra = [...existing].filter(f => !out.has(f));
for (const [f, txt] of out) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) missing.push(f); else if (fs.readFileSync(p, "utf8") !== txt) stale.push(f);
}
if (CHECK) {
  const n = missing.length + stale.length + extra.length;
  if (n) {
    console.log(`Entry pages are out of date: ${missing.length} missing, ${stale.length} changed, ${extra.length} no longer needed.`);
    for (const f of [...missing, ...stale, ...extra].slice(0, 12)) console.log("  " + f);
    console.log("Run `node tools/build-pages.mjs` and commit the result.");
    process.exit(1);
  }
  console.log(`Entry pages are up to date (${entries.length} entries, ${out.size} files).`);
} else {
  for (const f of extra) fs.unlinkSync(path.join(ROOT, f));
  for (const dir of managed) { // remove folders left empty
    const prune = d => { if (!fs.existsSync(d)) return; for (const f of fs.readdirSync(d, {withFileTypes: true})) if (f.isDirectory()) prune(path.join(d, f.name)); if (d !== path.join(ROOT, dir) && !fs.readdirSync(d).length) fs.rmdirSync(d); };
    prune(path.join(ROOT, dir));
  }
  for (const [f, txt] of out) {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p) && fs.readFileSync(p, "utf8") === txt) continue;
    fs.mkdirSync(path.dirname(p), {recursive: true});
    fs.writeFileSync(p, txt);
  }
  console.log(`Wrote ${entries.length} entry pages (${out.size} files in all; ${missing.length} new, ${stale.length} updated, ${extra.length} removed). Site address: ${SITE}`);
}
