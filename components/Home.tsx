"use client";
// The home page is the tool. The hero is the search box; the marketing sections (passed as children)
// show only while idle. As soon as there's a query or a modality scope, results take over.
// The logo returns to the idle state.
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LIBRARY } from "@/lib/library";
import { rank } from "@/lib/search";
import { boostFor, DOC_TYPES, missingLocal, MODALITIES, searchHref } from "@/lib/catalog";
import { useStored } from "@/lib/use-stored";
import type { SearchResult } from "@/lib/types";
import { Results } from "@/components/Results";
import { Suggestions } from "@/components/Suggestions";
import { Examples } from "@/components/Examples";
import { RegionMenu } from "@/components/RegionMenu";
import { DatabasesSheet } from "@/components/DatabasesSheet";
import { ThemeToggle } from "@/components/ThemeToggle";

const SOCIETIES = new Set(LIBRARY.flatMap((e) => e.societies)).size;
const COUNTS = DOC_TYPES.map((t) => ({ ...t, n: LIBRARY.filter((e) => e.type === t.id).length }));

// `data` is the server-rendered result for the URL's ?q= (null when there is no question); urlRegion/urlScope are set only
// when the URL carries them, otherwise the stored preference is the default.
type Props = { papers: string; data: SearchResult | null; limited: boolean; urlRegion?: string; urlScope?: string[]; children: React.ReactNode };

export function Home({ papers, data, limited, urlRegion, urlScope, children }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const asked = data?.query || null; // results belong to the submitted question (the URL), not to what is in the box
  const [region, setRegion] = useStored("neuronara.region", "global", urlRegion);
  const [scope, setScope] = useStored<string[]>("neuronara.scope", [], urlScope);
  const [proxy, setProxy] = useStored("neuronara.proxy", "");
  const [q, setQ] = useState(asked ?? "");        // what's in the box
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const sources = useRef<HTMLDialogElement>(null);

  useEffect(() => setQ(asked ?? ""), [asked]);
  useEffect(() => {
    const focus = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); input.current?.focus(); }
    };
    addEventListener("keydown", focus);
    return () => removeEventListener("keydown", focus);
  }, []);

  const missing = useMemo(() => missingLocal(region, LIBRARY), [region]);
  // Two different rankings: `entries` is the full results list (for the submitted question); `matches` is only the typing dropdown.
  const entries = useMemo(() => rank(LIBRARY, asked ?? "", { modalities: scope, ...boostFor(region) }), [asked, scope, region]);
  const typed = useMemo(() => rank(LIBRARY, q, { modalities: scope, ...boostFor(region) }), [q, scope, region]);
  const active = asked !== null || scope.length > 0;
  const suggesting = focused && q.trim().length > 0 && q.trim() !== asked;
  const toggle = (m: string) => setScope(scope.includes(m) ? scope.filter((x) => x !== m) : [...scope, m]);
  const reset = () => { setQ(""); setScope([]); scrollTo({ top: 0 }); startTransition(() => router.push("/")); };

  function ask(question: string) {
    question = question.trim();
    if (!question) return;
    setQ(question); setFocused(false); input.current?.blur();
    scrollTo({ top: 0 });
    startTransition(() => router.push(searchHref(question, region, scope)));
  }

  // The result depends on region and scope (tiers, ranking, the AI prompt), so changing either reloads the same question's URL.
  const key = `${region}|${scope.join(",")}`;
  const lastKey = useRef(key);
  useEffect(() => {
    if (key === lastKey.current) return;
    lastKey.current = key;
    if (!asked) return;
    const t = setTimeout(() => startTransition(() => router.replace(searchHref(asked, region, scope))), 600); // debounce: people toggle several chips in a row
    return () => clearTimeout(t);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <header className="bar">
        <a href="/" className="brand" aria-label="Neuronara home" onClick={(e) => { e.preventDefault(); reset(); }}>
          <svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" /><path d="M5 17h5l2-6 3 12 3-15 2 9h7" /></svg>
          <span>Neuro<b>nara</b></span>
        </a>
        <nav>
          <button className="pill" onClick={() => sources.current?.showModal()} title="Databases Neuronara searches, and your library access" aria-label="Databases and library access">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5ZM13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13Z" /></svg>
            <span className="label">Databases</span>
          </button>
          <RegionMenu value={region} onChange={setRegion} />
          <ThemeToggle />
        </nav>
      </header>

      <main className={active ? "home active" : "home"}>
        <section className="hero">
          <h1><span>Every standard in clinical neurophysiology.</span> <span>One question away.</span></h1>
          <ul className="stats" aria-label="What Neuronara searches">
            {COUNTS.map((c) => <li key={c.id}><b>{c.n}</b> {c.short}</li>)}
            <li><b>{SOCIETIES}</b> societies</li>
            <li><b>{papers}</b> papers</li>
          </ul>
          <div className="search-wrap" onFocus={() => setFocused(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}>
            <form action="/" method="get" onSubmit={(e) => { e.preventDefault(); ask(q); }} className="search" role="search">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              {region !== "global" && <input type="hidden" name="region" value={region} />}
              {scope.length > 0 && <input type="hidden" name="modalities" value={scope.join(",")} />}
              <input ref={input} name="q" value={q} onChange={(e) => { setQ(e.target.value); setFocused(true); }} autoFocus autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setFocused(false);
                  if (e.key === "ArrowDown") { e.preventDefault(); document.querySelector<HTMLElement>(".suggest [data-nav]")?.focus(); }
                }}
                placeholder="Ask a question about a standard, criterion or protocol" aria-label="Ask a question about a standard, criterion or protocol" />
              <button type="submit" disabled={!q.trim() || pending}>{pending ? "Searching…" : "Search"}</button>
            </form>
            {suggesting && <Suggestions q={q.trim()} matches={typed.slice(0, 5)} total={typed.length} proxy={proxy} onAsk={() => ask(q)} />}
          </div>
          <Examples onPick={ask} />
          <div className="chips" role="group" aria-label="Scope to modalities">
            {MODALITIES.map((m) => (
              <button key={m} className="chip" aria-pressed={scope.includes(m)} onClick={() => toggle(m)}>{m}</button>
            ))}
            {scope.length > 0 && <button className="chip clear" onClick={() => setScope([])}>Clear</button>}
          </div>
        </section>

        {active
          ? <Results q={asked ?? ""} entries={entries} data={data} pending={pending} limited={limited} proxy={proxy} papers={papers} region={region} missing={missing} />
          : children}
      </main>

      <DatabasesSheet ref={sources} region={region} proxy={proxy} onProxy={setProxy} />
    </>
  );
}
