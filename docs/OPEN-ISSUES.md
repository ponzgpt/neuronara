# Open issues

Found 2026-11-10 while checking the live site. Each one waits for Javier, and for a clinician's read of any answer it changes.

## 1. "What are the Awaji criteria?" gets a non-answer

- **Seen:** the 2008 IFCN paper (*Electrodiagnostic criteria for diagnosis of ALS*, which is the Awaji consensus) ranks first among the standards. Even so, the answer said the criteria's "specific content is not provided in the excerpts" and cited only two literature abstracts.
- **Cause:** the model sees each standard's title and abstract. That abstract describes the Awaji rules (fasciculation potentials count as denervation; EMG findings are equivalent to clinical signs) but never uses the word "Awaji", which lives only in the curated `keywords`.
- **Fix ready, not deployed:** branch `fix/standard-aliases-in-context` (local, not pushed). The model context gets an "Also known by: …" line from `keywords`, and the citation-grounding check sees the same names.
- **Measured 2026-11-10 (local, keyless gpt-oss-20b, requests spaced 50 s apart):**

  | | EN | ES |
  |---|---|---|
  | `main` | 80 (answer 100, literature 0 from a Europe PMC flake) | 85 (answer 63) |
  | fix branch | 100 (answer 100) | 100 (answer 100) |
  | live site before the fix | 85 (answer 63) | 60 (no answer) |

  With the fix, the Spanish answer now states the Awaji rules from source [1]: fasciculation potentials count like fibrillations and positive sharp waves, EMG evidence of chronic neurogenic change counts like clinical signs, and "Probable Laboratory-Supported" becomes obsolete. It drops the qualifier "in the context of a suspected clinical diagnosis of ALS", which a clinician should check. Since heldout4 has now been tuned against, the next measurement needs a heldout5.

## 2. The keyless fallback is failing

- **Seen:** with no API key, every answer request to the keyless provider (text.pollinations.ai) came back **402 Payment Required**, so no answer was written. A plain GET to the same host still returns 200, so their API for this kind of request seems to have changed.
- **Why it matters:** non-negotiable 2 in AGENTS.md ("Answers must work with no LLM key").
- **Exact cause (reproduced):** `402 FREE_LIMIT`, "1 reply every 45 seconds per IP". On the server every visitor shares that one IP, so keyless allows about one answer per 45 s for the whole site. `lib/llm.ts` retries on 429 but not on 402.
- **Next:** check Pollinations' current terms. Either switch to another free tier or accept "sources only" when there's no key, and update the rule to match.
