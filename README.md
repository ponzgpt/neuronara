# Neuronara

**Every standard in your field, one question away.** Neuronara helps clinical neurophysiologists find their way through the standards, criteria, terminology and protocols of EEG, EMG/NCS, evoked potentials, sleep and IONM.

**Live:** https://neuronara.technoir.cloud

> **Not clinical advice.** Neuronara points to published guidance and literature and writes an AI summary that cites
> it. Always read the source before acting on anything, and never enter patient identifiers.

Awaji or Gold Coast? ACNS terminology from 2012 or 2021? Whose minimum EEG standard applies? The answers are scattered across societies, journals and decades. Neuronara searches a curated library of society guidance (IFCN, ACNS, AANEM, ILAE, AASM, EAN/PNS, ISIN…) and the open literature (Europe PMC, which includes MEDLINE/PubMed). It says which standard applies, where they differ and where each comes from, and ends with a one-line bottom line. Reports, protocols, audits and teaching are the downstream uses.

## Why it exists

I built Neuronara for my partner, a clinical neurophysiologist. Her day involves questions like the ones above. The
answer is usually in a society document she knows exists but has to dig out, often in a different country's version.
She is its first user, and the tool is in a **feedback loop** with her:

1. She asks it real questions from her work.
2. Every miss gets written down: a wrong or missing document, a dead link, an acronym read with another specialty's
   meaning, an answer claiming more than its source says.
