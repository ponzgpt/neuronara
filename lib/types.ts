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

// Legacy, used by /api/ask until it is removed.
export type Source = {
  n: number;
  kind: "guideline" | "literature";
  title: string;
  meta: string;
  doi: string | null;
  pmid: string | null;
  url?: string;
  openAccess: boolean;
  abstract: string;
};

// What the page holds while and after asking. `provider` is set once sources arrive; `pending` until the answer event.
export type AskResponse = { answer: string | null; sources: Source[]; note?: string; error?: string; provider?: "anthropic" | "openrouter" | "keyless" | "none"; pending?: boolean };

/** /api/ask streams newline-delimited JSON: sources as soon as retrieval finishes, the answer when it's written. */
export type AskEvent =
  | { type: "sources"; sources: Source[]; provider: "anthropic" | "openrouter" | "keyless" | "none" }
  | { type: "answer"; answer: string | null; note?: string };
