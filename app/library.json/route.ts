// GET /library.json — the whole curated library (international + national) as one JSON array, same fields as data/*.json.
import { LIBRARY } from "@/lib/library";

export const dynamic = "force-static";

export const GET = () => Response.json(LIBRARY, { headers: { "access-control-allow-origin": "*" } });
