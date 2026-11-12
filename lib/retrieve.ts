// The one retrieval path: /api/search and the server-rendered home page both call retrieve().
// Pure parts (parseParams, numberSources) are unit-tested in retrieve.test.ts; retrieve() adds the live Europe PMC call.
import { literatureAttempts, rank, type Entry } from "./search.ts";
import { boostFor, MODALITIES, REGIONS, tierOf } from "./catalog.ts";
import { searchLiterature } from "./connectors/europepmc.ts";
import type { Paper, SearchResult, Standard } from "./types.ts";

type Raw = unknown;
const first = (v: Raw) => (Array.isArray(v) ? v[0] : v);

/** Trust boundary: the question and scope reach a prompt (and the user's AI), so accept only known values. */
export function parseParams(q: Raw, region: Raw, modalities: Raw): { query: string; region: string; modalities: string[] } {
  const r = String(first(region) ?? "");
  const m = first(modalities);
  const list = (typeof m === "string" ? m.split(",") : []).map((x) => x.trim());
  return {
    query: String(first(q) ?? "").trim().slice(0, 1000),
    region: Object.hasOwn(REGIONS, r) ? r : "global",
    modalities: MODALITIES.filter((x) => list.includes(x)),
  };
}

/** Numbers sources the way citations use them: standards first, then papers, 1-based. */
export function numberSources(entries: Entry[], papers: Omit<Paper, "n">[], region: string): Pick<SearchResult, "standards" | "literature"> {
  const standards: Standard[] = entries.map((e, i) => ({ ...e, n: i + 1, tier: tierOf(e.societies, region) }));
  const literature: Paper[] = papers.map((p, i) => ({ ...p, n: standards.length + i + 1 }));
  return { standards, literature };
}

export async function retrieve(library: Entry[], p: { query: string; region: string; modalities: string[] }, withLiterature = true): Promise<SearchResult> {
  const entries = rank(library, p.query, { modalities: p.modalities, ...boostFor(p.region) }).slice(0, 6);
  // Europe PMC is English and matches literally, so it gets the question's key concepts (translated if needed),
  // strict first, relaxed until something comes back. ponytail: glossary + heuristics; ceiling is questions the glossary doesn't cover.
  let papers: Awaited<ReturnType<typeof searchLiterature>> = [];
  if (withLiterature && p.query) {
    for (const attempt of literatureAttempts(p.query)) {
      papers = await searchLiterature(attempt); // constrained to the field, so ambiguous acronyms stay in neurophysiology
      if (papers.length >= 3) break;
    }
  }
  return { ...p, ...numberSources(entries, papers, p.region) };
}
