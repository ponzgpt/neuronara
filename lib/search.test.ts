// node --test lib/   — fails if jargon expansion, modality scoping or ranking breaks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rank, type Entry } from "./search.ts";

const read = (f: string): Entry[] => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8"));
const lib: Entry[] = [...read("library.json"), ...read("national.json")];

test("every entry is citable", () => {
  for (const e of lib) assert.ok(e.doi || e.pmid || e.url, `no DOI, PMID or URL: ${e.title}`);
});

test("jargon resolves to the right guideline", () => {
  assert.match(rank(lib, "CTS NCS")[0].title, /carpal tunnel/i);
  assert.match(rank(lib, "LPD LRDA terminology")[0].title, /Critical Care EEG Terminology/i);
  assert.match(rank(lib, "MSLT")[0].title, /multiple sleep latency/i);
});

test("modality scope hides everything else", () => {
  const r = rank(lib, "", { modalities: ["PSG/Sleep"] });
  assert.ok(r.length > 0 && r.every((e) => e.modalities.includes("PSG/Sleep")));
});

test("retired guidance ranks below current guidance on the same topic", () => {
  const r = rank(lib, "carpal tunnel");
  assert.ok(!r[0].retired);
});

test("no errata or letters slipped into the library", () => {
  for (const e of lib) assert.doesNotMatch(e.title, /\b(erratum|corrigendum)\b|^(response|reply|comment)/i, e.title);
});

test("criteria questions find the criteria papers", () => {
  const top = rank(lib, "Awaji vs Gold Coast").slice(0, 2).map((e) => e.title).join(" | ");
  assert.match(top, /criteria for diagnosis of ALS/);
  assert.match(top, /new diagnostic criteria for ALS/);
  assert.match(rank(lib, "EEG minimum standards", {})[0].title, /minimum/i);
});

test("generic words alone never make a match", () => {
  assert.equal(rank(lib, "fnd criteria").length, 0);
  assert.ok(rank(lib, "criteria").length > 0); // but a purely generic query still browses
});

test("every rotating example finds a document", async () => {
  const { EXAMPLES } = await import("./catalog.ts");
  for (const ex of EXAMPLES) assert.ok(rank(lib, ex).length > 0, `no match for example "${ex}"`);
});

test("every entry has a document type", () => {
  for (const e of lib) assert.ok(["criteria", "terminology", "technical", "practice"].includes(e.type), e.title);
});

test("the document covering more of the question wins", () => {
  assert.match(rank(lib, "CIDP electrodiagnostic criteria")[0].title, /chronic inflammatory demyelinating/i);
});

test("region tiers: own societies local, IFCN international, others other", async () => {
  const { tierOf, missingLocal } = await import("./catalog.ts");
  assert.equal(tierOf(["ACNS"], "us"), "local");
  assert.equal(tierOf(["IFCN"], "us"), "international");
  assert.equal(tierOf(["ACNS"], "uk"), "other");
  assert.deepEqual(missingLocal("uk", lib), []);      // BSCN/ANS documents are in the library
  assert.deepEqual(missingLocal("jp", lib), ["JSCN"]); // flips the day a JSCN document is added
});

test("national documents are found by English queries and rank first in their region", async () => {
  const { boostFor } = await import("./catalog.ts");
  const q = (text: string, region: string) => rank(lib, text, boostFor(region))[0];
  assert.match(q("EEG montages", "de").id, /^de-montages$/);          // German document, English query
  assert.match(q("photic stimulation", "uk").id, /^uk-photic$/);
  assert.match(q("intraoperative monitoring spine surgery", "es").id, /^es-geer$/);
  assert.match(q("brain death", "de").id, /^de-braindeath$/);          // DGKN over WFN for a German clinician
});

