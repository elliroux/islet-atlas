"use client";

import { useEffect, useState } from "react";
import { news, newsDate, type NewsItem } from "../research/news";

export default function NewsFeed({ limit, tiles = false }: { limit?: number; tiles?: boolean }) {
  const [items, setItems] = useState<NewsItem[]>(news);
  const [status, setStatus] = useState("Checking for news updates…");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/news", { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Unavailable");
      const result = await response.json() as { items: NewsItem[]; available: boolean; sources: { last_success: string | null; error: string | null }[] };
      if (controller.signal.aborted) return;
      setItems(result.items);
      const successes = result.sources.map(source => source.last_success).filter((v): v is string => !!v).sort();
      const stale = result.sources.some(source => !source.last_success || Date.now() - Date.parse(source.last_success) > 24 * 3600000 || source.error);
      setStatus(!result.available ? "Updates temporarily unavailable · showing saved stories." : !successes.length ? "Showing source-checked stories · the first automatic check is pending." : `Sources checked ${newsDate(successes[0].slice(0, 10))}${stale ? " · some sources are delayed; saved stories remain available" : " · automatic checks every six hours"}.`);
    }).catch(() => { if (!controller.signal.aborted) setStatus("Updates temporarily unavailable · showing saved stories."); });
    return () => controller.abort();
  }, []);
  if (tiles) return <><p className="yhc-collection-note" role="status">{status}</p><div className="yhc-research-grid">{items.slice(0, limit).map(item =>
    <a className="yhc-research-card atlas-publication-card" key={item.id} href={item.url} target="_blank" rel="noreferrer">
      <h3>{item.title}</h3>
      <p>{item.summary}</p>
      <div className="yhc-source">{item.source}<span><time dateTime={item.published}>{newsDate(item.published)}</time></span></div>
      <div className="yhc-card-meta"><span>{item.category}{item.automatic ? " · Auto-collected" : ""}</span><span>Read story ↗</span></div>
    </a>
  )}</div></>;
  return <><p className="yhc-collection-note" role="status">{status}</p><div className="atlas-news-feed">{items.slice(0, limit).map(item => <article className="atlas-news-item" key={item.id}>
    <div className="yhc-label"><time dateTime={item.published}>{newsDate(item.published)}</time> · {item.category}</div>
    <h3><a href={item.url} target="_blank" rel="noreferrer">{item.title} ↗</a></h3>
    <p>{item.summary}</p>
    <p className="atlas-news-context">{item.significance}</p>
    <span className="yhc-label">Source: {item.source}</span>
  </article>)}</div></>;
}
