"use client";
// "Ask your own AI": Neuronara supplies the sources and the citation rules; the reader's own assistant writes the answer.
import { useState } from "react";
import { searchHref } from "@/lib/catalog";
import { buildPrompt, chatLinks, SITE } from "@/lib/prompt";
import type { SearchResult } from "@/lib/types";

export function AskYourAI({ data }: { data: SearchResult }) {
  const [copied, setCopied] = useState(false);
  const args = { question: data.query, region: data.region, modalities: data.modalities, standards: data.standards, literature: data.literature };
  const links = chatLinks(args, SITE + searchHref(data.query, data.region, data.modalities));
  const copy = async () => {
    try { await navigator.clipboard.writeText(buildPrompt(args)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  return (
    <article id="ask-ai" className="card answer">
      <h2 className="col-title">Ask your own AI</h2>
      <p className="handoff">
        <button type="button" onClick={copy}>{copied ? "Copied" : "Copy prompt"}</button>
        <a href={links.claude} target="_blank" rel="noreferrer">Open in Claude</a>
        <a href={links.chatgpt} target="_blank" rel="noreferrer">Open in ChatGPT</a>
      </p>
      <p className="ai-note">Answers come from your own assistant; Neuronara supplies the sources.</p>
    </article>
  );
}
