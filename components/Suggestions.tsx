"use client";
// Shown under the search box while the user is typing. It answers "what will Enter do?" in the first row and offers
// direct jumps to matching standards below. It is not the results page: full results appear only after asking.
import { citationHref } from "@/lib/catalog";
import type { Entry } from "@/lib/search";

type Props = { q: string; matches: Entry[]; total: number; proxy: string; onAsk: () => void };

export function Suggestions({ q, matches, total, proxy, onAsk }: Props) {
  const move = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-nav]")];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    const next = e.key === "ArrowDown" ? i + 1 : i - 1;
    if (next < 0) document.querySelector<HTMLInputElement>(".search input")?.focus();
    else items[Math.min(next, items.length - 1)]?.focus();
  };

  return (
    <div className="suggest" onKeyDown={move}>
      <button type="button" className="suggest-ask" data-nav onClick={onAsk}>
        <span className="enter" aria-hidden="true">↵</span>
        <span>Search Neuronara: <b>{q}</b></span>
        <small>standards + literature</small>
      </button>
      {matches.length > 0 && (
        <>
          <p className="suggest-title">Jump to a standard{total > matches.length ? ` · ${total} ${total === 1 ? "match" : "matches"}` : ""}</p>
          {matches.map((e) => (
            <a key={e.id} data-nav href={citationHref(e, proxy)} target="_blank" rel="noreferrer" className="suggest-row" lang={e.lang}>
              <span className="soc">{e.societies[0]}</span>
              <span className="t">{e.titleEn ?? e.title}</span>
              <small>{e.approxYear ? "c. " : ""}{e.year}</small>
            </a>
          ))}
        </>
      )}
    </div>
  );
}
