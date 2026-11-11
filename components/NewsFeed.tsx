import { news, newsDate } from "../research/news";

export default function NewsFeed({ limit, tiles = false }: { limit?: number; tiles?: boolean }) {
  if (tiles) return <div className="yhc-research-grid">{news.slice(0, limit).map(item =>
    <a className="yhc-research-card atlas-publication-card" key={item.id} href={item.url} target="_blank" rel="noreferrer">
      <h3>{item.title}</h3>
      <p>{item.summary}</p>
      <div className="yhc-source">{item.source}<span><time dateTime={item.published}>{newsDate(item.published)}</time></span></div>
      <div className="yhc-card-meta"><span>{item.category}</span><span>Read story ↗</span></div>
    </a>
  )}</div>;
  return <div className="atlas-news-feed">{news.slice(0, limit).map(item => <article className="atlas-news-item" key={item.id}>
    <div className="yhc-label"><time dateTime={item.published}>{newsDate(item.published)}</time> · {item.category}</div>
    <h3><a href={item.url} target="_blank" rel="noreferrer">{item.title} ↗</a></h3>
    <p>{item.summary}</p>
    <p className="atlas-news-context">{item.significance}</p>
    <span className="yhc-label">Source: {item.source}</span>
  </article>)}</div>;
}
