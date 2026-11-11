import { news, newsDate } from "../research/news";

export default function NewsFeed({ limit }: { limit?: number }) {
  return <div className="atlas-news-feed">{news.slice(0, limit).map(item => <article className="atlas-news-item" key={item.id}>
    <div className="yhc-label"><time dateTime={item.published}>{newsDate(item.published)}</time> · {item.category}</div>
    <h3><a href={item.url} target="_blank" rel="noreferrer">{item.title} ↗</a></h3>
    <p>{item.summary}</p>
    <p className="atlas-news-context">{item.significance}</p>
    <span className="yhc-label">Source: {item.source}</span>
  </article>)}</div>;
}
