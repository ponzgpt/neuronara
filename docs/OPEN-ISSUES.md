# Open issues

## 0. Most urgent: the live site has no LLM key (found 2026-11-10, 21:08)

**Closed 2026-11-12:** the server-side LLM was removed, so there is no key to set. Historical notes below.

- **Seen:** `/api/ask` on neuronara.technoir.cloud reports `"provider":"keyless"`. Because of issue 2 (one free reply every 45 s per IP, shared by every visitor), most questions get "The answer service is busy right now". In a run of 10 questions (heldout5), 8 got no answer.
- **Fix (Javier only, it's a secret):** `./scripts/set-llm-key.sh openrouter` with an OpenRouter key. The free models in `FREE_MODELS` keep it at $0, and `/api/ask` is already rate-limited per IP (20 per 10 min). The service restarts on its own.
- **Free model list updated on `main` (959dc89):** OpenRouter has removed 2 of the 3 default free models (deepseek-v4-flash-0731, qwen3.8-27b). The new list is gemma-4-31b, nemotron-3.5-super-vl and gemma-4-26b-a4b. **Not deployed yet**, because the deploy's link check stopped it (next point).
- **Deploy is blocked by the link check:** aasm.org and its Scoring Manual page now sit behind a Cloudflare bot check (403), so `verify:links` needs a manual verification. Open https://aasm.org and https://aasm.org/clinical-resources/scoring-manual/ in your browser, confirm both are the right pages, then add `AASM: "2026-11-1x", "aasm-manual": "2026-11-1x"` to `VERIFIED_BY_HAND` in `lib/catalog.ts`, commit, and `./scripts/deploy.sh`.
- **Order:** verify AASM, deploy, set the key, then re-run `SET=heldout5 BASE=https://neuronara.technoir.cloud npm run eval` to get a fair first-look score with a key.


Found 2026-11-10 while checking the live site. Each one waits for Javier, and for a clinician's read of any answer it changes.

## 1. "What are the Awaji criteria?" gets a non-answer

**Closed 2026-11-12:** no written answers exist any more; the ranked standards (Awaji paper first) are the result. Historical notes below.

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

**Closed 2026-11-12:** the keyless fallback was removed together with the LLM. Historical notes below.

- **Seen:** with no API key, every answer request to the keyless provider (text.pollinations.ai) came back **402 Payment Required**, so no answer was written. A plain GET to the same host still returns 200, so their API for this kind of request seems to have changed.
- **Why it matters:** non-negotiable 2 in AGENTS.md ("Answers must work with no LLM key").
- **Exact cause (reproduced):** `402 FREE_LIMIT`, "1 reply every 45 seconds per IP". On the server every visitor shares that one IP, so keyless allows about one answer per 45 s for the whole site. `lib/llm.ts` retries on 429 but not on 402.
- **Clearer message ready, not deployed:** local branch `fix/keyless-limit-message`. On `FREE_LIMIT` the page says "Free written answers are limited to one every 45 seconds for this site. Try again in about N s" instead of "busy". It's tested (`lib/limits.test.ts`) and checked end to end locally. Only worth shipping if you keep running keyless.
- **Next:** check Pollinations' current terms. Either switch to another free tier or accept "sources only" when there's no key, and update the rule to match.
