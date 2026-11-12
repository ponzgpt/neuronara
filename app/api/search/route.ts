// GET /api/search?q=&region=&modalities=EEG,ALS — ranked standards + live literature, numbered for citation. No LLM, no secret.
import { LIBRARY } from "@/lib/library";
import { parseParams, retrieve } from "@/lib/retrieve";
import { allow, clientIp } from "@/lib/rate-limit";

const headers = { "access-control-allow-origin": "*" };
const fail = (error: string, status: number) => Response.json({ error }, { status, headers });

export async function GET(req: Request) {
  if (!allow(clientIp(req.headers))) return fail("Too many searches in a short time. Try again in a few minutes.", 429);
  const sp = new URL(req.url).searchParams;
  const p = parseParams(sp.get("q"), sp.get("region"), sp.get("modalities"));
  if (!p.query) return fail("Empty question: pass ?q=", 400);
  return Response.json(await retrieve(LIBRARY, p), { headers: { ...headers, "cache-control": "no-store" } });
}
