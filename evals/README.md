# Neuronara evaluation

A repeatable benchmark of whether Neuronara gives a clinician the right document and the right papers. It is retrieval-only: it calls `GET /api/search`, and Neuronara writes no answers. Questions are phrased the way a neurophysiologist would ask them, in **English, Spanish and German**.

```bash
npm run build && PORT=3217 node .next/standalone/server.js   # in one terminal (or `npm run dev -- -p 3217`)
npm run eval                                  # against http://localhost:3217
BASE=https://neuronara.technoir.cloud npm run eval
LANGS=es ONLY=cidp,mslt npm run eval          # a subset
```

The eval needs a running server and the network (Europe PMC), so it is not part of the check (`npm test && npm run build`).

**Scores before 2026-11-12 included an answer component (0.4 × retrieval + 0.2 × literature + 0.4 × answer) and are not comparable with scores from this version.** Historical figures quoted in the table below were measured that way.

Results are written to `evals/results/` (git-ignored) with every answer, so failures can be read, not just counted.

## Sets

| File | Topics | Purpose |
|---|---|---|
| `questions.json` | 19 × EN/ES | The set the engine was first tuned on. Regression only: a high score here proves little |
| `heldout.json` | 20 × EN/ES (+4 DE) | Written next, then tuned against too |
| `heldout2.json` | 14 × EN/ES | Written next; its failures were read and fixed, so it is no longer clean either |
| `heldout3.json` | 12 × EN/ES | **Written after all tuning and scored once, before any fix.** This is the honest generalisation number |
| `heldout4.json` | 1 × EN/ES so far | Started 2026-11-10 from misses seen on the live site. Not tuned against yet. First-look score (live, 2026-11-10): EN 85 (answer 63: retrieval right, key facts missing), ES 60 (no answer within the timeout) |
| `heldout5.json` | 5 × EN/ES | Written 2026-11-10 after the alias fix, **before it ships**: standards known by a name their abstract never uses, or with no abstract at all. Score once on the live site, then again after the fix. First run (live, 2026-11-10, **keyless**): retrieval EN 96 / ES 76, but only 2 of 10 answered ("busy", see `docs/OPEN-ISSUES.md` #0). Not a fair answer score: re-run once a key is set |

**Rule:** a set stops being a test the moment you tune against it. When a set has been used to fix something, write a new one for the next measurement, and report the first-look score of the newest set, not the best score of an old one.

## Scoring (0-100 per question)

`0.67 × retrieval + 0.33 × literature` (the earlier 0.4 / 0.2 weights with the answer part dropped and renormalised).

- **Retrieval**: is a gold document among the six returned, and at what rank? Position 1 is worth the most, and finding every gold document adds the rest. If the library has nothing on the topic (`gold: []`), the score rewards returning nothing rather than six neighbours.
- **Literature**: share of the first four Europe PMC hits whose title or abstract matches the topic (`lit` regex).
The `lit` regex checks that papers are *on topic*. It cannot check they are *correct*: that needs a clinician reading the results in `evals/results/`.

## Adding a question

```json
{ "id": "topic", "en": "…", "es": "…", "de": "…(optional)", "gold": ["title regex of the right document"],
  "lit": "regex a relevant paper matches", "region": "es (optional)" }
```
