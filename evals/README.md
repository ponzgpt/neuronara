# Neuronara evaluation

A repeatable benchmark of whether Neuronara gives a clinician the right document, the right papers and a faithful cited answer. Questions are phrased the way a neurophysiologist would ask them, in **English, Spanish and German**.

```bash
npm run dev                                   # in one terminal
NOLLM=1 npm run eval                          # retrieval + literature only (fast; run the server with LLM_KEYLESS=off)
SET=heldout3 npm run eval                     # full run including written answers (slow on the keyless tier: ~30 s each, serial)
BASE=https://neuronara.technoir.cloud npm run eval
LANGS=es ONLY=cidp,mslt npm run eval          # a subset
```

Results are written to `evals/results/` (git-ignored) with every answer, so failures can be read, not just counted.

## Sets

| File | Topics | Purpose |
|---|---|---|
| `questions.json` | 19 × EN/ES | The set the engine was first tuned on. Regression only: a high score here proves little |
| `heldout.json` | 20 × EN/ES (+4 DE) | Written next, then tuned against too |
| `heldout2.json` | 14 × EN/ES | Written next; its failures were read and fixed, so it is no longer clean either |
| `heldout3.json` | 12 × EN/ES | **Written after all tuning and scored once, before any fix.** This is the honest generalisation number |
| `heldout4.json` | 1 × EN/ES so far | Started 2026-11-10 from misses seen on the live site. Not tuned against yet: score it once before fixing anything |

**Rule:** a set stops being a test the moment you tune against it. When a set has been used to fix something, write a new one for the next measurement, and report the first-look score of the newest set, not the best score of an old one.

## Scoring (0-100 per question)

`0.4 × retrieval + 0.2 × literature + 0.4 × answer` (`NOLLM=1`: `0.67 × retrieval + 0.33 × literature`).

- **Retrieval**: is a gold document among the six returned, and at what rank? Position 1 is worth the most, and finding every gold document adds the rest. If the library has nothing on the topic (`gold: []`), the score rewards returning nothing rather than six neighbours.
- **Literature**: share of the first four Europe PMC hits whose title or abstract matches the topic (`lit` regex).
- **Answer**: written at all; in the language of the question; cites a gold document; contains the key facts (`facts` regexes). With no gold document: does it admit the gap?

The `facts` and `lit` regexes check that an answer is *on topic*. They cannot check it is *correct*: that needs a clinician reading the answers in `evals/results/`.

## Adding a question

```json
{ "id": "topic", "en": "…", "es": "…", "de": "…(optional)", "gold": ["title regex of the right document"],
  "facts": ["regex an answer must contain"], "lit": "regex a relevant paper matches", "region": "es (optional)" }
```
