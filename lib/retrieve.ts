// The one retrieval path: /api/search and the server-rendered home page both call retrieve().
// Pure parts (parseParams, numberSources) are unit-tested in retrieve.test.ts; retrieve() adds the live Europe PMC call.
import { literatureAttempts, rankScored, type Entry, type Scored } from "./search.ts";
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

const MAX_STRONG = 6, MAX_RELATED = 12, MIN_SHARE = 0.4, MIN_KEPT = 3;

/** Strong = names at least one non-generic concept of the question and scores >= 40% of the best; if none qualifies, the top 3.
 *  A document that only shares a word like "criteria" is related, not an answer. Strong keeps rank order, capped at 6 (overflow goes to related). */
export function splitStrong(ranked: Scored[]): { strong: Entry[]; related: Entry[] } {
  const top = ranked[0]?.s ?? 0;
  let strong = ranked.filter((x) => x.specific > 0 && x.s >= MIN_SHARE * top);
  if (!strong.length) strong = ranked.slice(0, MIN_KEPT);
  const keep = new Set(strong.slice(0, MAX_STRONG).map((x) => x.e.id));
  return { strong: ranked.filter((x) => keep.has(x.e.id)).map((x) => x.e), related: ranked.filter((x) => !keep.has(x.e.id)).slice(0, MAX_RELATED).map((x) => x.e) };
}

/** Numbers sources the way citations use them: standards first, then papers, 1-based. Related standards are not numbered or cited. */
export function numberSources(entries: Entry[], papers: Omit<Paper, "n">[], region: string, related: Entry[] = []): Pick<SearchResult, "standards" | "related" | "literature"> {
  const tier = (e: Entry) => tierOf(e.societies, region);
  const standards: Standard[] = entries.map((e, i) => ({ ...e, n: i + 1, tier: tier(e) }));
  const literature: Paper[] = papers.map((p, i) => ({ ...p, n: standards.length + i + 1 }));
  return { standards, related: related.map((e) => ({ ...e, tier: tier(e) })), literature };
}

export async function retrieve(library: Entry[], p: { query: string; region: string; modalities: string[] }, withLiterature = true): Promise<SearchResult> {
  const { strong, related } = splitStrong(rankScored(library, p.query, { modalities: p.modalities, ...boostFor(p.region) }));
  // Europe PMC is English and matches literally, so it gets the question's key concepts (translated if needed),
  // strict first, relaxed until something comes back. ponytail: glossary + heuristics; ceiling is questions the glossary doesn't cover.
  let papers: Awaited<ReturnType<typeof searchLiterature>> = [];
  if (withLiterature && p.query) {
    for (const attempt of literatureAttempts(p.query)) {
      papers = await searchLiterature(attempt); // constrained to the field, so ambiguous acronyms stay in neurophysiology
      if (papers.length >= 3) break;
    }
  }
  return { ...p, ...numberSources(strong, papers, p.region, related) };
}
