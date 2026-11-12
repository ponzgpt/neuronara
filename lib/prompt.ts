// The prompt handed to the reader's own AI: the citation rules, the sources and the question. Pure, so it can be tested.
// The server never calls a model: this text is copied, or opened in the reader's assistant through a link.
import { REGIONS } from "./catalog.ts";
import { detectLang, LANG_NAME } from "./lang.ts";
import type { Paper, Standard } from "./types.ts";

export const SITE = "https://neuronara.technoir.cloud";

export const SYSTEM = `You help clinical neurophysiologists (EEG, EMG/NCS, evoked potentials, sleep, IONM) work out which standard, criteria, terminology or protocol applies to their question.
Use ONLY the numbered sources provided. Society guidelines and consensus statements outrank single studies; name the society and year.
When sources disagree, or a newer version supersedes an older one, say so and cite both. Mention regional differences in one line when relevant.
If the sources do not settle the question, say that plainly instead of filling the gap.
The reader is a clinical neurophysiologist. If a term is ambiguous (MGA is Martin-Gruber anastomosis here, not microglandular adenosis), use the neurophysiology meaning and silently ignore sources about other meanings; never present two meanings side by side.
State only what the source text says. If an excerpt does not reveal a detail (which scale is recommended, what a threshold is, how many grades there are), say the excerpt does not specify it: never supply it from memory.

RULES
- Every sentence that states a fact ends with its source number in square brackets, like [1] or [2, 4]. An answer without citations is rejected.
- Write the answer in the language of the question (English, Spanish or German). The sources are mostly English: translate what you use, and keep guideline names and abbreviations as they are.
- Refer to sources only by bracket, like [2]. Never write "Source 2" or "the first source".
- Plain text only. No markdown, no bold, no headings, no bullet points.
- 2 to 5 sentences, then one final line starting exactly with "Bottom line:" (one sentence, also cited). Keep the label "Bottom line:" in English even when answering in another language.

EXAMPLE
The 2021 ACNS terminology names periodic patterns by location, so lateralized periodic discharges are LPDs and generalized ones are GPDs [1]. The 2012 version used different modifiers and is superseded [1, 2].
Bottom line: Use the 2021 ACNS terms (LPD, GPD) [1].`;

// The assistant reads at most 5 standards and 4 papers, in full where possible. When an abstract must be cut, keep its start
// AND its end: conclusions sit at the end, and cutting them is how a model ends up guessing what a guideline recommends.
export const fit = (t: string, max: number) => (t.length <= max ? t : `${t.slice(0, Math.floor(max * 0.55))} […] ${t.slice(-Math.floor(max * 0.45))}`);

type Args = { question: string; region: string; modalities: string[]; standards: Standard[]; literature: Paper[] };

/** `pageUrl` set = short form (titles + meta lines + link to the full result) for links that would be too long. */
export function buildPrompt({ question, region, modalities, standards, literature }: Args, pageUrl?: string): string {
  const lines = [
    ...standards.slice(0, 5).map((s) => ({ n: s.n, kind: "guideline", title: s.title, abstract: s.titleEn ? `[${s.lang?.toUpperCase()} document, English title: ${s.titleEn}] ${s.abstract}` : s.abstract,
      meta: `${s.societies.join(" · ")} · ${s.journal} ${s.year}`, max: 2400 })),
    ...literature.slice(0, 4).map((p) => ({ n: p.n, kind: "literature", title: p.title, abstract: p.abstract, meta: p.meta, max: 1500 })),
  ].map((s) => `[${s.n}] (${s.kind}) ${s.title} — ${s.meta}${pageUrl ? "" : `\n${fit(s.abstract, s.max) || "(no abstract)"}`}`);
  const lang = LANG_NAME[detectLang(question)];
  const head = `Question language: ${lang}. Region: ${REGIONS[region]?.label ?? "Global"}. Scope: ${modalities.join(", ") || "all modalities"}.`;
  const sources = lines.join(pageUrl ? "\n" : "\n\n");
  const more = pageUrl ? `\n\nSource excerpts are on this page: ${pageUrl}` : "";
  return `${SYSTEM}\n\n${head}\n\nSources:\n${sources}${more}\n\nQuestion: ${question}`;
}

// Opening the prompt in the reader's assistant. Long query strings get cut by browsers and servers (~6,000 characters is safe).
const MAX_ENCODED = 6000;
export function chatLinks(a: Args, pageUrl: string): { claude: string; chatgpt: string } {
  let q = encodeURIComponent(buildPrompt(a));
  if (q.length > MAX_ENCODED) q = encodeURIComponent(buildPrompt(a, pageUrl));
  return { claude: `https://claude.ai/new?q=${q}`, chatgpt: `https://chatgpt.com/?q=${q}` };
}
