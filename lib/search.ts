import { cognate, detectLang, norm, translate } from "./lang.ts";

// Lexical ranking over the curated library. Shared by the page (instant filtering) and /api/ask (retrieval).
// ponytail: plain token scoring + a jargon synonym table. Fine for a few hundred guidelines;
// swap for embeddings (or Europe PMC's own ranking) once the library is in the thousands.

export type Entry = {
  id: string; title: string; authors: string; journal: string; year: number;
  doi: string | null; pmid: string | null; pmcid: string | null; openAccess: boolean;
  url?: string;          // documents outside journals (society PDFs) link here instead of a DOI
  lang?: "en" | "de" | "es"; // language of the document itself; absent means English
  titleEn?: string;      // English gloss for non-English titles, searched and shown beside the original
  approxYear?: boolean;  // year taken from the file's metadata, not printed in the document
  abstract: string; societies: string[]; modalities: string[]; retired?: boolean;
  keywords?: string;     // curated search terms the document itself uses but its excerpt may not show (LPD, IIC, Salzburg…)
  type: "criteria" | "terminology" | "technical" | "practice";
};

// Field shorthand → the phrases guideline titles actually use. Each phrase is matched as a unit,
// so "fnd" needs "functional neurological disorder", not any title containing "disorder".
const SYNONYMS: Record<string, string[]> = {
  eeg: ["eeg", "electroencephalograph"], cts: ["carpal tunnel"], ncs: ["nerve conduction", "electrodiagnostic"],
  emg: ["electromyograph", "electrodiagnostic"], edx: ["electrodiagnostic"], une: ["ulnar neuropathy"], sfemg: ["single fiber"],
  als: ["als", "amyotrophic lateral sclerosis"], mnd: ["motor neuron", "als"], awaji: ["electrodiagnostic criteria", "awaji"],
  gold: ["new diagnostic criteria for als", "gold coast"], coast: [],
  cidp: ["chronic inflammatory demyelinating"], gbs: ["guillain"], mmn: ["multifocal motor neuropathy"], dsp: ["distal symmetric polyneuropathy"],
  ceeg: ["continuous eeg"], icu: ["critical care", "critically ill"], ncse: ["nonconvulsive status epilepticus"], se: ["status epilepticus"],
  lpd: ["periodic discharges", "critical care eeg terminology"], gpd: ["periodic discharges", "critical care eeg terminology"],
  lrda: ["rhythmic delta", "critical care eeg terminology"], iiic: ["ictal interictal", "critical care eeg terminology"],
  ied: ["interictal epileptiform"], score: ["organized reporting"],
  // EMG/NCS and clinical neurophysiology shorthand. Plain acronyms are ambiguous in PubMed (MGA is also microglandular adenosis),
  // so each one expands to the phrase a neurophysiologist means.
  mga: ["martin gruber anastomosis"], rca: ["riche cannieu anastomosis"], cmap: ["compound muscle action potential"],
  snap: ["sensory nerve action potential"], muap: ["motor unit action potential"], mune: ["motor unit number estimation"],
  rns: ["repetitive nerve stimulation"], sncv: ["sensory nerve conduction"], mncv: ["motor nerve conduction"], ncv: ["nerve conduction velocity"],
  tos: ["thoracic outlet syndrome"], cmt: ["charcot marie tooth"], hnpp: ["hereditary neuropathy with liability to pressure palsies"],
  aidp: ["acute inflammatory demyelinating polyneuropathy", "guillain"], aman: ["acute motor axonal neuropathy"],
  mg: ["myasthenia gravis"], lems: ["lambert eaton myasthenic syndrome"], sma: ["spinal muscular atrophy"],
  hreflex: ["h reflex"], abr: ["auditory brainstem response"],
  rbd: ["rem sleep behavior disorder"], csa: ["central sleep apnea"], nrem: ["non rem sleep"], rem: ["rem sleep"],
  emu: ["epilepsy monitoring unit"], sudep: ["sudden unexpected death in epilepsy"], nead: ["non epileptic attack disorder"],
  pdr: ["posterior dominant rhythm"], firda: ["frontal intermittent rhythmic delta activity"], tirda: ["temporal intermittent rhythmic delta activity"],
  sreda: ["subclinical rhythmic electrographic discharges"], bets: ["benign epilepsy with centrotemporal spikes"],
  jme: ["juvenile myoclonic epilepsy"], ige: ["idiopathic generalized epilepsy"],
  fnd: ["functional neurological disorder"], pnes: ["nonepileptic", "functional seizures"],
  psg: ["polysomnograph", "sleep"], osa: ["obstructive sleep apnea"], mslt: ["multiple sleep latency"], mwt: ["maintenance of wakefulness"],
  rls: ["restless legs"], plm: ["periodic limb movement"],
  ep: ["evoked potential"], sep: ["somatosensory evoked"], ssep: ["somatosensory evoked"], vep: ["visual evoked"],
  baep: ["auditory brainstem"], mep: ["motor evoked"], ionm: ["intraoperative"],
  tms: ["transcranial magnetic"], rtms: ["repetitive transcranial magnetic"], meg: ["magnetoencephalograph"],
  dnc: ["brain death", "neurologic criteria"], nmus: ["neuromuscular ultrasound"],
  placement: ["placement", "position"], montage: ["montage", "montages"],
  hypopnea: ["hypopnea", "respiratory events"], hypopnoea: ["hypopnea", "respiratory events"], salzburg: ["nonconvulsive status epilepticus"],
};

