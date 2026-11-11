import { env } from "cloudflare:workers";
import { news, type NewsItem } from "./news";
import { canonicalNewsUrl, newsSources } from "./news-import";

type SourceState = { id: string; last_checked: string | null; last_success: string | null; error: string | null; item_count: number };
export async function readNews() {
  let imported: NewsItem[] = [], states: SourceState[] = [], available = true;
  try {
    if (!env.DB) throw new Error("News database unavailable");
    const [items, status] = await Promise.all([
      env.DB.prepare("SELECT document FROM news_items WHERE published<=date('now') ORDER BY published DESC,url LIMIT 100").all<{ document: string }>(),
      env.DB.prepare("SELECT id,last_checked,last_success,error,item_count FROM news_sources").all<SourceState>(),
    ]);
    imported = items.results.flatMap(row => { try { return [JSON.parse(row.document) as NewsItem]; } catch { return []; } });
    states = status.results;
  } catch { available = false; }
  // Keep human-written summaries when an imported URL matches the backfill.
  const byUrl = new Map<string, NewsItem>();
  for (const item of [...imported, ...news]) { const url = canonicalNewsUrl(item.url); if (url) byUrl.set(url, item); }
  return {
    items: [...byUrl.values()].filter(item => item.published <= new Date().toISOString().slice(0, 10)).sort((a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id)),
    available,
    sources: newsSources.map(source => ({ name: source.name, url: source.url, ...(states.find(state => state.id === source.id) || { id: source.id, last_checked: null, last_success: null, error: null, item_count: 0 }) })),
  };
}
