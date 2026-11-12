// node --test lib/   — fails if the prompt drops a source number or the question, or the long-link fallback breaks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPrompt, chatLinks } from "./prompt.ts";
import type { Paper, Standard } from "./types.ts";

const std = (n: number, abstract: string) => ({ n, title: `Standard ${n}`, societies: ["IFCN"], journal: "Clin Neurophysiol", year: 2020, abstract, tier: "international" }) as Standard;
const paper = (n: number): Paper => ({ n, kind: "literature", title: `Paper ${n}`, meta: "J 2024", doi: null, pmid: String(n), openAccess: false, abstract: "x" });
const args = (abstract: string) => ({ question: "Awaji vs Gold Coast", region: "de", modalities: ["ALS"],
  standards: [1, 2, 3, 4, 5, 6].map((n) => std(n, abstract)), literature: [7, 8, 9, 10, 11].map(paper) });

test("prompt cites every source it carries (max 5 standards + 4 papers) and ends with the question", () => {
  const p = buildPrompt(args("short abstract"));
  for (const n of [1, 2, 3, 4, 5, 7, 8, 9, 10]) assert.match(p, new RegExp(`\\[${n}\\] \\(`));
  assert.doesNotMatch(p, /\[6\] \(|\[11\] \(/);
  assert.match(p, /Region: Germany\. Scope: ALS\./);
  assert.ok(p.endsWith("Question: Awaji vs Gold Coast"));
});

test("long abstracts make the link version fall back to titles and the page URL", () => {
  const big = args("a".repeat(2400));
  const url = "https://neuronara.technoir.cloud/?q=x";
  const { claude, chatgpt } = chatLinks(big, url);
  assert.ok(claude.startsWith("https://claude.ai/new?q=") && chatgpt.startsWith("https://chatgpt.com/?q="));
  assert.ok(claude.length < 6100);
  const text = decodeURIComponent(claude.split("?q=")[1]);
  assert.ok(text.includes(url) && text.includes("Awaji vs Gold Coast") && text.includes("[9] (literature) Paper 9"));
  assert.ok(!text.includes("a".repeat(100)));
  assert.ok(decodeURIComponent(chatLinks(args("tiny"), url).claude.split("?q=")[1]).includes("tiny")); // short enough: full prompt
});
