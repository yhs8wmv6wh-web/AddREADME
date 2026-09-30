// Jobradar-Engine: Merkmale, Gewichte, Lernen, Passungswert, harte Regeln.
// Reine Funktionen ohne DOM und ohne Netz. Dieselbe Datei läuft in der
// Oberfläche (eingebettet durch build.mjs) und im täglichen Lauf (radar.mjs).

export const VERSION = "1.0";

// ---------- Parameter der Lernformel (siehe README, Abschnitt "Formel") ----------
export const PARAMS = {
  K: 1.5, // Lernstärke
  M: 2, // Glättung: so viele "Phantom-Bewertungen mit Signal 0" hat jedes Merkmal
  REASON: 0.75, // Zusatzsignal je angeklicktem Grund auf die Merkmalsgruppen des Grundes
  UNTARGETED: 0.3, // Anteil der Note für Merkmale, die kein angeklickter Grund betrifft
  FREITEXT: 1.0, // Zusatzsignal für im Freitext genannte Begriffe
  FOKUS: 0.25, // Anteil des Grund-Signals für Themenmerkmale, die der Freitext nicht nennt
  BIAS: -0.8,
  SCALE: 2, // Passungswert = 100 * sigmoid(Summe / SCALE)
  GEHALT_GRENZE: 4000,
};

