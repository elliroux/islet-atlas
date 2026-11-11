"use client";

import { useState, useEffect } from "react";
import { data, records } from "../research/data";
import { supplementQuestion } from "../research/workbench";
import { Dna, Mountain, CircleDot, CircleDashed, TrendingUp } from "lucide-react";

import NewsFeed from "./NewsFeed";

type Publication = { id: string; title: string; url: string; year: number; provider: string; published: string | null };
const pathways = [
  { title: "Genes", description: "Genetic risk and susceptibility pathways", Icon: Dna },
  { title: "Environment", description: "Exposures, infections, and early-life factors", Icon: Mountain },
  { title: "Immune system", description: "Immune activation, tolerance, and autoimmunity", Icon: CircleDashed },
  { title: "Beta cells", description: "Islet stress, immune attack, and cell function", Icon: CircleDot },
  { title: "Disease progression", description: "From autoimmunity to clinical onset", Icon: TrendingUp },
];
const filters = ["All research", "Autoantibodies", "HLA", "Intervention", "Cell replacement"];
const filterIds: Record<string, string[]> = {
  Autoantibodies: ["multiple-antibodies"], HLA: ["hla-progression"],
  Intervention: ["tn-delay", "protect-cpep", "prot-negative"],
  "Cell replacement": ["zim-insulin", "donor-anti-cd3", "vx264-cpep"],
};

