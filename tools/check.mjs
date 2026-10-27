#!/usr/bin/env node
/* Watcher's automatic check. Run it with `node tools/check.mjs` from the repository root (Node 18 or later, no
   packages needed). It reads index.html and data/, and fails (exit code 1) on anything that would break the site
   or leave a citation or link pointing nowhere. Warnings are printed but don't fail the run. */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const errors = [], warnings = [];
const err = m => errors.push(m), warn = m => warnings.push(m);

/* 1. the page's scripts must parse */
function scriptById(id, json) {
  const re = new RegExp(`<script id="${id}"${json ? ' type="application/json"' : ""}>([\\s\\S]*?)</script>`);
  const m = html.match(re);
  if (!m) err(`missing <script id="${id}">`);
  return m ? m[1] : "";
}
const app = scriptById("app"), geolib = scriptById("geolib");
for (const [name, code] of [["app", app], ["geolib", geolib]]) {
  try { new vm.Script(code, {filename: name + ".js"}); } catch (e) { err(`script "${name}" has a syntax error: ${e.message}`); }
}

/* 2. embedded and external JSON must parse */
let mapdata = {pins: []};
for (const id of ["mapdata", "state"]) {
  try { const v = JSON.parse(scriptById(id, true)); if (id === "mapdata") mapdata = v; } catch (e) { err(`<script id="${id}"> is not valid JSON: ${e.message}`); }
}
for (const f of ["geo.json", "detail.json"]) {
  try { JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8")); } catch (e) { err(`data/${f} is missing or not valid JSON: ${e.message}`); }
}

/* 3. files the page links to (icons) must exist */
for (const m of html.slice(0, html.indexOf("<style")).matchAll(/<link[^>]+href="(?!https?:|data:)([^"]+)"/g))
  if (!fs.existsSync(path.join(ROOT, m[1]))) err(`index.html links to ${m[1]}, which doesn't exist`);

/* 4. the site's data: read each literal straight out of the app script */
function literal(name, after = "var " + name + "=") {
  const i = app.indexOf(after);
  if (i < 0) { err(`couldn't find ${name} in the app script`); return null; }
  let j = i + after.length, d = 0, k = j, str = null;
  const open = app[j], close = open === "{" ? "}" : "]";
  for (; k < app.length; k++) {
    const c = app[k];
    if (str) { if (c === "\\") { k++; continue; } if (c === str) str = null; continue; }
    if (c === '"' || c === "'") str = c; else if (c === open) d++; else if (c === close && !--d) break;
  }
  try { return vm.runInNewContext("(" + app.slice(j, k + 1) + ")", {NOWY: 2100}); }
  catch (e) { err(`${name} couldn't be read: ${e.message}`); return null; }
}
const SRC = literal("SRC") || {}, CITE = literal("CITE") || {}, CLAIMS = literal("CLAIMS") || [], CLST = literal("CLST") || {};
const BASE = literal("BASE") || [], TLM = literal("TLM") || [], TLE = literal("TLE") || [], TLP = literal("TLP") || [], TLBK = literal("TLBK") || [];
const PEOPLE = (literal("PEOPLE") || []).concat(literal("PEOPLE+", "PEOPLE=PEOPLE.concat(") || []);
const pins = mapdata.pins || [];

const ids = new Map();
const add = (id, kind) => { if (ids.has(id)) err(`duplicate id ${id} (${ids.get(id)} and ${kind})`); else ids.set(id, kind); };
BASE.forEach(n => add(n.id, "org chart")); PEOPLE.forEach(p => add(p.id, "person")); pins.forEach(p => add(p.id, "map pin"));
TLM.forEach(m => add(m[0], "milestone")); TLBK.forEach(b => add("tl-b-" + b[0], "book")); CLAIMS.forEach(c => add(c.id, "claim"));
const tree = new Set(BASE.map(n => n.id)), people = new Set(PEOPLE.map(p => p.id)), pinIds = new Set(pins.map(p => p.id));
const tl = new Set([...TLM.map(m => m[0]), ...TLBK.map(b => "tl-b-" + b[0]), ...TLE.map(e => "tl-e-" + e[0]), ...TLP.map(p => "tl-p-" + p[0])]);
const linkOK = l => l[0] === "tree" ? tree.has(l[1]) : l[0] === "map" ? pinIds.has(l[1]) : l[0] === "timeline" ? tl.has(l[1]) : false;

BASE.forEach(n => { if (n.p && !tree.has(n.p)) err(`org chart box ${n.id} has a missing parent ${n.p}`);
  (n.rel || []).forEach(l => { if (!linkOK(l)) err(`org chart box ${n.id} links to missing ${l[0]} entry ${l[1]}`); }); });
pins.forEach(p => { if (typeof p.lat !== "number" || typeof p.lon !== "number" || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180) err(`map pin ${p.id} has bad coordinates`);
  if (!["gov", "mil", "uap", "sec", "civ", "co", "anc"].includes(p.c)) err(`map pin ${p.id} has unknown category ${p.c}`); });
TLE.forEach(e => { if (!pinIds.has(e[0])) err(`timeline event for missing pin ${e[0]}`); if (e[2] && !tree.has(e[2])) err(`timeline event ${e[0]} names missing office ${e[2]}`); });
TLP.forEach(p => { if (!tree.has(p[0])) err(`timeline bar for missing office ${p[0]}`); if (p[3] && !pinIds.has(p[3])) err(`timeline bar ${p[0]} names missing pin ${p[3]}`); });
TLM.forEach(m => { if (m[3] && !tree.has(m[3])) err(`milestone ${m[0]} names missing office ${m[3]}`); if (m[4] && !pinIds.has(m[4])) err(`milestone ${m[0]} names missing pin ${m[4]}`); });
TLBK.forEach(b => { b[3].forEach(a => { if (/^pp-/.test(a) && !people.has(a)) err(`book ${b[0]} names missing person ${a}`); });
  if (b[5] && !pinIds.has(b[5])) err(`book ${b[0]} names missing pin ${b[5]}`); if (b[6] && !tree.has(b[6])) err(`book ${b[0]} names missing office ${b[6]}`); });
PEOPLE.forEach(p => (p.L || []).forEach(l => { if (!linkOK(l)) err(`person ${p.id} links to missing ${l[0]} entry ${l[1]}`); }));
CLAIMS.forEach(c => { if (!CLST[c.st]) err(`claim ${c.id} has unknown status ${c.st}`); if (c.by && !people.has(c.by)) err(`claim ${c.id} is by missing person ${c.by}`);
  if (!c.c || !c.r) err(`claim ${c.id} is missing its claim or record text`); (c.L || []).forEach(l => { if (!linkOK(l)) err(`claim ${c.id} links to missing ${l[0]} entry ${l[1]}`); }); });

/* 5. citations: every source exists, every anchor phrase is still in the text it cites */
const text = {};
CLAIMS.forEach(c => text[c.id] = [c.c, c.r]); PEOPLE.forEach(p => text[p.id] = p.d); pins.forEach(p => text[p.id] = [p.d]);
TLM.forEach(m => text[m[0]] = [m[5]]); TLBK.forEach(b => text["tl-b-" + b[0]] = [b[4]]);
BASE.forEach(n => text[n.id] = Array.isArray(n.d) ? n.d : [n.d]);
const used = new Set();
for (const [id, list] of Object.entries(CITE)) {
  if (!ids.has(id)) { err(`citations for unknown entry ${id}`); continue; }
  for (const [para, anchor, keys] of list) {
    keys.split(" ").forEach(k => { used.add(k); if (!SRC[k]) err(`${id} cites missing source ${k}`); });
    const t = text[id] && text[id][para];
    if (t == null) err(`${id} cites paragraph ${para + 1}, which doesn't exist`);
    else if (!t.includes(anchor)) err(`${id}: cited phrase "${anchor}" is no longer in paragraph ${para + 1}`);
  }
}
CLAIMS.forEach(c => { if (!CITE[c.id]) err(`claim ${c.id} has no sources`); });

/* 6. sources: well-formed, used, not duplicated */
const urls = new Map();
for (const [k, v] of Object.entries(SRC)) {
  if (!Array.isArray(v) || v.length !== 5) { err(`source ${k} isn't [title, publisher, date, url, type]`); continue; }
  if (!/^https:\/\//.test(v[3])) err(`source ${k} has a non-https URL`);
  if (urls.has(v[3])) warn(`sources ${urls.get(v[3])} and ${k} share a URL`); else urls.set(v[3], k);
  if (!used.has(k)) warn(`source ${k} is never cited`);
}

/* report */
const n = s => s.toLocaleString("en-US");
console.log(`Watcher check: ${n(BASE.length)} org chart boxes, ${n(PEOPLE.length)} people, ${n(pins.length)} map pins, ${n(TLM.length)} milestones, ${n(TLBK.length)} books, ${n(CLAIMS.length)} claims, ${n(Object.keys(SRC).length)} sources.`);
warnings.forEach(w => console.log("warning: " + w));
errors.forEach(e => console.log("ERROR: " + e));
console.log(errors.length ? `${errors.length} error(s).` : "All checks passed.");
process.exit(errors.length ? 1 : 0);
