// Europe PMC: open REST API covering MEDLINE/PubMed + PMC. No key needed.
// https://europepmc.org/RestfulWebService
import type { Paper } from "@/lib/types";

const API = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";

const clean = (t: string) => t.replace(/[():"]/g, " ").trim();

const term = (u: string) => (u.includes(" ") ? `"${clean(u)}"` : clean(u));

/** `q` is a sentence, or groups of alternatives that must each appear: [["als","amyotrophic lateral sclerosis"],["criteria"]]
 *  becomes (als OR "amyotrophic lateral sclerosis") AND criteria. */
// Everything asked here belongs to clinical neurophysiology. Requiring one of these words stops an ambiguous acronym
// ("MGA" = Martin-Gruber anastomosis here, microglandular adenosis in breast pathology) from pulling in other specialties.
const FIELD = '(nerve OR neuro* OR EEG OR EMG OR electromyograph* OR electroencephalograph* OR electrodiagnos* OR electrophysiolog* OR "evoked potential*" OR epilep* OR seizure* OR polysomnograph* OR sleep OR "brain death" OR "motor unit" OR myopath* OR "transcranial magnetic" OR intraoperative)';

export function buildQuery(q: string | string[][], fieldFilter = true): string {
  const terms = Array.isArray(q) ? q.map((g) => (g.length > 1 ? `(${g.map(term).join(" OR ")})` : term(g[0]))).join(" AND ") : clean(q);
  // Title+abstract only: whole-text matching on PMC articles drags in unrelated papers.
  return `TITLE_ABS:(${terms})${fieldFilter ? ` AND TITLE_ABS:${FIELD}` : ""} AND HAS_ABSTRACT:y AND (SRC:MED OR SRC:PMC)`;
}

export async function searchLiterature(q: string | string[][], size = 6, fieldFilter = true): Promise<Omit<Paper, "n">[]> {
  const query = buildQuery(q, fieldFilter);
  try {
    const res = await fetch(`${API}?format=json&resultType=core&pageSize=${size}&query=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(6000),
    });
    const hits: any[] = (await res.json()).resultList?.result ?? [];
    return hits.map((h) => ({
      kind: "literature",
      title: h.title,
      meta: `${h.journalInfo?.journal?.isoabbreviation ?? ""} ${h.pubYear}`.trim(),
      doi: h.doi ?? null,
      pmid: h.pmid ?? null,
      openAccess: h.isOpenAccess === "Y",
      abstract: String(h.abstractText ?? "").replace(/<[^>]+>/g, "").slice(0, 1500),
    }));
  } catch {
    return []; // Down or slow: the caller answers from the curated library alone.
  }
}
