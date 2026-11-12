// node --test lib/   — fails if numbering, tiering or the trust boundary breaks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rank, type Entry } from "./search.ts";
import { numberSources, parseParams } from "./retrieve.ts";

const lib: Entry[] = ["library.json", "national.json"].flatMap((f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8")));

test("sources are numbered standards first, then papers, with tier and entry fields", () => {
  const entries = rank(lib, "Awaji vs Gold Coast").slice(0, 2);
  const paper = { kind: "literature" as const, title: "P", meta: "J 2024", doi: null, pmid: "1", openAccess: true, abstract: "" };
  const { standards, literature } = numberSources(entries, [paper, paper], "global");
  assert.deepEqual(standards.map((s) => s.n), [1, 2]);
  assert.deepEqual(literature.map((p) => p.n), [3, 4]);
  assert.equal(standards[0].title, entries[0].title);
  assert.equal(numberSources(rank(lib, "ACNS terminology", {}).slice(0, 1), [], "us").standards[0].tier, "local");
});

test("parseParams accepts only known regions and modalities", () => {
  const p = parseParams(" x ", "mars", "EEG, nope ,ALS");
  assert.deepEqual(p, { query: "x", region: "global", modalities: ["EEG", "ALS"] });
  assert.equal(parseParams(undefined, "de", undefined).region, "de");
});
