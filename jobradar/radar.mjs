#!/usr/bin/env node
// Werkzeug für den täglichen Lauf (siehe LAUF.md). Arbeitet auf einem Export
// der Seiten-Datenbank (ArtifactData list mit out_dir) und nutzt dieselbe
// engine.js wie die Oberfläche.
//
//   node radar.mjs lernen    <export>             Bericht: neue Bewertungen, Gewichtsänderungen mit Herkunft, Regelvorschläge
//   node radar.mjs aufnehmen <export> <kand.json> Kandidaten prüfen, Dubletten entfernen, Schreibaufträge erzeugen
//   node radar.mjs fristen   <export> [JJJJ-MM-TT] abgelaufene Stellen finden
//   node radar.mjs profilmd  <export> <ziel.md>   profil/aktuell als Markdown-Datei spiegeln
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import * as E from "./engine.js";

const [, , cmd, dir, arg] = process.argv;
if (!cmd || !dir) {
  console.error("Aufruf: node radar.mjs <lernen|aufnehmen|fristen|profilmd> <exportordner> [...]");
  process.exit(2);
}

function coll(name) {
  const p = join(dir, name);
  if (!existsSync(p)) return [];
  return readdirSync(p)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ ...JSON.parse(readFileSync(join(p, f), "utf8")), id: f.replace(/\.json$/, "") }));
}
function doc(c, id) {
  const p = join(dir, c, id + ".json");
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
}
function state() {
  const jobs = coll("jobs");
  const ratings = coll("ratings");
  const alleRegeln = coll("rules");
  const rules = alleRegeln.filter((r) => r.aktiv !== false);
  const priors = doc("model", "prioren") || {};
  const vocabExtra = (doc("model", "vokabular") || {}).terms || {};
  const reasons = [...E.DEFAULT_REASONS, ...((doc("config", "gruende") || {}).liste || [])];
  return { jobs, ratings, rules, alleRegeln, priors, vocabExtra, reasons };
}
const out = (o) => console.log(JSON.stringify(o, null, 2));

