// What Neuronara does, shown below the search while the page is idle. Copy: UK English, plain, direct.
import { LIBRARY } from "@/lib/library";
import { rank } from "@/lib/search";
import { tierOf } from "@/lib/catalog";

// A real result, ranked from the library at render time, never typed in by hand.
const EXAMPLE = "Awaji vs Gold Coast";
const top = rank(LIBRARY, EXAMPLE).slice(0, 2);

const FEATURES = [
  { title: "Every standard in one place", body: "Diagnostic criteria, terminology, technical standards and protocols from the societies that write them. Each one is linked to its source." },
  { title: "Compares instead of guessing", body: "When societies disagree or a version changes, Neuronara shows each side with its source, and marks what is superseded. If nothing in the library matches, it says so." },
  { title: "Speaks neurophysiology", body: "Type the way you talk at the reporting desk: CTS, NCSE, LPD, SSEP, MSLT. Neuronara knows what you mean." },
  { title: "Knows where you practise", body: "BSCN in the UK, ACNS and AANEM in the US, JSCN in Japan. International bodies always, and your local ones first." },
  { title: "Fits your practice", body: "Only carpal tunnels? The whole EEG, EMG and IONM service? Scope Neuronara to what you actually do." },
  { title: "Uses the access you already have", body: "Add your library's OpenAthens or EZproxy link and paywalled papers open through your trust or university." },
];

const SOCIETIES = ["IFCN", "ILAE", "ACNS", "AANEM", "AASM", "BSCN", "EAN", "PNS", "ISIN", "ISCEV"];

const FAQ = [
  { q: "Is it free?", a: "Yes, while Neuronara is in pilot. There's no account and nothing to install." },
  { q: "Where do the answers come from?", a: `From a curated library of ${LIBRARY.length} society guidelines and consensus papers, each checked against its DOI or PubMed record, plus a live search of Europe PMC, which includes MEDLINE. Neuronara writes no answers: it ranks those sources and links each one. If you want a written summary, it hands the sources to your own AI assistant.` },
  { q: "Does it replace OpenEvidence or Consensus?", a: "No. They cover all of medicine; Neuronara covers one specialty in depth. When your question is broad, Neuronara passes it to them in one click." },
  { q: "What happens to my question?", a: "It goes to Europe PMC. Neuronara stores nothing. If you use the \"Ask your own AI\" links, your question goes to the assistant you choose, which is one more reason never to type patient details." },
  { q: "Who is it for?", a: "Consultants, trainees and clinical physiologists in neurophysiology, and neurologists who carry out their own studies." },
];

export function Marketing() {
  return (
    <>
      <figure className="preview" aria-label="Example result">
        <div className="preview-q"><span>Example</span><a href={`/?q=${encodeURIComponent(EXAMPLE)}`}>{EXAMPLE}</a></div>
        {top.map((e) => (
          <p key={e.id}>
            <b>{e.title}</b><br />
            {e.societies.join(" · ")} · {e.year} · {e.retired ? "Superseded" : "Current"} · {tierOf(e.societies, "global") === "international" ? "International" : "National"}
          </p>
        ))}
      </figure>

      <section className="l-block narrow">
        <h2>Three societies. Two versions. One question.</h2>
        <p>Awaji or Gold Coast? ACNS terminology from 2012 or 2021? Whose minimum EEG standard does your department follow, IFCN&apos;s or ACNS&apos;s?</p>
        <p>The answers exist. They&apos;re spread across society websites, journals and PDFs from different decades, and some sit behind paywalls.</p>
        <p className="punch">Neuronara puts them side by side and tells you which applies.</p>
      </section>

      <section className="l-block">
        <h2 className="center">What Neuronara does for you</h2>
        <div className="grid">
          {FEATURES.map((f) => (
            <article key={f.title} className="feature"><h3>{f.title}</h3><p>{f.body}</p></article>
          ))}
        </div>
      </section>

      <section className="l-block">
        <h2 className="center">Ask. Compare. Use.</h2>
        <ol className="steps">
          <li><b>Ask</b><span>Type the question as you&apos;d put it to a colleague, abbreviations included.</span></li>
          <li><b>Compare</b><span>See which standard applies, where it differs from the others, and the source for each.</span></li>
          <li><b>Use</b><span>Take the source into your report, protocol, audit or teaching.</span></li>
        </ol>
      </section>

      <section className="l-block narrow center">
        <h2>Built on the guidance you already trust</h2>
        <p className="soc-strip">{SOCIETIES.join(" · ")}</p>
        <p className="fine">Plus the open literature through Europe PMC. Neuronara is independent and is not affiliated with or endorsed by these organisations.</p>
      </section>

      <section className="l-block narrow">
        <h2>What Neuronara is not</h2>
        <ul className="nots">
          <li><b>Not a substitute for your judgement.</b> It shows you the evidence. You read the trace.</li>
          <li><b>Not a general chatbot.</b> It writes no answers: it points to published sources and shows you each one.</li>
          <li><b>Not a place for patient data.</b> Ask about the finding, never about the patient.</li>
        </ul>
      </section>

      <section className="l-block narrow">
        <h2>Questions</h2>
        {FAQ.map((f) => (
          <details key={f.q} className="faq"><summary>{f.q}</summary><p>{f.a}</p></details>
        ))}
      </section>
    </>
  );
}
