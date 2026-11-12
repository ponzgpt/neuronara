// "/" is both the product and its landing page: the search is the hero, the story sits below it.
// ?q=&region=&modalities= render the result on the server, so a shared link shows the same result without JavaScript.
import { headers } from "next/headers";
import { Home } from "@/components/Home";
import { Marketing } from "@/components/Marketing";
import { LIBRARY } from "@/lib/library";
import { parseParams, retrieve } from "@/lib/retrieve";
import { allow, clientIp } from "@/lib/rate-limit";

// Size of the open literature Neuronara searches, refreshed daily. Falls back to a floor if Europe PMC is down.
async function literatureSize(): Promise<number> {
  try {
    const res = await fetch("https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&pageSize=1&query=(SRC:MED%20OR%20SRC:PMC)",
      { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(5000) });
    return (await res.json()).hitCount;
  } catch {
    return 40_000_000;
  }
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const p = parseParams(sp.q, sp.region, sp.modalities);
  const searching = p.query !== "";
  const ok = !searching || allow(clientIp(await headers())); // same per-IP limit as /api/search: it spends Europe PMC's goodwill
  const data = searching ? await retrieve(LIBRARY, p, ok) : null;
  const papers = `${Math.floor((await literatureSize()) / 1e6)}M`;
  // Region and scope are passed only when the URL carries them; otherwise the visitor's stored preference is the default.
  return (
    <Home papers={papers} data={data} limited={!ok}
      urlRegion={sp.region !== undefined ? p.region : undefined} urlScope={sp.modalities !== undefined ? p.modalities : undefined}>
      <Marketing />
    </Home>
  );
}
