// Abnahmetest Schritt 2 auf Ebene der Engine: node --test jobradar/test/
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as E from "../engine.js";

const start = JSON.parse(readFileSync(new URL("../daten/starttreffer.json", import.meta.url)));
const jobs = start.map((j) => ({ ...j, id: E.jobId(j), status: "neu" }));
const find = (s) => jobs.find((j) => j.titel.includes(s) || j.arbeitgeber.includes(s));
const kinder = find("Kinderbuch");
const oper = find("Staatsoper");

test("alle Starttreffer bekommen Passungswert und Begründung", () => {
  const m = E.buildModel({ jobs, ratings: [] });
  for (const j of jobs) {
    const s = E.scoreJob(j, m, []);
    assert.ok(s.wert >= 0 && s.wert <= 100);
    assert.ok(s.teile.length > 0, j.titel);
  }
  // Ortsregel: München und Bonn (nicht remote) liegen unter 40
  assert.ok(E.scoreJob(kinder, m, []).wert < 40);
  assert.ok(E.scoreJob(find("Beethoven"), m, []).wert < 40);
});

test("Dubletten per URL und per Arbeitgeber+Titel", () => {
  assert.ok(E.isDuplicate({ ...oper, url: oper.url + "#x" }, jobs));
  assert.ok(E.isDuplicate({ titel: "Lektor (w/m/d) Kinderbuch", arbeitgeber: "Carl Hanser Verlag GmbH", url: "https://x.de/a" }, jobs));
  assert.equal(E.isDuplicate({ titel: "Dramaturg*in", arbeitgeber: "HAU", url: "https://hau.de/j" }, jobs), null);
});

test("Bewertungen ändern Gewichte, Reihenfolge und erzeugen Regel", () => {
  const before = E.buildModel({ jobs, ratings: [] });
  const ratings = [
    { id: kinder.id, note: 1, gruende: ["thema_passt_nicht"], freitext: "kein Kinderbuch", ts: "2026-09-30T08:00:00Z" },
    { id: oper.id, note: 5, gruende: ["thema_passt"], freitext: "mehr Dramaturgie", ts: "2026-09-30T08:01:00Z" },
  ];
  const after = E.buildModel({ jobs, ratings });
  const w = (m, f) => E.weightOf(m, f);
  assert.ok(w(after, "kw:kinderbuch") < w(before, "kw:kinderbuch") - 0.5, "Kinderbuch sinkt deutlich");
  assert.ok(w(after, "bereich:theater_buehne") > w(before, "bereich:theater_buehne"), "Theater steigt");
  assert.ok(w(after, "kw:dramaturg") > w(before, "kw:dramaturg"), "Dramaturgie aus Freitext steigt");
  // Herkunft nachvollziehbar
  const b = after.weights["kw:kinderbuch"].beitraege;
  assert.equal(b[0].bewertung, kinder.id);
  // Reihenfolge ändert sich
  const r0 = E.rank(jobs, before, []).map((x) => x.job.id);
  const r1 = E.rank(jobs, after, []).map((x) => x.job.id);
  assert.notDeepEqual(r0, r1);
  assert.ok(r1.indexOf(oper.id) < r0.indexOf(oper.id), "Staatsoper rückt nach oben");
  // Harte Regel
  const rules = E.rulesFromFreitext(ratings[0].freitext, kinder.id);
  assert.equal(rules.length, 1);
  assert.equal(rules[0].art, "ausschluss");
  assert.ok(E.ruleMatches(rules[0], kinder));
  assert.ok(!E.ruleMatches(rules[0], oper));
  const r2 = E.rank(jobs, after, rules);
  assert.equal(r2[r2.length - 1].job.id, kinder.id);
  assert.equal(E.scoreJob(kinder, after, rules).regel.art, "ausschluss");
  // Diff listet die Änderungen
  const d = E.diffModels(before, after);
  assert.ok(d.some((x) => x.f === "kw:kinderbuch" && x.delta < 0));
});

test("Glättung: ein seltenes Merkmal springt nicht voll auf den Notenwert", () => {
  const ratings = [{ id: oper.id, note: 5, gruende: [], freitext: "" }];
  const m = E.buildModel({ jobs, ratings });
  const f = "ag:" + E.slug(oper.arbeitgeber);
  // Signal +1, n=1, M=2, K=1.5 -> +0.5
  assert.equal(Math.round(m.weights[f].adj * 100) / 100, 0.5);
});

test("Immer-zeigen-Regel steht oben", () => {
  const m = E.buildModel({ jobs, ratings: [] });
  const rules = E.rulesFromFreitext("Correctiv gern immer zeigen", "x");
  const r = E.rank(jobs, m, rules);
  assert.match(r[0].job.arbeitgeber, /CORRECTIV/);
});

test("Fristen", () => {
  assert.deepEqual(E.fristInfo({ frist: "2026-10-01" }, "2026-09-30"), { tage: 1, bald: true, vorbei: false });
  assert.equal(E.fristInfo({ frist: "2026-09-01" }, "2026-09-30").vorbei, true);
});