const STOP = new Set(("the of and for in on a an to with by what is are how which when does do vs versus or i we should can there my your it be " +
  // Spanish and German function words, accent-stripped
  "de del la las el los un una unos unas que cual cuales como para por con sin es son se debo debe puede pueden hay existe alguna algun entre cuando donde si y al lo mas muy tiene tienen segun utilizo uso " +
  "der die das und ist sind fur fuer mit ein eine wie welche bei von zur zum nicht oder sollte " +
  // words of the question, not of the topic ("how should I structure an EEG report" is not about crystal structure)
  "difference differences distinguish structure guidance written interpret findings apply applies use used using define defined regarding update updated " +
  "spain uk germany japan china usa recommended recommend need needed tell useful beyond precautions exist exists any also other others recommends recomienda recomiendan existen recomendaciones recomendacion guia guias documento documentos ").split(" "));

// Words that appear in almost every guideline title (including the two commonest modalities, which the chips scope anyway).
// They refine a match but can't make one on their own:
// "fnd criteria" must not return brain-death criteria just because both say "criteria".
const DISCOURSE = new Set(("criteria criterion standard standards guideline guidelines recommendations recommended diagnosis " +
  "diagnostic protocol classification definition minimum technical requirements update consensus statement practice clinical").split(" "));
const MODALITY = new Set("eeg electroencephalograph electromyograph electrodiagnostic".split(" "));
const GENERIC = new Set([...DISCOURSE, ...MODALITY]);

/** Query → match units: words, phrases from the shorthand table, and English phrases translated from Spanish/German.
 *  Shorthand and translations are usually the subject of the question ("CIDP criteria"), so they weigh double. */
export type Unit = { text: string; weight: number; english: boolean; group: string }; // units in one group are alternatives
// English vocabulary of the library, for cognate matching. Set by the first rank() call (server and browser alike).
let VOCAB: string[] = [];
const setVocabulary = (entries: Entry[]) => {
  if (VOCAB.length) return;
  const count = new Map<string, number>();
  for (const e of entries.filter((x) => !x.lang || x.lang === "en"))
    for (const w of norm(`${e.title} ${e.keywords ?? ""} ${e.abstract}`).split(/[^a-z]+/)) if (w.length >= 6) count.set(w, (count.get(w) ?? 0) + 1);
  VOCAB = [...count].filter(([, n]) => n >= 1).map(([w]) => w);
};

export function units(q: string): Unit[] {
  const t = norm(q);
  const raw = t.replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w) && !/^\d+$/.test(w));
  const acronyms = new Set((q.match(/\b[A-Z][A-Za-z]*[A-Z]\b/g) ?? []).map(norm)); // "ILAE", "EEG": international in any language
  const seen = new Map<string, Unit>();
  const add = (text: string, weight: number, english: boolean, group: string) => {
    const u = seen.get(text);
    if (!u || u.weight < weight) seen.set(text, { text, weight, english, group });
  };
  const lang = detectLang(q);
  // Capitalised words in the middle of a sentence are names ("World Brain Death Project"): international, whatever the language.
  for (const m of q.replace(/^\W+/, "").split(/(?<=[.?!¿¡:])\s*/)[0].matchAll(/(?<=\S\s)[A-ZÁÉÍÓÚ][\wáéíóúñ-]{2,}/g)) for (const part of norm(m[0]).split("-")) acronyms.add(part); // "Martin-Gruber" → martin, gruber
  for (const w of raw) {
    // "LPDs", "hypopneas": try the plural-stripped shorthand too
    const sh = SYNONYMS[w] ?? (w.endsWith("s") ? SYNONYMS[w.slice(0, -1)] : undefined);
    if (sh) for (const u of sh) add(u, isGeneric(u) ? 0.6 : 2, true, w);
    else {
      const twin = lang !== "en" && !acronyms.has(w) ? cognate(w, VOCAB) : null; // "magnetoencefalografia" → "magnetoencephalography"
      if (twin) add(twin, 1.2, true, w);
      // Latin/Greek medical endings are the same word in English ("anastomosis", "polyneuropathy"), whatever the language around them
      const medical = /(osis|itis|oma|emia|pathy|plasia|ectomy|otomy|graphy|algia)$/.test(w) && w.length >= 7;
      add(w, 0.6, lang === "en" || acronyms.has(w) || medical, w); // plain words weigh less than shorthand; in a Spanish/German question they are not English unless an acronym
    }
  }
  for (const g of translate(q)) for (const u of g) add(u, isGeneric(u) ? 0.6 : 2, true, g[0]);
  return [...seen.values()];
}

