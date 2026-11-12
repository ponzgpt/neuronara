"use client";
// Results, in the order a clinician resolves a question: society standards, grouped by what they settle, then literature.
// Standards and literature sit side by side on wide screens and stack on narrow ones.
// Numbers are the [n] citations of /api/search and of the prompt handed to the reader's own AI.
import { citationHref, CONNECTORS } from "@/lib/catalog";
import type { Entry } from "@/lib/search";
import type { SearchResult } from "@/lib/types";
import { AskYourAI } from "@/components/AskYourAI";
import { StandardsList } from "@/components/StandardsList";

type Props = { q: string; entries: Entry[]; data: SearchResult | null; pending: boolean; limited: boolean; proxy: string; papers: string; region: string; missing: string[] };

export function Results({ q, entries, data, pending, limited, proxy, papers, region, missing }: Props) {
  const cited = new Map(data?.standards.map((s) => [s.id, s.n]));
  // With a result, the server's split decides: strong standards (numbered) and related ones. Without one (scope chips only), the full ranked list.
  const strong: Entry[] = data ? data.standards : entries;
  const literature = data?.literature;

  return (
    <div aria-live="polite">
      {limited && <p className="status">Too many searches in a short time: literature is paused for a few minutes. The standards below still work.</p>}

      {data && !pending && data.standards.length + data.literature.length > 0 && <AskYourAI data={data} />}

      <div className="results">
        <section className="col" aria-labelledby="col-standards">
          <h2 id="col-standards" className="col-title">Standards <span>{strong.length}</span></h2>
          <StandardsList entries={strong} related={data?.related} proxy={proxy} region={region} missing={missing} searched={q.trim() !== ""} citeNo={(e) => cited.get(e.id)} />
        </section>

        <section className="col" aria-labelledby="col-literature">
          <h2 id="col-literature" className="col-title">Literature <span>{literature?.length ?? 0}</span></h2>
          {pending ? (
            <div className="card skeleton" aria-label="Searching the literature"><i /><i /><i /></div>
          ) : literature?.length ? (
            <ul className="list">
              {literature.map((s) => (
                <li key={s.n} className="row">
                  <span className="cite-no">{s.n}</span>
                  <a className="title" href={citationHref(s, proxy)} target="_blank" rel="noreferrer">{s.title}</a>
                  <div className="meta"><span>{s.meta}</span>{s.openAccess && <span className="tag open">Open access</span>}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">{literature && !limited ? "No matching papers." : limited ? "" : <>Ask a question to search {papers} papers in Europe PMC.</>}</p>
          )}
          <p className="handoff">
            Also ask
            {CONNECTORS.filter((c) => c.handoff).map((c) => (
              <a key={c.id} href={c.url!.endsWith("=") ? c.url + encodeURIComponent(q) : c.url} target="_blank" rel="noreferrer">{c.name}</a>
            ))}
          </p>
        </section>
      </div>
    </div>
  );
}