export default function AtlasOverview({ inspect, investigate }: {
  inspect: (id: string) => void; investigate: (question: string) => void;
}) {
  const [filter, setFilter] = useState("All research");
  const [publicationState, setPublicationState] = useState<{ topic: string; items: Publication[]; failed?: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/research/latest?topic=" + encodeURIComponent(filter), { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Unavailable");
        const result = await response.json() as { items?: Publication[] };
        if (!Array.isArray(result.items)) throw new Error("Invalid response");
        if (!controller.signal.aborted) setPublicationState({ topic: filter, items: result.items });
      }).catch(() => { if (!controller.signal.aborted) setPublicationState({ topic: filter, items: [], failed: true }); });
    return () => controller.abort();
  }, [filter, retry]);
  const current = publicationState?.topic === filter ? publicationState : null;
  const latestFindings = data.findings.filter(f => !filterIds[filter] || filterIds[filter].includes(f.id))
    .sort((a, b) => Number(records.get(b.record)!.year) - Number(records.get(a.record)!.year) || a.id.localeCompare(b.id)).slice(0, 4);
  const recent = [...data.records].sort((a, b) => Number(b.year) - Number(a.year)).slice(0, 5);
  return <div className="yhc-overview">
    <section className="yhc-hero" aria-labelledby="overview-title">
      <img src="/architecture-hero.jpg" alt="" className="yhc-hero-image" />
      <div className="yhc-hero-copy">
        <h1 id="overview-title">Connecting diabetes research to uncover new patterns, causes and curative pathways.</h1>
        <p>A research platform that helps families and researchers explore linked evidence across studies, trials, datasets, and hypotheses.</p>
      </div>
    </section>
    <div className="yhc-filters" role="group" aria-label="Latest research topics">
      <span className="yhc-label">Explore research</span>
      <div>{filters.map(name => <button key={name} aria-pressed={filter === name} onClick={() => setFilter(name)}>
        <span aria-hidden="true">{filter === name ? "✓" : "○"}</span>{name}
      </button>)}</div>
    </div>
    <section className="yhc-section" aria-labelledby="latest-title">
      <div className="yhc-section-heading"><h2 id="latest-title">Latest Research</h2><p className="yhc-label">Recent publications in the Atlas collection</p><a href="/research">Browse research <span aria-hidden="true">→</span></a></div>
      <div aria-live="polite">
      {!current && <p role="status">Loading latest publications…</p>}
      {current?.failed && <p role="status">Latest publications are temporarily unavailable. Showing curated findings below. <button onClick={() => { setPublicationState(null); setRetry(value => value + 1); }}>Retry</button></p>}
      {current && !current.failed && current.items.length === 0 && <p>No indexed publications match this topic yet. Showing curated findings below.</p>}
      {!!current?.items.length && <div className="yhc-research-grid">{current.items.map(item => <a className="yhc-research-card atlas-publication-card" key={item.id} href={item.url} target="_blank" rel="noreferrer">
        <h3>{item.title}</h3>
        <div className="yhc-source">{item.provider} <span>{item.published || item.year}</span></div>
        <div className="yhc-card-meta"><span>Indexed publication · not yet reviewed</span><span>Read source ↗</span></div>
      </a>)}</div>}
      {!current?.items.length && <div className="yhc-research-grid">{latestFindings.map(f => {
        const record = records.get(f.record)!;
        return <button className="yhc-research-card" key={f.id} onClick={() => inspect(f.id)}>
          <h3>{f.title}</h3><p>{f.summary}</p>
          <div className="yhc-source">{record.authors} <span>{record.year}</span></div>
          <div className="yhc-card-meta"><span>{f.area}</span><span>Trace evidence ↗</span></div>
        </button>;
      })}</div>}
      </div>
      <p className="yhc-collection-note">{current?.items.length ? "Newest publication dates in the imported collection; not an exhaustive or real-time literature feed. Topic filters match titles and abstracts. Papers have not yet been appraised by Atlas." : "Curated findings, newest source year first. Within-year order is not chronological where exact dates are unavailable."}</p>
    </section>
    <section className="yhc-section" aria-labelledby="news-title">
      <div className="yhc-section-heading"><h2 id="news-title">News &amp; Developments</h2><p className="yhc-label">New ideas, programs, and progress</p><a href="/news">All news →</a></div>
      <NewsFeed limit={4} tiles />
      <p className="yhc-collection-note">Source-linked news · <a href="/news/feed.xml">Subscribe via RSS</a></p>
    </section>
    <div className="yhc-evidence-row">
      <section className="yhc-map" aria-labelledby="map-title">
        <div className="yhc-section-heading"><h2 id="map-title">Evidence Map: Nano to Macro</h2></div>
        <p className="yhc-label">Explore biological connections across scales</p>
        <div className="yhc-pathways">{pathways.map(({title,description,Icon},i)=><a key={title} href="/nano-to-macro">
          <div className="yhc-pathway-icon"><Icon size={48} strokeWidth={1}/></div>
          {i<pathways.length-1 && <span className="yhc-pathway-arrow" aria-hidden="true">→</span>}
          <h3>{title}</h3><p>{description}</p>
        </a>)}</div>
        <a className="yhc-text-link" href="/nano-to-macro">Explore the interactive map →</a>
      </section>
      <section className="yhc-recent" aria-labelledby="recent-title">
        <div className="yhc-section-heading"><h2 id="recent-title">Recent in the Collection</h2><a href="/research">View all →</a></div>
        <div>{recent.map(r=><a className="yhc-publication" key={r.id} href={r.url} target="_blank" rel="noreferrer"><span>{r.year}</span><span>{r.title} ↗</span></a>)}</div>
      </section>
    </div>
    <section className="yhc-bottom" aria-labelledby="questions-title">
      <div><div className="yhc-section-heading"><h2 id="questions-title">Key Questions</h2><p className="yhc-label">Starting points for discovery</p></div>
        <div className="yhc-questions">
          <button onClick={()=>investigate("What contributes to Type 1 Diabetes?")}><span>01</span><strong>What contributes to Type 1 Diabetes?</strong></button>
          <button onClick={()=>investigate("What approaches move toward a durable cure for Type 1 Diabetes?")}><span>02</span><strong>What approaches move toward a durable cure?</strong></button>
        </div>
      </div>
      <div className="yhc-mission"><h2>Open evidence. Linked discovery. Family-accessible research.</h2><p>A connected research resource for Type 1 Diabetes, bringing together evidence, people, and curative possibilities.</p></div>
    </section>
    <div className="yhc-investigation"><span className="yhc-label">Featured research question</span><button onClick={()=>investigate(supplementQuestion)}>{supplementQuestion} <span aria-hidden="true">→</span></button></div>
  </div>;
}
