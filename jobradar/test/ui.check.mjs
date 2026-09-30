// Abnahmetest Schritt 1+2 in der echten Oberfläche (Chromium, Datenbank simuliert).
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import * as E from "../engine.js";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || "playwright");

const dir = new URL("..", import.meta.url);
const html = readFileSync(new URL("dist/jobradar.html", dir), "utf8");
const mock = readFileSync(new URL("test/mockdb.js", dir), "utf8");
const jobs = JSON.parse(readFileSync(new URL("daten/starttreffer.json", dir))).map((j) => ({ ...j, id: E.jobId(j), status: "neu", url_status: "ungeprueft" }));

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
await page.addInitScript(mock);
await page.addInitScript(`window.__seed = ${JSON.stringify(jobs)};`);
const { writeFileSync } = await import("node:fs");
const tmp = (process.env.SHOT_DIR || "/tmp") + "/jobradar-test.html";
writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${html}</body></html>`);
await page.goto("file://" + tmp);
await page.evaluate(async () => { const db = await window.claude.use("db"); for (const j of window.__seed) await db.doc("jobs/" + j.id).set(j); });
await page.waitForSelector("article.job");
const order = () => page.$$eval("main > .list > article.job", (a) => a.map((x) => x.id));
const n = (await order()).length;
assert.equal(n, 10, "alle 10 Treffer sichtbar");
const whyCount = await page.$$eval("article.job ul.why", (u) => u.filter((x) => x.children.length > 0).length);
assert.equal(whyCount, 10, "jede Stelle mit Begründung");
const before = await order();
await page.screenshot({ path: process.env.SHOT_DIR + "/1-start.png", fullPage: false });

async function rate(id, note, reason, text) {
  await page.click(`#job-${id} button[data-open]`);
  await page.click(`#job-${id} button[data-note="${note}"]`);
  await page.click(`#job-${id} button[data-reason="${reason}"]`);
  if (text) await page.fill(`#ft-${id}`, text);
  await page.click(`#job-${id} button[data-save]`);
  await page.waitForFunction((id) => !document.querySelector(`#job-${id} .rate`), id);
}
const kinder = jobs.find((j) => /Kinderbuch/.test(j.titel)).id;
const oper = jobs.find((j) => /Staatsoper/.test(j.arbeitgeber)).id;
await rate(kinder, 1, "thema_passt_nicht", "kein Kinderbuch");
await page.screenshot({ path: process.env.SHOT_DIR + "/2-nach-kinderbuch.png", fullPage: true });
await rate(oper, 5, "thema_passt", "");
await page.waitForTimeout(100);
const after = await order();
assert.notDeepEqual(after, before, "Reihenfolge hat sich geändert");
assert.ok(!after.includes("job-" + kinder), "Kinderbuch ist aus der Hauptliste raus (Regel)");
assert.equal(await page.$eval("details.hidden-jobs summary", (s) => s.textContent), "1 durch Regel ausgeblendet");
assert.ok(after.indexOf("job-" + oper) <= before.indexOf("job-" + oper), "Staatsoper nicht nach unten");
const store = await page.evaluate(() => Object.fromEntries(window.__store));
const logs = Object.entries(store).filter(([k]) => k.startsWith("log/")).map(([, v]) => v);
const rules = Object.entries(store).filter(([k]) => k.startsWith("rules/")).map(([, v]) => v).filter((r) => r.aktiv !== false);
assert.equal(rules.length, 1); assert.equal(rules[0].art, "ausschluss");
assert.equal(logs.length, 2);
assert.ok(logs.some((l) => /Gelernt: .*kinderbuch.*−/.test(l.text) && /Neue Regel: nie zeigen: Kinderbuch/.test(l.text)), "Protokoll zeigt Kinderbuch-Lernen und Regel");
await page.click('button[data-tab="gelernt"]');
const g = await page.textContent("main");
assert.match(g, /Zuletzt durch deine Bewertungen verschoben/);
assert.match(g, /„kinderbuch…“/);
assert.match(g, /nie zeigen/);
await page.screenshot({ path: process.env.SHOT_DIR + "/3-gelernt.png", fullPage: true });
await page.click('button[data-tab="protokoll"]');
await page.screenshot({ path: process.env.SHOT_DIR + "/4-protokoll.png", fullPage: true });
// Status setzen
await page.click('button[data-tab="treffer"]');
await page.selectOption(`#st-${oper}`, "interessant");
await page.waitForTimeout(50);
assert.equal((await page.evaluate((id) => window.__store.get("jobs/" + id).status, oper)), "interessant");
// Regel löschen macht Kinderbuch wieder sichtbar
await page.click('button[data-tab="gelernt"]');
await page.click("button[data-delrule]");
await page.click('button[data-tab="treffer"]');
await page.waitForTimeout(50);
assert.ok((await order()).includes("job-" + kinder), "nach Löschen der Regel wieder sichtbar");
// Erneute Bewertung mit demselben Freitext darf die gelöschte Regel nicht wiederbeleben
await rate(kinder, 1, "ort_nicht", "kein Kinderbuch");
assert.equal(await page.evaluate(() => window.__store.get("rules/ausschluss-kinderbuch").aktiv), false);
assert.deepEqual(errors, []);
console.log("UI-Test bestanden:", { vorher: before.length, nachher: after.length, logs: logs.length });
console.log("Protokoll:\n" + logs.map((l) => l.text).join("\n---\n"));
await browser.close();
