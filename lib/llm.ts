// Answer synthesis. First available provider wins:
//   1. ANTHROPIC_API_KEY  → Claude Opus 5           best quality, paid
//   2. OPENROUTER_API_KEY → free OpenRouter models   free, needs a (free) account key
//   3. neither            → Pollinations, keyless    works out of the box; anonymous third party, so it's the
//                                                    stopgap. Turn it off with LLM_KEYLESS=off (then no key = no answer).
import Anthropic from "@anthropic-ai/sdk";

// Free models come and go on OpenRouter; override with a comma-separated OPENROUTER_MODELS.
const FREE_MODELS = (process.env.OPENROUTER_MODELS ??
  "google/gemma-4-31b-it:free,nvidia/nemotron-3.5-super-vl:free,google/gemma-4-26b-a4b-it:free").split(",").map((s) => s.trim());

export type Synthesis = { text: string | null; refused?: boolean };
type Chat = { system: string; user: string };

/** Which provider `synthesize` will use, so the UI can set expectations (the keyless tier takes 10-35 s). */
export type Provider = "anthropic" | "openrouter" | "keyless" | "none";
export function provider(): Provider {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  return process.env.LLM_KEYLESS === "off" ? "none" : "keyless";
}

export async function synthesize(system: string, user: string): Promise<Synthesis> {
  const chat = { system, user };
  if (process.env.ANTHROPIC_API_KEY) return claude(chat);
  if (process.env.OPENROUTER_API_KEY) return openaiCompatible("https://openrouter.ai/api/v1/chat/completions", chat, {
    headers: { authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "http-referer": "https://neuronara.technoir.cloud", "x-title": "Neuronara" },
    body: { models: FREE_MODELS, max_tokens: 1500 }, // `models` makes OpenRouter fall through when a free model is busy or gone
  });
  if (process.env.LLM_KEYLESS === "off") return { text: null };
  return openaiCompatible("https://text.pollinations.ai/openai", chat, {
    headers: {}, body: { model: process.env.POLLINATIONS_MODEL ?? "openai-fast", max_tokens: 1500 },
  });
}

async function claude({ system, user }: Chat): Promise<Synthesis> {
  const msg = await new Anthropic().beta.messages.create({
    model: "claude-opus-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" }, // the clinician is mid-question: latency beats depth
    system,
    messages: [{ role: "user", content: user }],
  });
  if (msg.stop_reason === "refusal") return { text: null, refused: true };
  return { text: msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("") };
}

// The anonymous keyless tier allows about one request at a time and answers 429 to the rest (measured: 3 parallel
// questions, 3 failures). Serialise its calls and retry 429 with a wait, so simultaneous users queue instead of failing.
// ponytail: in-process queue. A second replica would double the pressure; a real key removes the problem.
let keylessQueue: Promise<unknown> = Promise.resolve();
const isKeyless = (url: string) => url.includes("pollinations");

async function openaiCompatible(url: string, chat: Chat, opts: { headers: Record<string, string>; body: object }): Promise<Synthesis> {
  if (!isKeyless(url)) return openaiCall(url, chat, opts);
  const turn = keylessQueue.then(async () => {
    for (let attempt = 0; ; attempt++) {
      try { return await openaiCall(url, chat, opts); }
      catch (e) {
        if (attempt >= 3 || !(e instanceof Error) || !e.message.endsWith(" 429")) throw e;
        await new Promise((r) => setTimeout(r, 7000 * (attempt + 1)));
      }
    }
  });
  keylessQueue = turn.catch(() => {}); // a failure must not block the next person in line
  return turn;
}

async function openaiCall(url: string, { system, user }: Chat, opts: { headers: Record<string, string>; body: object }): Promise<Synthesis> {
  const res = await fetch(url, {
    method: "POST",
    signal: AbortSignal.timeout(45_000),
    headers: { "content-type": "application/json", ...opts.headers },
    body: JSON.stringify({ ...opts.body, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
  const text: string = (await res.json()).choices?.[0]?.message?.content ?? "";
  return { text: text.replace(/<think>[\s\S]*?<\/think>/g, "").trim() || null };
}