// ---------- Text-Hilfen ----------
export function fold(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function slug(s) {
  return fold(s)
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(ggmbh|gmbh|e\.\s?v\.|ev|ag|kg|co|verlag|verlags|gruppe)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function stem(term) {
  const t = fold(term).trim();
  if (t.length > 6) return t.replace(/(en|er|e|n|s)$/, "");
  return t;
}

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function textHas(text, term) {
  const st = stem(term);
  if (!st) return false;
  return new RegExp("(^|[^a-z0-9])" + escRe(st)).test(fold(text));
}

// ---------- Stammdaten ----------
export const GROUP_LABELS = {
  bereich: "Bereich",
  typ: "Stellentyp",
  agtyp: "Arbeitgebertyp",
  ag: "Arbeitgeber",
  kw: "Stichwort",
  ort: "Ort",
  arbeitsweise: "Arbeitsweise",
  modell: "Anstellung",
  umfang: "Umfang",
  befristet: "Befristung",
  gehalt: "Gehalt",
  sprache: "Sprache",
  senior: "Stufe",
  anf: "Anforderungen",
};

export const BEREICHE = {
  verlag: "Verlag",
  literatur: "Literaturbetrieb",
  theater_buehne: "Theater/Bühne",
  kulturbetrieb: "Kulturbetrieb",
  kulturjournalismus: "Kulturjournalismus",
  ngo_stiftung: "NGO/Stiftung",
  kultur_pr: "Kultur-PR",
  pr: "PR allgemein",
  journalismus: "Nachrichtenjournalismus",
  oeffentlich: "Öffentlicher Dienst",
  sonstiges: "Sonstiges",
};

export const TYPEN = {
  lektorat: "Lektorat",
  dramaturgie: "Dramaturgie",
  programm: "Programmarbeit",
  presse_kommunikation: "Presse/Kommunikation",
  redaktion: "Redaktion",
  produktion: "Formatentwicklung/Produktion",
  pr_beratung: "PR-Beratung",
  fotoredaktion: "Fotoredaktion",
  technik_ki: "Technik/KI",
  seo: "SEO",
  social_media: "Social Media",
  sonstiges: "Sonstiges",
};

export const AGTYPEN = {
  verlag: "Verlag",
  buehne: "Bühne",
  stiftung_ngo: "Stiftung/NGO",
  medium: "Medienhaus",
  agentur: "Agentur",
  verband: "Verband",
  festival: "Festival",
  oeffentlich: "Öffentliche Einrichtung",
  sonstiges: "Sonstiges",
};

// Startgewichte, abgeleitet aus dem Profil (Abschnitt 1 des Auftrags).
export const DEFAULT_WEIGHTS = {
  "bereich:verlag": 1.2,
  "bereich:literatur": 1.2,
  "bereich:theater_buehne": 1.0,
  "bereich:kulturjournalismus": 0.8,
  "bereich:kulturbetrieb": 0.8,
  "bereich:ngo_stiftung": 0.6,
  "bereich:kultur_pr": 0.6,
  "bereich:pr": 0.1,
  "bereich:journalismus": -0.3,
  "bereich:oeffentlich": 0.2,
  "typ:lektorat": 0.8,
  "typ:dramaturgie": 0.8,
  "typ:programm": 0.6,
  "typ:presse_kommunikation": 0.4,
  "typ:redaktion": 0.3,
  "typ:produktion": 0.2,
  "typ:pr_beratung": 0,
  "typ:fotoredaktion": -0.2,
  "typ:technik_ki": -0.4,
  "typ:seo": -1.5,
  "typ:social_media": -1.2,
  "agtyp:verlag": 0.3,
  "agtyp:buehne": 0.3,
  "agtyp:stiftung_ngo": 0.3,
  "agtyp:festival": 0.2,
  "agtyp:verband": 0.1,
  "agtyp:medium": -0.1,
  "agtyp:agentur": -0.1,
  "ort:berlin": 0.6,
  "ort:anderer_ort": -4.0,
  "arbeitsweise:remote": 0.3,
  "arbeitsweise:hybrid": 0.3,
  "arbeitsweise:praesenz": -0.1,
  "modell:fest": 0.4,
  "modell:frei": -0.6,
  "umfang:vollzeit": 0.3,
  "umfang:teilzeit": -0.3,
  "befristet:ja": -0.5,
  "befristet:nein": 0.3,
  "gehalt:ueber": 0.5,
  "gehalt:grenzwertig": -0.2,
  "gehalt:unter": -1.2,
  "gehalt:unklar": -0.1,
  "sprache:de": 0.2,
  "sprache:en": -0.3,
  "senior:junior": -0.8,
  "senior:senior": 0.1,
  "anf:fremd": -1.2,
};

// Stichwort-Vokabular: Begriff (Wortanfang, ohne Umlaute) -> Startgewicht.
export const DEFAULT_VOCAB = {
  literatur: 0.6,
  lektor: 0.5,
  belletristik: 0.5,
  sachbuch: 0.3,
  roman: 0.3,
  programm: 0.3,
  dramaturg: 0.6,
  feuilleton: 0.6,
  kultur: 0.3,
  theater: 0.4,
  oper: 0.3,
  buhne: 0.3,
  festival: 0.3,
  stiftung: 0.2,
  demokrat: 0.3,
  konzept: 0.3,
  ideen: 0.2,
  entwickeln: 0.2,
  ubersetz: 0.3,
  redigier: 0.2,
  faktencheck: 0.2,
  kritik: 0.3,
  essay: 0.3,
  kinderbuch: 0,
  jugendbuch: 0,
  "seo": -1.0,
  "social media": -0.5,
  boulevard: -1.5,
  lifestyle: -0.5,
  entertainment: -0.3,
  content: -0.3,
  newsdesk: -0.6,
  schichtdienst: -0.5,
  ticker: -0.6,
  bewegtbild: 0,
  "kunstliche intelligenz": 0,
};

// Gründe: pol = +1/-1, ziele = Merkmalsgruppen, die der Grund gezielt verstärkt.
export const DEFAULT_REASONS = [
  { id: "thema_passt", label: "Thema passt", pol: 1, ziele: ["bereich", "typ", "kw"] },
  { id: "thema_passt_nicht", label: "Thema passt nicht", pol: -1, ziele: ["bereich", "typ", "kw"] },
  { id: "kreativ", label: "kreativ", pol: 1, ziele: ["typ", "kw"] },
  { id: "mechanisch", label: "zu mechanisch", pol: -1, ziele: ["typ", "kw"] },
  { id: "gehalt_ok", label: "Gehalt ok", pol: 1, ziele: ["gehalt"] },
  { id: "gehalt_niedrig", label: "Gehalt zu niedrig", pol: -1, ziele: ["gehalt", "agtyp"] },
  { id: "sicher", label: "sicher", pol: 1, ziele: ["befristet", "modell"] },
  { id: "unsicher", label: "zu unsicher/befristet", pol: -1, ziele: ["befristet", "modell"] },
  { id: "ort_ok", label: "Ort ok", pol: 1, ziele: ["ort", "arbeitsweise"] },
  { id: "ort_nicht", label: "Ort passt nicht", pol: -1, ziele: ["ort", "arbeitsweise"] },
  { id: "ag_gut", label: "Arbeitgeber gut", pol: 1, ziele: ["ag", "agtyp"] },
  { id: "haltung", label: "Haltung des Arbeitgebers passt nicht", pol: -1, ziele: ["ag"] },
  { id: "fordernd", label: "fordernd", pol: 1, ziele: ["typ", "senior"] },
  { id: "unterfordernd", label: "unterfordernd", pol: -1, ziele: ["typ", "senior"] },
  { id: "zu_junior", label: "zu Junior", pol: -1, ziele: ["senior"] },
  { id: "zu_senior", label: "zu Senior", pol: -1, ziele: ["senior"] },
  { id: "anforderungen", label: "Anforderungen nicht erfüllbar", pol: -1, ziele: ["anf", "senior"] },
];

export const STATUS = ["neu", "interessant", "beworben", "gespraech", "abgesagt", "abgelehnt", "abgelaufen"];
export const STATUS_LABELS = {
  neu: "neu",
  interessant: "interessant",
  beworben: "beworben",
  gespraech: "Gespräch",
  abgesagt: "abgesagt",
  abgelehnt: "abgelehnt (von mir)",
  abgelaufen: "abgelaufen",
};

// ---------- Identität und Dubletten ----------
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function normUrl(u) {
  try {
    const x = new URL(u);
    x.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "language"].forEach((p) => x.searchParams.delete(p));
    return (x.host.replace(/^www\./, "") + x.pathname.replace(/\/+$/, "") + (x.search || "")).toLowerCase();
  } catch {
    return String(u || "").toLowerCase();
  }
}

export function titelKey(job) {
  const t = fold(job.titel).replace(/\((m|w|d|\/|\s)+\)|[*:](in|innen)\b|\(?m\/w\/d\)?|w\/m\/d/g, " ");
  return slug(job.arbeitgeber) + "|" + t.replace(/[^a-z0-9]+/g, " ").trim();
}

export function jobId(job) {
  return "j" + hash(titelKey(job));
}

export function isDuplicate(job, existing) {
  const u = normUrl(job.url);
  const k = titelKey(job);
  return existing.find((e) => normUrl(e.url) === u || titelKey(e) === k) || null;
}

// ---------- Merkmale ----------
export function jobText(job) {
  return [job.titel, job.arbeitgeber, job.kurz, job.notiz].filter(Boolean).join(" \n ");
}

export function gehaltKlasse(job) {
  const lo = Number(job.gehalt_monat_min) || null;
  const hi = Number(job.gehalt_monat_max) || lo;
  if (!lo && !hi) return "unklar";
  const g = PARAMS.GEHALT_GRENZE;
  if (lo >= g) return "ueber";
  if (hi < g) return "unter";
  return "grenzwertig";
}

// Bildet einen Freitext-Begriff auf ein vorhandenes Stichwort ab
// ("Dramaturgie" -> "dramaturg"), sonst auf seinen eigenen Wortstamm.
export function canonicalTerm(term, vocab) {
  const st = stem(term);
  for (const k of Object.keys(vocab || {})) {
    const sk = stem(k);
    if (sk.length >= 4 && (st.startsWith(sk) || sk.startsWith(st))) return sk;
  }
  return st;
}

export function vocabulary(ratings, extra) {
  const v = { ...DEFAULT_VOCAB, ...(extra || {}) };
  for (const r of ratings || []) {
    const p = parseFreitext(r.freitext);
    for (const t of [...p.plus, ...p.minus]) {
      const c = canonicalTerm(t, v);
      if (!Object.keys(v).some((k) => stem(k) === c)) v[c] = 0;
    }
  }
  return v;
}

export function features(job, vocab) {
  const out = [];
  const add = (g, v) => v && out.push(g + ":" + v);
  add("bereich", job.bereich || "sonstiges");
  add("typ", job.typ || "sonstiges");
  add("agtyp", job.agtyp || "sonstiges");
  add("ag", slug(job.arbeitgeber));
  const text = jobText(job);
  for (const term of Object.keys(vocab || DEFAULT_VOCAB)) if (textHas(text, term)) add("kw", stem(term));
  const ort = fold(job.ort);
  const aw = job.arbeitsweise || "unklar";
  if (/berlin/.test(ort)) add("ort", "berlin");
  else if (aw !== "remote") add("ort", "anderer_ort");
  add("arbeitsweise", aw);
  add("modell", /frei|honorar/.test(fold(job.modell)) ? "frei" : "fest");
  const um = fold(job.umfang);
  add("umfang", /vollzeit/.test(um) ? "vollzeit" : /teilzeit|%|0,\d/.test(um) ? "teilzeit" : "unklar");
  add("befristet", job.befristet || "unklar");
  add("gehalt", gehaltKlasse(job));
  add("sprache", job.sprache || "de");
  const ti = fold(job.titel);
  add(
    "senior",
    /leitung|leiter|head of|direktor/.test(ti)
      ? "leitung"
      : /senior/.test(ti)
        ? "senior"
        : /volont|trainee|junior|praktik|werkstud|assistenz/.test(ti)
          ? "junior"
          : "mittel",
  );
  if (job.anforderungen === "fremd") add("anf", "fremd");
  return [...new Set(out)];
}

export function groupOf(f) {
  return f.slice(0, f.indexOf(":"));
}

export function labelFor(f, jobsById) {
  const g = groupOf(f);
  const v = f.slice(g.length + 1);
  switch (g) {
    case "bereich":
      return BEREICHE[v] || v;
    case "typ":
      return TYPEN[v] || v;
    case "agtyp":
      return "Arbeitgebertyp " + (AGTYPEN[v] || v);
    case "ag": {
      if (jobsById) for (const j of Object.values(jobsById)) if (slug(j.arbeitgeber) === v) return j.arbeitgeber;
      return "Arbeitgeber " + v;
    }
    case "kw":
      return "„" + v + "…“";
    case "ort":
      return v === "berlin" ? "Berlin" : "nicht Berlin, nicht remote";
    case "arbeitsweise":
      return { remote: "remote", hybrid: "hybrid", praesenz: "nur Präsenz", unklar: "Arbeitsweise unklar" }[v] || v;
    case "modell":
      return v === "fest" ? "Festanstellung" : "frei";
    case "umfang":
      return { vollzeit: "Vollzeit", teilzeit: "Teilzeit", unklar: "Umfang unklar" }[v] || v;
    case "befristet":
      return { ja: "befristet", nein: "unbefristet", unklar: "Befristung unklar" }[v] || v;
    case "gehalt":
      return {
        ueber: "Gehalt über 4.000 €",
        grenzwertig: "Gehalt um 4.000 €",
        unter: "Gehalt unter 4.000 €",
        unklar: "Gehalt unklar",
      }[v];
    case "sprache":
      return v === "de" ? "Deutsch" : "Englisch";
    case "senior":
      return { junior: "Einstiegsstelle", mittel: "mittlere Stufe", senior: "Senior", leitung: "Leitung" }[v] || v;
    case "anf":
      return "fachfremde Anforderungen";
    default:
      return f;
  }
}

// ---------- Freitext -> Signale und harte Regeln ----------
const W = "([\\p{L}][\\p{L}\\-]*(?:\\s+[\\p{Lu}][\\p{L}\\-]*)?)";
const STOP = new Set([
  "problem", "interesse", "lust", "bock", "ahnung", "thema", "mehr", "sorge", "zeit", "ahnung",
  "gute", "guter", "gutes", "gut", "ganz", "so", "zu", "sehr", "wirklich", "stelle", "job",
  "fall", "wieder", "mal", "einzige", "idee",
]);

function clean(t) {
  const w = t.trim().replace(/[.,;!?]+$/, "");
  if (!w || STOP.has(fold(w))) return null;
  return w;
}

export function parseFreitext(text) {
  const res = { ausschluss: [], immer: [], plus: [], minus: [] };
  if (!text) return res;
  const s = " " + String(text).replace(/\s+/g, " ") + " ";
  const push = (arr, t) => {
    const c = clean(t || "");
    if (c && !arr.some((x) => fold(x) === fold(c))) arr.push(c);
  };
  let m;
  const neg = new RegExp(
    "(?:nie wieder|nie mehr|niemals|keinesfalls|auf keinen fall|keinerlei|keinen|keiner|keine|kein)\\s+" + W,
    "giu",
  );
  while ((m = neg.exec(s))) {
    const t = m[1].split(/\s+/)[0];
    push(res.ausschluss, t);
    push(res.minus, t);
  }
  const negAfter = /([\p{L}][\p{L}\-]*)\s+(?:nie wieder|niemals|auf keinen fall)/giu;
  while ((m = negAfter.exec(s))) {
    push(res.ausschluss, m[1]);
    push(res.minus, m[1]);
  }
  const uninteressant = /([\p{L}][\p{L}\-]*)\s+(?:interessiert|interessieren|reizt|reizen)\s+mich\s+(?:nicht|kaum|null)/giu;
  while ((m = uninteressant.exec(s))) push(res.minus, m[1]);
  const weniger = /weniger\s+([\p{L}][\p{L}\-]*)/giu;
  while ((m = weniger.exec(s))) push(res.minus, m[1]);
  const mehr = /(?<!nie |nicht |kein |keine |keinen )mehr\s+([\p{L}][\p{L}\-]*)/giu;
  while ((m = mehr.exec(s))) push(res.plus, m[1]);
  const immer1 = /([\p{L}][\p{L}\-.]*)\s+(?:(?:bitte|gern|gerne)\s+)?immer\s+(?:zeigen|anzeigen)/giu;
  while ((m = immer1.exec(s))) {
    push(res.immer, m[1]);
    push(res.plus, m[1]);
  }
  const immer2 = /immer\s+([\p{L}][\p{L}\-.]*)\s+(?:zeigen|anzeigen)/giu;
  while ((m = immer2.exec(s))) {
    push(res.immer, m[1]);
    push(res.plus, m[1]);
  }
  // Ein Begriff, der ausgeschlossen wird, soll nicht gleichzeitig positiv zählen.
  res.plus = res.plus.filter((p) => !res.minus.some((x) => fold(x) === fold(p)));
  return res;
}

export function rulesFromFreitext(text, ratingId, ts) {
  const p = parseFreitext(text);
  const mk = (art, t) => ({
    id: art + "-" + slug(t),
    aktiv: true,
    art,
    muster: [t],
    quelle: { bewertung: ratingId, text },
    erstellt: ts || new Date().toISOString(),
    von: "seite",
  });
  return [...p.ausschluss.map((t) => mk("ausschluss", t)), ...p.immer.map((t) => mk("immer", t))];
}

export function ruleMatches(rule, job) {
  const text = rule.feld === "arbeitgeber" ? job.arbeitgeber : jobText(job);
  return (rule.muster || []).some((m) => textHas(text, m));
}

// ---------- Lernen ----------
// ratings: [{id (= Job-ID), note 1..5, gruende:[id], freitext, ts}]
export function ratingSignals(rating, job, reasons, vocab) {
  const t = (rating.note - 3) / 2;
  const rdefs = (rating.gruende || []).map((id) => reasons.find((r) => r.id === id)).filter(Boolean);
  const targeted = new Set(rdefs.flatMap((r) => r.ziele));
  const out = {};
  const feats = job ? features(job, vocab) : [];
  const p = parseFreitext(rating.freitext);
  // Nennt der Freitext konkrete Begriffe ("kein Kinderbuch"), konzentriert sich
  // das Themen-Signal auf diese Begriffe; Bereich/Typ/übrige Stichwörter
  // bekommen dann nur einen kleinen Anteil (FOKUS).
  const named = new Set([...p.plus, ...p.minus].map((t) => "kw:" + canonicalTerm(t, vocab)));
  const THEMA = ["bereich", "typ", "kw"];
  for (const f of feats) {
    const g = groupOf(f);
    const focusOff = named.size && THEMA.includes(g) && !named.has(f);
    let s = t * (focusOff || (targeted.size && !targeted.has(g)) ? PARAMS.UNTARGETED : 1);
    for (const r of rdefs) if (r.ziele.includes(g)) s += PARAMS.REASON * r.pol * (focusOff ? PARAMS.FOKUS : 1);
    out[f] = s;
  }
  for (const term of p.minus) {
    const f = "kw:" + canonicalTerm(term, vocab);
    out[f] = (out[f] || 0) - PARAMS.FREITEXT;
  }
  for (const term of p.plus) {
    const f = "kw:" + canonicalTerm(term, vocab);
    out[f] = (out[f] || 0) + PARAMS.FREITEXT;
  }
  return out;
}

export function buildModel({ jobs, ratings, reasons, priors, vocabExtra }) {
  const R = reasons && reasons.length ? reasons : DEFAULT_REASONS;
  const vocab = vocabulary(ratings, vocabExtra);
  const byId = Object.fromEntries((jobs || []).map((j) => [j.id, j]));
  const sum = {};
  const n = {};
  const contrib = {};
  for (const r of ratings || []) {
    const job = byId[r.id] || r.job_snapshot;
    if (!job || !(r.note >= 1 && r.note <= 5)) continue;
    const sig = ratingSignals(r, job, R, vocab);
    for (const [f, s] of Object.entries(sig)) {
      sum[f] = (sum[f] || 0) + s;
      n[f] = (n[f] || 0) + 1;
      (contrib[f] = contrib[f] || []).push({ bewertung: r.id, s });
    }
  }
  const w = {};
  const w0 = { ...DEFAULT_WEIGHTS };
  for (const [term, val] of Object.entries(vocab)) w0["kw:" + stem(term)] = val;
  for (const [f, p] of Object.entries(priors || {})) w0[f] = typeof p === "object" ? p.wert : p;
  const keys = new Set([...Object.keys(w0), ...Object.keys(sum)]);
  for (const f of keys) {
    const nf = n[f] || 0;
    const denom = nf + PARAMS.M;
    const adj = nf ? (PARAMS.K * sum[f]) / denom : 0;
    w[f] = {
      w0: w0[f] || 0,
      adj,
      w: (w0[f] || 0) + adj,
      n: nf,
      beitraege: (contrib[f] || []).map((c) => ({ bewertung: c.bewertung, delta: (PARAMS.K * c.s) / denom })),
    };
  }
  return { weights: w, vocab, reasons: R };
}

export function weightOf(model, f) {
  return model.weights[f] ? model.weights[f].w : 0;
}

export function scoreJob(job, model, rules) {
  const feats = features(job, model.vocab);
  let raw = PARAMS.BIAS;
  const teile = [];
  for (const f of feats) {
    const w = weightOf(model, f);
    raw += w;
    if (Math.abs(w) >= 0.15) teile.push({ f, w });
  }
  teile.sort((a, b) => Math.abs(b.w) - Math.abs(a.w));
  const wert = Math.round(100 / (1 + Math.exp(-raw / PARAMS.SCALE)));
  let regel = null;
  for (const r of rules || []) {
    if (!ruleMatches(r, job)) continue;
    if (r.art === "immer") regel = r;
    else if (!regel) regel = r;
  }
  return { wert, raw, teile, feats, regel };
}

export function rank(jobs, model, rules) {
  return jobs
    .map((j) => ({ job: j, score: scoreJob(j, model, rules) }))
    .sort((a, b) => {
      const ra = a.score.regel?.art === "immer" ? 1 : a.score.regel?.art === "ausschluss" ? -1 : 0;
      const rb = b.score.regel?.art === "immer" ? 1 : b.score.regel?.art === "ausschluss" ? -1 : 0;
      return rb - ra || b.score.wert - a.score.wert;
    });
}

// Unterschiede zwischen zwei Modellen, mit Herkunft je Bewertung.
export function diffModels(before, after, { min = 0.05, limit = 20 } = {}) {
  const keys = new Set([...Object.keys(before.weights), ...Object.keys(after.weights)]);
  const out = [];
  for (const f of keys) {
    const a = before.weights[f]?.w || 0;
    const b = after.weights[f]?.w || 0;
    if (Math.abs(b - a) >= min) out.push({ f, von: a, nach: b, delta: b - a });
  }
  out.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  return out.slice(0, limit);
}

export function fmt(x) {
  const s = (Math.round(x * 100) / 100).toFixed(2).replace(".", ",");
  return x > 0 ? "+" + s : s.replace("-", "−");
}

// ---------- Fristen ----------
export function fristInfo(job, today) {
  if (!job.frist || !/^\d{4}-\d{2}-\d{2}$/.test(job.frist)) return { tage: null, bald: false, vorbei: false };
  const d0 = new Date((today || new Date().toISOString().slice(0, 10)) + "T00:00:00Z");
  const d1 = new Date(job.frist + "T00:00:00Z");
  const tage = Math.round((d1 - d0) / 86400000);
  return { tage, bald: tage >= 0 && tage <= 3, vorbei: tage < 0 };
}
