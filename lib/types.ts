// Wire types shared by /api/search and the page.
import type { Entry } from "./search.ts";
import type { Tier } from "./catalog.ts";

/** A curated standard: the ranker's entry (title, societies, year, retired, type, doi, pmid, url, openAccess, abstract…) plus how it is numbered and tiered. */
export type Standard = Entry & { n: number; tier: Tier };

/** A paper from live literature search. */
export type Paper = {
  n: number;
  kind: "literature";
  title: string;
  meta: string;
  doi: string | null;
  pmid: string | null;
  openAccess: boolean;
  abstract: string;
};

export type SearchResult = { query: string; region: string; modalities: string[]; standards: Standard[]; literature: Paper[] };