export const tokens = (q: string): string[] => units(q).map((u) => u.text);

// Only single words are generic by list; a phrase ("electrodiagnostic criteria") can be specific even when its words are common. Frequency decides.
const isGeneric = (unit: string) => !unit.includes(" ") && GENERIC.has(unit);
const isDiscourse = (unit: string) => !unit.includes(" ") && DISCOURSE.has(unit);

// Crude English stemming so "grade" meets "grading" and "criterion" meets "criteria"; word-prefix match keeps "als" out of "potentials".
const stem = (w: string) => {
  if (/^criteri/.test(w)) return "criteri";
  const r = w.length > 5 ? w.replace(/(ing|ed|es|s|e)$/, "") : w.length > 4 ? w.replace(/(s|e)$/, "") : w;
  return r.length > 4 ? r.replace(/[yi]$/, "") : r; // neuropathy / neuropathies / neuropathic share a root
};
const matcher = (unit: string) => new RegExp("\\b" + unit.split(" ").map((w) => stem(w) + "\\w*").join("\\W+(?:\\w+\\W+){0,2}"), "i");

// Documents are matched on accent-stripped text; computed once per entry.
const cache = new Map<string, { title: string; tags: string; abstract: string }>();
const textOf = (e: Entry) => {
  let c = cache.get(e.id);
  if (!c) cache.set(e.id, (c = { title: norm(`${e.title} ${e.titleEn ?? ""}`), tags: norm([...e.modalities, ...e.societies, e.keywords ?? ""].join(" ")), abstract: norm(e.abstract) }));
  return c;
};

export type Scored = { e: Entry; s: number; specific: number }; // specific = how many non-generic concepts of the question the entry names

export const rank = (entries: Entry[], q: string, opts: RankOpts = {}): Entry[] => rankScored(entries, q, opts).map((x) => x.e);

type RankOpts = { modalities?: string[]; boostSocieties?: string[]; localSocieties?: string[] };