test("national documents are verifiable and honest about their year", () => {
  for (const e of lib.filter((x) => x.url)) {
    assert.match(e.url!, /^https?:\/\//);
    assert.ok(e.abstract.length >= 200, `${e.id} has no extracted text`);
    assert.ok(e.year >= 2010 && e.year <= new Date().getFullYear(), `${e.id} year`);
  }
});

test("language detection and glossary", async () => {
  const { detectLang, translate, cognate } = await import("./lang.ts");
  assert.equal(detectLang("¿Cómo se gradúa el túnel carpiano?"), "es");
  assert.equal(detectLang("Wie sollen EEG-Ableitungen bei Kindern durchgeführt werden?"), "de");
  assert.equal(detectLang("Awaji vs Gold Coast"), "en");
  assert.equal(detectLang("magnetoencefalografía clínica recomendaciones"), "es"); // keywords only: accents and endings decide
  assert.equal(detectLang("electroencephalography recommendations"), "en");         // English "-graphy" is not Spanish "-grafía"
  assert.equal(detectLang("How should I grade carpal tunnel severity?"), "en");
  assert.deepEqual(translate("How do I grade carpal tunnel?"), []);              // English input is never "translated"
  assert.ok(translate("túnel carpiano").flat().includes("carpal tunnel"));        // accents optional
  assert.ok(translate("tunel carpiano").flat().includes("carpal tunnel"));
  const vocab = ["magnetoencephalography", "demyelinating", "standardized", "electroencephalography"];
  assert.equal(cognate("magnetoencefalografía", vocab), "magnetoencephalography"); // Latin/Greek cognates need no glossary entry
  assert.equal(cognate("desmielinizante", vocab), "demyelinating");
  assert.equal(cognate("estandarizado", vocab), "standardized");
  assert.equal(cognate("piernas", vocab), null);                                  // short or unrelated words are left alone
});

test("Spanish and English questions reach the same document", () => {
  const first = (q: string) => rank(lib, q)[0]?.title ?? "";
  const pairs: [string, string, RegExp][] = [
    ["How should I grade carpal tunnel severity?", "¿Cómo se gradúa la gravedad del túnel carpiano?", /Grading the Severity of Carpal Tunnel/],
    ["hypopnea scoring 3% or 4%", "¿Cómo puntúo las hipopneas al 3% o 4%?", /respiratory events/],
    ["multiple sleep latency test criteria", "criterios del test de latencia múltiple del sueño", /multiple sleep latency/],
    ["status epilepticus definition ILAE", "definición de estatus epiléptico según la ILAE", /status epilepticus/],
    ["magnetoencephalography guidelines", "recomendaciones para la magnetoencefalografía", /magnetoencephalography/],
    ["magnetoencephalography guidelines", "magnetoencefalografía clínica recomendaciones", /magnetoencephalography/],
  ];
  assert.doesNotMatch(rank(lib, "magnetoencefalografía clínica recomendaciones").slice(0, 3).map((e) => e.title).join("|"), /SENFC|consentimiento/); // "recomendaciones" is filler, not a topic
  for (const [en, es, re] of pairs) { assert.match(first(en), re, en); assert.match(first(es), re, es); }
});

test("questions the library can't answer return nothing instead of neighbours", () => {
  assert.equal(rank(lib, "What is the recommended insulin regimen for type 2 diabetes?").length, 0);
  assert.equal(rank(lib, "¿Qué papel tiene el EEG en el diagnóstico de la enfermedad de Alzheimer?").length, 0);
});

test("literature queries carry English concepts only, never the question's filler", async () => {
  const { literatureAttempts } = await import("./search.ts");
  const flat = (q: string) => literatureAttempts(q)[0].flat().join(" ");
  assert.doesNotMatch(flat("How should I structure an EEG report?"), /structure|should/);
  assert.match(flat("¿Cuál es la clasificación de las epilepsias de la ILAE?"), /epilepsy/);
  assert.doesNotMatch(flat("¿Cuál es la clasificación de las epilepsias de la ILAE?"), /clasificaci|epilepsias/); // no Spanish leaks to Europe PMC
});

test("ambiguous field acronyms expand to the neurophysiology meaning and are fenced to the field", async () => {
  const { literatureAttempts } = await import("./search.ts");
  const { buildQuery } = await import("./connectors/europepmc.ts");
  const attempts = literatureAttempts("MGA");
  assert.deepEqual(attempts[0], [["martin gruber anastomosis"]]);             // never the bare acronym
  const q = buildQuery(attempts[0]);
  assert.match(q, /"martin gruber anastomosis"/);
  assert.match(q, /TITLE_ABS:\(nerve OR neuro\*/);                              // field fence: breast pathology can't match
  assert.doesNotMatch(buildQuery(attempts[0], false), /neuro\*/);               // and it can be switched off
  for (const [acr, phrase] of [["CMAP", "compound muscle action potential"], ["RNS", "repetitive nerve stimulation"], ["MUNE", "motor unit number estimation"]])
    assert.deepEqual(literatureAttempts(`${acr} normal values`)[0][0], [phrase]);
  assert.equal(rank(lib, "MGA").length, 0);                                     // the library has no document on it: say so
});

test("a Spanish sentence about a named anatomical variant reaches Europe PMC with its English terms", async () => {
  const { literatureAttempts } = await import("./search.ts");
  const q = "¿Qué es la anastomosis de Martin-Gruber y cómo afecta a la neurografía del nervio mediano?";
  const first = literatureAttempts(q)[0].flat().join(" ");
  assert.match(first, /anastomosis/);
  assert.match(first, /martin/);
  assert.match(first, /gruber/);
  assert.match(first, /median nerve|nerve conduction/);
  assert.doesNotMatch(first, /neurograf|nervio|afecta/);   // no Spanish leaks through
});

test("every society link has an identity check, and no link is added from memory", async () => {
  const { SOCIETY_SITES, SITE_IDENTITY, CONNECTORS, REGIONS } = await import("./catalog.ts");
  for (const k of Object.keys(SOCIETY_SITES)) assert.ok(SITE_IDENTITY[k], `${k} has a URL but no identity regex: run npm run verify:links`);
  for (const k of Object.keys(SITE_IDENTITY)) assert.ok(SOCIETY_SITES[k], `${k} has an identity but no URL`);
  for (const c of CONNECTORS.filter((x) => x.url)) assert.ok(c.identity, `${c.id} has a URL but no identity regex`);
  // Never a securities/finance/casino identity by accident.
  for (const [k, url] of Object.entries(SOCIETY_SITES)) assert.doesNotMatch(url, /isin\.org|senfc\.org/, `${k}: known wrong domain`);
  // Every society a region promotes should be reachable, or be listed here on purpose as having no site yet.
  const noSite = new Set(["WFSICCM", "EFNS", "CNS", "SCCM", "AAP"]);
  for (const r of Object.values(REGIONS)) for (const s of r.societies) assert.ok(SOCIETY_SITES[s] || noSite.has(s), `${s} is in a region but has no verified site`);
});
