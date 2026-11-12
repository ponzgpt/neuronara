// In the root layout, so it closes every page.
export function Footer() {
  return (
    <footer className="foot">
      <p>Not clinical advice. Neuronara points to published guidance; read the source before acting.</p>
      <p>
        <a href="/llms.txt">llms.txt</a> · <a href="/library.json">library.json</a> ·{" "}
        <a href="https://github.com/ponzgpt/neuronara" target="_blank" rel="noreferrer">GitHub</a>
      </p>
    </footer>
  );
}