/** Same ordering as rank(), with the score and the number of non-generic concepts matched, so callers can cut off weak matches. */
export function rankScored(entries: Entry[], q: string, opts: RankOpts = {}): Scored[] {
  setVocabulary(entries);
  const mods = opts.modalities ?? [];
  const pool = mods.length ? entries.filter((e) => e.modalities.some((m) => mods.includes(m))) : entries;
  // A word found in over a quarter of the library ("nerve", "conduction") can't identify a document: treat it as generic too.
  const df = (re: RegExp) => pool.filter((e) => { const t = textOf(e); return re.test(t.title) || re.test(t.abstract); }).length / Math.max(1, pool.length);
  const us = units(q).map((u) => { const re = matcher(u.text); return { re, english: u.english, generic: isGeneric(u.text) || (pool.length >= 20 && df(re) > 0.25), weight: u.weight, group: u.group }; });
  const boost = new Set(opts.boostSocieties ?? []);
  const local = new Set(opts.localSocieties ?? []);
  if (!us.length) return [...pool].sort((a, b) => b.year - a.year).map((e) => ({ e, s: 0, specific: 0 }));
  const specificCount = new Set(us.filter((u) => !u.generic).map((u) => u.group)).size;
  // A group is "unknown" only if none of its English alternatives appears anywhere in the library ("sedation", "MRI").
  // Untranslated Spanish/German words don't count: they're unknown to us, not evidence the library lacks the topic.
  const groupHit = new Map<string, boolean>();
  for (const u of us.filter((u) => !u.generic && u.english)) groupHit.set(u.group, groupHit.get(u.group) || pool.some((e) => { const t = textOf(e); return u.re.test(t.title) || u.re.test(t.abstract); }));
  const unknown = [...groupHit.values()].filter((hit) => !hit).length;
  const needsSpecific = specificCount > 0;
  return pool
    .map((e) => {
      const { title, tags, abstract } = textOf(e);
      let s = 0, covered = 0, strong = false, strongHigh = false;
      const coveredGroups = new Map<string, number>(); // a group's alternatives (LPD → "periodic discharges" / "critical care eeg terminology") count once
      for (const u of us) {
        const inTitle = u.re.test(title) || u.re.test(tags);
        const hit = (u.re.test(title) ? 3 : 0) + (u.re.test(tags) ? 2 : 0) + (u.re.test(abstract) ? 1 : 0);
        if (hit && !u.generic) { coveredGroups.set(u.group, Math.max(coveredGroups.get(u.group) ?? 0, u.weight)); if (inTitle) { strong = true; if (u.weight >= 2) strongHigh = true; } }
        s += hit * (u.generic ? 0.25 : u.weight);
      }
      covered = [...coveredGroups.values()].reduce((a, b) => a + b, 0);
      const distinct = coveredGroups.size;
      if (needsSpecific && !covered) return { e, s: 0, specific: 0 };
      // Relevance floor: a document earns its place by naming a concept in its title or tags, or by covering several of the
      // question's concepts in its text. One stray word in an abstract is how "median nerve values" used to return six unrelated guidelines.
      if (needsSpecific && !strong && distinct < Math.min(3, specificCount)) return { e, s: 0, specific: 0 };
      // A long question names several concepts. A document covering under half of them isn't an answer, it's a neighbour
      // ("normal values for median nerve conduction" must not return every nerve guideline). Shorthand hit in a title always stays.
      if (needsSpecific && !strongHigh && specificCount >= 4 && distinct < Math.ceil(specificCount / 2)) return { e, s: 0, specific: 0 };
      // Words nobody in the library uses ("sedation", "MRI") are the question's real subject; a neighbour covering only the rest is noise.
      if (needsSpecific && !strongHigh && distinct <= unknown) return { e, s: 0, specific: 0 };
      s += 10 * covered; // covering more of the question's concepts beats repeating one of them
      // A document from the user's own societies is worth reading first; international bodies get a smaller nudge.
      // Capped by the base score, so a region can reorder good matches but can't lift a weak one over a strong one.
      if (e.societies.some((x) => local.has(x))) s += Math.min(4, s * 0.4);
      else if (e.societies.some((x) => boost.has(x))) s += Math.min(1.5, s * 0.15);
      if (e.retired) s *= 0.5;
      return { e, s, specific: distinct };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.e.year - a.e.year);
}

/** Europe PMC query attempts, strict to relaxed. Each attempt is groups of alternatives: (a OR b) AND (c OR d).
 *  Only English units go: a Spanish question reaches Europe PMC as its glossary translation. The modality (EEG, EMG) stays as
 *  context; words like "criteria" or "standards" do not, since they'd match half of PubMed. */
export function literatureAttempts(q: string): string[][][] {
  const groups = new Map<string, Unit[]>();
  for (const u of units(q).filter((u) => u.english && !isDiscourse(u.text))) groups.set(u.group, [...(groups.get(u.group) ?? []), u]);
  const all = [...groups.values()];
  const rank = (g: Unit[]) => (g.some((u) => !isGeneric(u.text)) ? 10 : 0) + Math.max(...g.map((u) => u.weight)) * 2 + Math.min(...g.map((u) => u.text.length)) / 100;
  // A group whose words all sit inside another group's phrase adds nothing ("nerve" inside "nerve conduction").
  const redundant = (g: Unit[]) => all.some((o) => o !== g && g.every((u) => o.some((v) => v.text !== u.text && v.text.split(" ").includes(u.text))));
  const pool = all.filter((g) => !redundant(g)).sort((a, b) => rank(b) - rank(a));
  const text = (g: Unit[]) => g.map((u) => u.text);
  const and = (n: number) => pool.slice(0, n).map(text);
  const attempts = [and(5), and(3), and(2), [pool.slice(0, 3).flatMap(text)]].filter((a) => a[0]?.length);
  return attempts.filter((a, i) => i === 0 || JSON.stringify(a) !== JSON.stringify(attempts[i - 1]));
}