3. The miss becomes a fix in code or data, plus a question in the evaluation set (`evals/`), so it stays fixed.
4. New evaluation questions are written after each round of tuning and scored once before anything is changed. The
   score reported is that first look, not the best score after tuning (see [Languages and how well it works](#languages-and-how-well-it-works)).

It is a working tool for one clinician, not a product with customers. [docs/POSITIONING.md](docs/POSITIONING.md)
covers what it would take to grow beyond that.

## Status

| | |
|---|---|
| Users | One clinical neurophysiologist, plus anyone who finds the live site |
| Stage | Feedback loop with its first user; library and answer checks improve each round |
| Measured | Retrieval and literature quality, per language, on held-out question sets (`npm run eval`) |
| Not yet measured | Clinical correctness of the written answers: that needs a clinician to read them |
| Authorship | Vibe-coded: specified and tested by me (Javier Ponz), written by AI coding agents. Every link and source is checked against the real page by `npm run verify:links` |

## How this was made

I'm a vibe coder. I decide what to build, write the spec and the rules it has to follow, and test the result until it
does what I said. AI coding agents write the code; I don't write code by hand. Commits under my name were made by an
agent working for me.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # ranking, scoping and library-integrity checks
npm run verify:links   # every external link is live AND is the organisation it claims to be
```

Answers are written by the first available provider, so Neuronara works with no setup and improves as you add keys (`.env.local`, see `.env.example`):

| Provider | Setup | Notes |
|---|---|---|
| Claude Opus 5 | `ANTHROPIC_API_KEY` | Best answers. Takes precedence when set |
| Free OpenRouter models | `OPENROUTER_API_KEY` (free key from [openrouter.ai/keys](https://openrouter.ai/keys)). Models tried in order: DeepSeek V4 Flash → Gemma 4 31B → Qwen 3.8; override with `OPENROUTER_MODELS` | Free, but needs the key |
| Pollinations (keyless) | Nothing. It's the fallback when no key is set. `LLM_KEYLESS=off` disables it | Anonymous third-party service, so treat it as a stopgap, not a dependency |

**Speed:** Claude and OpenRouter answer in a few seconds. The keyless tier is a single anonymous reasoning model and takes 10 to 35 s, whatever the settings (measured). The page shows the sources first and says so while the answer is pending, but for a real launch, set a key.

Whatever the provider, the server checks the answer before showing it (`lib/answer.ts`): plain text only, every claim carries a `[n]` that points to a real source, and any sentence without one is dropped. If nothing survives, Neuronara says it couldn't write a cited answer and shows the sources. Small free models do skip citations and add claims of their own, which is why this is enforced in code rather than trusted to the prompt.

## How it works

```
question ─┬─ lib/search.ts ───────── curated library (data/library.json), jargon-aware, scoped by modality, boosted by region
          └─ lib/connectors/europepmc.ts ── live literature (title + abstract)
                     │
          app/api/ask/route.ts ── streams: sources (~1 s) ──► then lib/llm.ts (OpenRouter free / Claude) ──► answer [n] + "Bottom line"
```

| Path | Role |
|---|---|
| `app/page.tsx` | `/`: the home page *is* the tool. The search is the hero; the marketing below it (`components/Marketing.tsx`) shows only while idle. `/search` redirects here |
| `components/Home.tsx` | Tool state and hero: headline, live metrics, search, rotating examples, modality chips. Keeps what's *typed* (`q`) apart from what was *asked* (`asked`), reads the streamed response, and re-asks when region or scope change. The logo returns to idle |
| `components/Suggestions.tsx`, `AnswerPending.tsx` | The typing dropdown ("↵ Ask…" + matching standards) and the answer placeholder with timer |
| `components/Results.tsx` | Answer, then **Standards** (grouped by document type) and **Literature** side by side, then hand-offs. Numbers match the `[n]` citations |
| `lib/llm.ts`, `lib/answer.ts` | Answer synthesis (Anthropic, OpenRouter or keyless) and the citation check that every answer must pass |
| `components/` | `Answer`, `StandardsList`, `RegionMenu`, `ThemeToggle`, `DatabasesSheet` (databases searched + library proxy; a bottom sheet on phones with × / tap-outside / swipe-down / Escape to close) |
| `app/api/ask/route.ts` | Retrieval and synthesis. Validates input, rate-limits per IP, and never logs the question |
| `lib/search.ts` | Ranking. Shorthand (CIDP, LPD, MSLT…) expands to phrases and weighs double. Generic words ("criteria", "standards") refine a match but can't make one. Documents covering more of the question's concepts win |
| `lib/catalog.ts` | Modalities, regions and their societies, document types (the results ontology), rotating examples, connectors, citation links. **Adding a country or a source only means editing this data** |
| `lib/connectors/` | One file per live source. Add new connectors here |
| `lib/library.ts` | The full library: journal papers plus national society documents |
| `data/seeds.json` → `scripts/build-library.mjs` → `data/library.json` | The library pipeline. Seeds are titles plus tags. The script resolves each one against Europe PMC to get a real DOI/PMID, drops errata and letters, and flags retired guidance. Run it with `npm run library` |
| `data/national-seeds.json` → `scripts/build-national.mjs` → `data/national.json` | Society documents that aren't in Europe PMC (BSCN/ANS, DGKN, SENFC). The script downloads every PDF, fails if one has disappeared, and stores an excerpt of its text. Run with `npm run library:national` (needs `poppler`) |
| `app/tokens.css`, `docs/DESIGN.md` | Design standard: primitive and semantic colour tokens (Sterile Aqua + blush), measured contrast, type, layout, voice |
| `DEPLOYMENT.md`, `scripts/deploy.sh` | Production on the Hostinger VPS |

### Adding a guideline

Add `{"q": "<exact title>", "soc": ["ACNS"], "mod": ["EEG"], "type": "criteria|terminology|technical|practice"}` to `data/seeds.json`, then run `npm run library` followed by `npm test`. The script prints any seed it can't match with confidence.

### Why filtering runs in the browser

The curated library ships with the page as about 60 KB of JSON. Search, modality scope and region ordering run client-side, instantly and with no request, using the same `lib/search.ts` the server uses to pick the answer's sources. The server is called only to search the literature and write the answer. Move library filtering behind an API when either (a) the library reaches thousands of documents, or (b) it includes licensed content that can't be shipped to the browser, which will happen with the paid connectors.

## Link integrity

Every external link (society sites, databases, national PDFs, DOIs) is checked by `npm run verify:links`, which fetches each page and requires it to **name the right organisation**, not merely respond. A site that answers with someone else's page fails: `isin.org` (the securities-identification body) and `senfc.org` (a Florida events network) were both shipped as neuroscience societies once, and this check is what would have caught them. Each site's expected identity lives next to its URL in `lib/catalog.ts` (`SITE_IDENTITY`), and a test fails if a URL is added without one. `scripts/deploy.sh` runs the check first and refuses to ship on any failure. Three sites block scripts (ILAE, Consensus, OpenEvidence); they were opened in a real browser and are recorded with a date in `VERIFIED_BY_HAND`, and the check warns when that date is over 180 days old. Never add a link from memory: search for it, open it, and add its identity.

## Databases and access

| Kind | Databases | How |
|---|---|---|
| Live | Neuronara library, Europe PMC | Queried on every question |
| Via your library | Cochrane, Embase, MEDLINE Complete | Paywalled DOIs open through the clinician's EZproxy/OpenAthens prefix (set in **Databases**) |
| Hand-off | PubMed, OpenEvidence, Consensus, AASM Scoring Manual | Opened with the question prefilled where the site supports it. OpenEvidence has no public API |

## Languages and how well it works

Neuronara accepts questions in **English, Spanish and German** (the library holds English documents plus German DGKN and Spanish SENFC ones). A question in Spanish or German is turned into English search terms by `lib/lang.ts`: a field glossary, plus automatic matching of Latin/Greek cognates against the library's own vocabulary (*magnetoencefalografía → magnetoencephalography*). The answer is written in the language of the question. The interface itself is English.

Measured with `npm run eval` (`evals/README.md`). Scores are retrieval + literature only, 0-100, on questions written after the engine was tuned and scored once before any fix:

| Set (first look) | English | Spanish |
|---|---|---|
| First held-out set (glossary only) | 88 | 51 |
| Fresh set, after adding cognates and a wider glossary | 90 | 65 |
| Fresh set, after fixing two bugs in the "unknown vocabulary" rule | 84 | 87 |

Read the first row as the honest one for any new Spanish phrasing: a hand-written glossary does not generalise, which is why cognates were added. After tuning, all four sets score 89-100 in English and 87-93 in Spanish, but those sets have been used to tune and overstate how it will do on new questions. The ceiling is spelling: a Spanish word that isn't a cognate and isn't in the glossary ("agujas", "codo") is dropped until someone adds it. Letting an LLM rewrite the query would fix that, at a cost of 10-30 s on the keyless tier.

**Answer quality is not measured yet.** Scoring written answers needs the LLM, which on the keyless tier serves about one answer every 30 s. A full run takes 12 minutes, and correctness still needs a clinician reading them.

### Ambiguous acronyms

PubMed acronyms collide across specialities: **MGA** is Martin-Gruber anastomosis in EMG/NCS but also microglandular adenosis and a microbial growth assay. Neuronara handles this three ways: (1) a table of field shorthand expands each acronym to the phrase a neurophysiologist means (`lib/search.ts`: MGA, CMAP, SNAP, MUAP, RNS, MUNE, TOS, CMT, HNPP, AIDP, LEMS…); (2) every Europe PMC query is fenced to the field with a required neurophysiology term (`lib/connectors/europepmc.ts`), so other specialities can't match; (3) the answer prompt tells the model to use the neurophysiology meaning and ignore sources about other meanings. An acronym that isn't in the table still reaches Europe PMC bare (though fenced), so add new ones as they turn up.

### What the free model gets wrong

Reading real answers found the failure that matters most: the keyless model **invented a detail under a valid citation** ("a four-grade scale: mild, moderately severe, severe, very severe" for the AANEM carpal tunnel guideline). Two causes were fixed:

1. Only the first 700-1200 characters of each abstract were kept, so conclusions were cut and the model guessed what a guideline recommends. Abstracts are now stored whole and, when they must be shortened for the prompt, keep both start and end.
2. The citation check only verified that `[n]` exists. It now also requires every number and acronym in a sentence to appear in the source it cites (`lib/answer.ts`), and the prompt tells the model to say when an excerpt doesn't specify something.

That is a floor, not a guarantee: it catches invented numbers and acronyms, not every invented sentence. Every answer now says it was written by AI from excerpts and to check the source. For anything a clinician might act on, use Claude (`ANTHROPIC_API_KEY`) and re-run the eval.

## National coverage (audited Sept 2026)

Regions only mean something if the library has that region's documents. Each society's own guideline index was checked, and every document below was downloaded and read before being added:

| Region | Society | In library | Notes |
|---|---|---|---|
| UK | BSCN / ANS | 7 | The full ANS-BSCN practice recommendations (v14, dated 31 Jan 2024 inside the PDF although the index says "2026"), the referral guidance (2025), and the EEG technical guidelines (hyperventilation, photic stimulation, melatonin, video-EEG telemetry, NEAD standards). Skipped: a health-service policy note that isn't a clinical standard |
| Germany | DGKN | 13 | The clinical recommendations: EEG (adults, children, montages, reporting, long-term, ambulatory, sleep deprivation, anaesthesia, telemedicine), intraoperative monitoring, brain-death diagnosis, sleep diagnostics, CJD needle handling. **In German**, shown with an English gloss and searchable in English. Skipped: about 20 training curricula and certification rules |
| Spain | SENFC | 3 | SENFC-GEER consensus on intraoperative monitoring in spine surgery, informed-consent recommendations (2019), on-call care (2024). Skipped: COVID-19 notes (out of date) and a statement about a company |
| Japan, China, Latin America | JSCN, others | 0 | No verifiable guideline index found. Nothing was invented. The region notice says so and links out |

Years marked "c." come from the PDF's metadata because the document prints no date. Adding a country is: find its index, add entries to `data/national-seeds.json`, run `npm run library:national`.

## Roadmap

- More national guidance: JSCN (Japan), Chinese societies, and Latin American bodies (none verifiable yet), plus the DGKN evoked-potential and IONM training documents if wanted.
- NCS normative values by age and height as structured data. This is where most report questions end up.
- Direct connectors for paid sources (Ovid/EBSCO/Elsevier APIs with institutional tokens), and Neuronara exposed as an MCP server.
- Accounts and institutional SSO (OpenAthens/Shibboleth) once institutional pilots start.

## Privacy

Questions go to Europe PMC and, when a key is set, to the LLM provider. Free OpenRouter models may keep prompts. Nothing is stored or logged server-side, and preferences stay in the browser. Don't enter patient identifiers.
