// What Neuronara does, shown below the search while the page is idle: one worked example, three cards, three steps. Copy: UK English, plain, direct.
import { LIBRARY } from "@/lib/library";
import { rankScored } from "@/lib/search";
import { splitStrong } from "@/lib/retrieve";
import { citationHref, tierOf } from "@/lib/catalog";

// A real result, ranked from the library at render time (the same split the results page uses), never typed in by hand.
const EXAMPLE = "Awaji vs Gold Coast";
const top = splitStrong(rankScored(LIBRARY, EXAMPLE)).strong;

const FEATURES = [
  { title: "Every standard in one place", body: "Diagnostic criteria, terminology, technical standards and protocols from the societies that write them, each linked to its source." },
  { title: "Current, local or international", body: "Superseded versions are marked, your region's societies come first, and you can scope the search to the modalities you practise. If nothing matches, it says so." },
  { title: "Speaks neurophysiology", body: "Type it the way you say it at the reporting desk: CTS, NCSE, LPD, SSEP, MSLT. Add your library's link and paywalled papers open through your institution." },
];

export function Marketing() {
  return (
    <>
      <figure className="preview" aria-label="Example result">
        <div className="preview-q"><span>Example</span><a href={`/?q=${encodeURIComponent(EXAMPLE)}`}>{EXAMPLE}</a></div>
        {top.map((e) => (
          <p key={e.id}>
            <a href={citationHref(e, "")} target="_blank" rel="noreferrer"><b>{e.title}</b></a><br />
            {e.societies.join(" · ")} · {e.year} · {e.retired ? "Superseded" : "Current"} · {tierOf(e.societies, "global") === "international" ? "International" : "National"}
          </p>
        ))}
      </figure>

      <section className="l-block">
        <div className="grid">
          {FEATURES.map((f) => (
            <article key={f.title} className="feature"><h3>{f.title}</h3><p>{f.body}</p></article>
          ))}
        </div>
      </section>

      <section className="l-block">
        <h2 className="center">Ask. Compare. Read the source.</h2>
        <ol className="steps">
          <li><b>Ask</b><span>Type the question as you&apos;d put it to a colleague, abbreviations included. Never include patient details.</span></li>
          <li><b>Compare</b><span>See which standards apply, which version is current, and how societies differ.</span></li>
          <li><b>Read the source</b><span>Open the document itself and take it into your report, protocol, audit or teaching.</span></li>
        </ol>
      </section>
    </>
  );
}
