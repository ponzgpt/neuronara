// Fitness benchmark: real clinician questions in English, Spanish and German, scored against the documents they should hit.
// Retrieval only: it calls GET /api/search, so it needs a running server and the network (Europe PMC), and is not part of `npm test`.
//   npm run eval                       # against a dev server on :3217
//   BASE=https://neuronara.technoir.cloud npm run eval
//   LANGS=es ONLY=cidp,mslt npm run eval
// Score per question = 0.67 retrieval + 0.33 literature (0-100): the old 0.4/0.2 weights without the answer part, renormalised.
// Questions with no gold document (the library legitimately has nothing) score retrieval on returning nothing instead of neighbours.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3217";
const LANGS = (process.env.LANGS ?? (process.env.SET === "heldout" ? "en,es,de" : "en,es")).split(",");
const ONLY = process.env.ONLY?.split(",");
const CONC = Number(process.env.CONC ?? 6);
const SET = process.env.SET ?? "questions"; // questions = the set the engine was tuned on; heldout = questions written afterwards
const questions = JSON.parse(readFileSync(new URL(`../evals/${SET}.json`, import.meta.url), "utf8")).filter((q) => !ONLY || ONLY.includes(q.id));

async function search(q, lang, i) {
  const t0 = Date.now();
  const params = new URLSearchParams({ q: q[lang], region: q.region ?? "global" });
  const res = await fetch(`${BASE}/api/search?${params}`, { headers: { "x-forwarded-for": `10.9.${i >> 8}.${i & 255}` } }); // one bucket per request: don't trip the rate limit
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  return { standards: body.standards, literature: body.literature, seconds: (Date.now() - t0) / 1000 };
}

function score(q, r) {
  const guides = r.standards;
  const lit = r.literature.slice(0, 4);
  const text = (s) => `${s.title} ${s.abstract ?? ""}`;
  const goldIdx = (s) => q.gold.some((g) => new RegExp(g, "i").test(text(s)));
  const pos = guides.findIndex(goldIdx) + 1;
  const found = q.gold.filter((g) => guides.some((s) => new RegExp(g, "i").test(text(s)))).length;
  const R = q.gold.length ? 0.6 * (pos === 1 ? 1 : pos <= 3 && pos ? 0.7 : pos ? 0.4 : 0) + 0.4 * (found / q.gold.length) : 1 - Math.min(1, guides.length / 6);
  const L = lit.length ? lit.filter((s) => new RegExp(q.lit, "i").test(text(s))).length / lit.length : 0;
  return { R, L, pos, total: Math.round(100 * (0.67 * R + 0.33 * L)) };
}

const jobs = questions.flatMap((q) => LANGS.filter((lang) => q[lang]).map((lang) => ({ q, lang })));
const results = []; let next = 0;
await Promise.all(Array.from({ length: CONC }, async () => {
  while (next < jobs.length) {
    const i = next++, { q, lang } = jobs[i];
    let r; try { r = await search(q, lang, i); } catch (e) { r = { standards: [], literature: [], seconds: null, error: String(e) }; }
    results.push({ id: q.id, lang, question: q[lang], ...score(q, r), seconds: r.seconds, error: r.error,
      top: r.standards.slice(0, 3).map((s) => s.title.slice(0, 70)), lit: r.literature.slice(0, 3).map((s) => s.title.slice(0, 70)) });
    process.stderr.write(".");
  }
}));
console.error();

results.sort((a, b) => a.id.localeCompare(b.id) || a.lang.localeCompare(b.lang));
const f = (x) => (x * 100).toFixed(0).padStart(3);
console.log("id".padEnd(16), "lang  R    L  pos  tot");
for (const r of results) console.log(r.id.padEnd(16), r.lang, " ", f(r.R), f(r.L), String(r.pos || "-").padStart(3), String(r.total).padStart(4), r.error ?? "");
for (const lang of LANGS.filter((l) => results.some((r) => r.lang === l))) {
  const rs = results.filter((r) => r.lang === lang), avg = (k) => (rs.reduce((a, r) => a + r[k], 0) / rs.length);
  console.log(`\n${lang.toUpperCase()}  total ${avg("total").toFixed(0)}   retrieval ${f(avg("R"))}   literature ${f(avg("L"))}`);
}
mkdirSync("evals/results", { recursive: true });
const file = `evals/results/${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
writeFileSync(file, JSON.stringify(results, null, 1));
console.log("→", file);