if (cmd === "lernen") {
  const s = state();
  const byId = Object.fromEntries(s.jobs.map((j) => [j.id, j]));
  const neu = s.ratings.filter((r) => !r.verarbeitet_in);
  const now = E.buildModel({ jobs: s.jobs, ratings: s.ratings, reasons: s.reasons, priors: s.priors, vocabExtra: s.vocabExtra });
  // Vergleich mit dem Stand beim letzten Lauf; fehlt er, mit dem Modell ohne neue Bewertungen.
  const snap = doc("model", "stand_letzter_lauf");
  const alt = snap && snap.weights
    ? { weights: Object.fromEntries(Object.entries(snap.weights).map(([f, w]) => [f, { w }])) }
    : E.buildModel({ jobs: s.jobs, ratings: s.ratings.filter((r) => r.verarbeitet_in), reasons: s.reasons, priors: s.priors, vocabExtra: s.vocabExtra });
  const diff = E.diffModels(alt, now, { min: 0.05, limit: 25 }).map((d) => ({
    merkmal: d.f,
    label: E.labelFor(d.f, byId),
    von: +d.von.toFixed(2),
    nach: +d.nach.toFixed(2),
    delta: +d.delta.toFixed(2),
    aus_bewertungen: (now.weights[d.f]?.beitraege || [])
      .filter((b) => neu.some((r) => r.id === b.bewertung))
      .map((b) => ({ bewertung: b.bewertung, titel: (byId[b.bewertung] || s.ratings.find((r) => r.id === b.bewertung)?.job_snapshot || {}).titel, delta: +b.delta.toFixed(2) })),
  }));
  const regelvorschlaege = neu.flatMap((r) => E.rulesFromFreitext(r.freitext, r.id, r.ts)).filter((r) => !s.alleRegeln.some((x) => x.id === r.id)); // auch von dir gelöschte (aktiv:false) nicht neu anlegen
  const weights = Object.fromEntries(Object.entries(now.weights).map(([f, v]) => [f, Math.round(v.w * 1000) / 1000]));
  mkdirSync(join(dir, "_lauf"), { recursive: true });
  writeFileSync(join(dir, "_lauf", "stand_letzter_lauf.json"), JSON.stringify({ ts: new Date().toISOString(), weights }));
  out({
    neue_bewertungen: neu.map((r) => ({
      id: r.id,
      titel: (byId[r.id] || r.job_snapshot || {}).titel,
      arbeitgeber: (byId[r.id] || r.job_snapshot || {}).arbeitgeber,
      note: r.note,
      gruende: (r.gruende || []).map((g) => s.reasons.find((x) => x.id === g)?.label || g),
      freitext: r.freitext || "",
      freitext_erkannt: E.parseFreitext(r.freitext),
      ts: r.ts,
    })),
    gewichtsaenderungen_seit_letztem_lauf: diff,
    regelvorschlaege_aus_freitext: regelvorschlaege,
    bestehende_regeln: s.rules.map((r) => ({ id: r.id, art: r.art, muster: r.muster })),
    staerkste_positive: Object.entries(now.weights).sort((a, b) => b[1].w - a[1].w).slice(0, 10).map(([f, v]) => [E.labelFor(f, byId), +v.w.toFixed(2)]),
    staerkste_negative: Object.entries(now.weights).sort((a, b) => a[1].w - b[1].w).slice(0, 10).map(([f, v]) => [E.labelFor(f, byId), +v.w.toFixed(2)]),
    neuer_stand_datei: join(dir, "_lauf", "stand_letzter_lauf.json"),
  });
} else if (cmd === "aufnehmen") {
  const s = state();
  const kand = JSON.parse(readFileSync(arg, "utf8"));
  const pflicht = ["titel", "arbeitgeber", "ort", "url", "kurz", "bereich", "typ", "agtyp", "befristet", "arbeitsweise", "quelle"];
  const heute = new Date().toISOString().slice(0, 10);
  const model = E.buildModel({ jobs: s.jobs, ratings: s.ratings, reasons: s.reasons, priors: s.priors, vocabExtra: s.vocabExtra });
  const angenommen = [];
  const abgelehnt = [];
  const known = [...s.jobs];
  for (const k of kand) {
    const fehlt = pflicht.filter((f) => !k[f]);
    if (fehlt.length) { abgelehnt.push({ titel: k.titel, grund: "Felder fehlen: " + fehlt.join(", ") }); continue; }
    if (k.url_status !== "ok" || !k.geprueft) { abgelehnt.push({ titel: k.titel, grund: "Anzeige nicht geöffnet/geprüft (url_status muss ok sein, geprueft gesetzt)" }); continue; }
    if (!E.BEREICHE[k.bereich] || !E.TYPEN[k.typ] || !E.AGTYPEN[k.agtyp]) { abgelehnt.push({ titel: k.titel, grund: "unbekannter bereich/typ/agtyp" }); continue; }
    if (k.frist && E.fristInfo(k, heute).vorbei) { abgelehnt.push({ titel: k.titel, grund: "Frist vorbei" }); continue; }
    if ((k.gehalt_monat_min || k.gehalt_monat_max) && typeof k.gehalt_schaetzung !== "boolean") { abgelehnt.push({ titel: k.titel, grund: "gehalt_schaetzung (true/false) fehlt" }); continue; }
    const dup = E.isDuplicate(k, known);
    if (dup) { abgelehnt.push({ titel: k.titel, grund: "Dublette von " + dup.id }); continue; }
    const job = { sprache: "de", modell: "Festanstellung", ...k, id: E.jobId(k), status: "neu", gefunden: heute };
    known.push(job);
    angenommen.push(job);
  }
  mkdirSync(join(dir, "_lauf", "neu"), { recursive: true });
  const writes = angenommen.map((j) => {
    const f = join(dir, "_lauf", "neu", j.id + ".json");
    writeFileSync(f, JSON.stringify(j));
    return { op: "set", collection: "jobs", doc_id: j.id, file_path: f };
  });
  writeFileSync(join(dir, "_lauf", "writes_jobs.json"), JSON.stringify(writes, null, 1));
  out({
    angenommen: angenommen.map((j) => ({ id: j.id, titel: j.titel, arbeitgeber: j.arbeitgeber, passung: E.scoreJob(j, model, s.rules).wert })),
    abgelehnt,
    writes_datei: join(dir, "_lauf", "writes_jobs.json"),
  });
} else if (cmd === "fristen") {
  const s = state();
  const heute = arg || new Date().toISOString().slice(0, 10);
  const offen = ["neu", "interessant"];
  out({
    frist_vorbei: s.jobs.filter((j) => offen.includes(j.status || "neu") && E.fristInfo(j, heute).vorbei).map((j) => ({ id: j.id, titel: j.titel, frist: j.frist })),
    zu_pruefen: s.jobs.filter((j) => offen.includes(j.status || "neu")).map((j) => ({ id: j.id, titel: j.titel, url: j.url, url_status: j.url_status })),
  });
} else if (cmd === "profilmd") {
  const p = doc("profil", "aktuell") || {};
  const md = `${p.text || ""}\n\n## Suchbegriffe\n${(p.suchbegriffe || []).map((x) => "- " + x).join("\n")}\n\n## Quellen\n${(p.quellen || []).map((x) => "- " + (typeof x === "string" ? x : x.name)).join("\n")}\n\n_Stand: ${p.stand || "?"}, zuletzt geändert von ${p.von === "du" ? "dir" : "Claude"}._\n`;
  writeFileSync(arg, md);
  console.log("geschrieben: " + arg);
} else {
  console.error("Unbekannter Befehl: " + cmd);
  process.exit(2);
}
