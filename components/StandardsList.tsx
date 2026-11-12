// Curated documents grouped by what they settle (lib/catalog DOC_TYPES). Within each group, relevance order is kept
// but documents from the user's region come first, then international bodies, then other regions' societies.
// Region never moves a document across groups or past a more relevant group-mate from the same tier.
import { citationHref, DOC_TYPES, excerpt, SOCIETY_SITES, TIER_ORDER, tierOf, type Tier } from "@/lib/catalog";
import type { Entry } from "@/lib/search";

const LANG = { en: "English", de: "Deutsch", es: "Español" };


function Row({ e, tier, kind, n, proxy }: { e: Entry; tier: Tier; kind: string; n?: number; proxy: string }) {
  const ex = excerpt(e.abstract);
  return (
    <li className="row">
      {n && <span className="cite-no" aria-label={`Source ${n}`}>{n}</span>}
      <a className="title" href={citationHref(e, proxy)} target="_blank" rel="noreferrer" lang={e.lang}>{e.title}</a>
      {e.titleEn && <p className="title-en">{e.titleEn}</p>}
      <div className="meta">
        <span>{kind}</span>
        <span className="soc">{e.societies.join(" · ")}</span>
        <b className="yr">{e.approxYear ? "c. " : ""}{e.year}</b>
      </div>
      {ex.text && (ex.more
        ? <details className="abs"><summary><span className="abs-text">{ex.text}</span><span className="abs-full">{e.abstract}</span><span className="abs-more" /></summary></details>
        : <p className="abs-short">{ex.text}</p>)}
      <div className="meta">
        <span className={e.retired ? "tag warn" : "tag current"}>{e.retired ? "Superseded" : "Current"}</span>
        {tier === "local" && <span className="tag local">Local</span>}
        {tier === "international" && <span className="tag intl">International</span>}
        {e.openAccess
          ? <span className="tag open">Open access</span>
          : proxy && !e.url && e.doi && <a href={citationHref(e, proxy)} target="_blank" rel="noreferrer">Via your library</a>}
        {e.lang && e.lang !== "en" && <span className="tag lang" title="Language of the document">{LANG[e.lang]}</span>}
        {e.pmcid && <a href={`https://europepmc.org/article/PMC/${e.pmcid}`} target="_blank" rel="noreferrer">Full text</a>}
        <a className="open-src" href={citationHref(e, proxy)} target="_blank" rel="noreferrer">Open source ↗</a>
      </div>
    </li>
  );
}

type Props = { entries: Entry[]; related?: Entry[]; proxy: string; region: string; missing: string[]; searched: boolean; citeNo: (e: Entry) => number | undefined };

export function StandardsList({ entries, related = [], proxy, region, missing, searched, citeNo }: Props) {
    const notice = region !== "global" && missing.length > 0 && (
    <p className="region-note">
      No {missing.map((s, i) => (
        <span key={s}>{i > 0 && (i === missing.length - 1 ? " or " : ", ")}{SOCIETY_SITES[s] ? <a href={SOCIETY_SITES[s]} target="_blank" rel="noreferrer">{s}</a> : s}</span>
      ))} documents in the library yet, so international standards come first. Check {missing.length > 1 ? "their sites" : "its site"} for national guidance.
    </p>
  );

  if (searched && !entries.length && !related.length) return <>{notice}<p className="empty">No standard in the library matches this question. Try other words, or see the literature.</p></>;

  return (
    <>
      {notice}
      {/* Browsing lists every category with its count, so an empty one reads "0 documents" rather than vanishing.
          After a search, empty categories are noise next to a two-document answer, so they are left out. */}
      {DOC_TYPES.map((t) => {
        const group = entries
          .filter((e) => e.type === t.id)
          .map((e, i) => ({ e, i, tier: tierOf(e.societies, region) }))
          .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.i - b.i);
        if (!group.length) return searched ? null : (
          <div key={t.id} className="group empty-group">
            <h3 className="group-title">{t.label} <span>0</span></h3>
            <p>No documents.</p>
          </div>
        );
        return (
          <div key={t.id} className="group">
            <h3 className="group-title">{t.label} <span>{group.length}</span></h3>
            <ul className="list">
              {group.map(({ e, tier }) => <Row key={e.id} e={e} tier={tier} kind={t.kind} n={citeNo(e)} proxy={proxy} />)}
            </ul>
          </div>
        );
      })}
      {related.length > 0 && (
        <details className="related">
          <summary>Related standards ({related.length})</summary>
          <p className="related-note">These share only general words with your question, such as &ldquo;criteria&rdquo;.</p>
          <ul className="list">
            {related.map((e) => <Row key={e.id} e={e} tier={tierOf(e.societies, region)} kind={DOC_TYPES.find((t) => t.id === e.type)!.kind} proxy={proxy} />)}
          </ul>
        </details>
      )}
    </>
  );
}
