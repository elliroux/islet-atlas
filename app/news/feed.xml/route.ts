import { readNews } from "../../../research/news-store";
export const dynamic = "force-dynamic";

function xml(value: string) {
  return value.replace(/[<>&"']/g, character => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!);
}
export async function GET() {
  const { items: news } = await readNews();
  const items = news.map(item => `<item><title>${xml(item.title)}</title><link>${xml(item.url)}</link><guid isPermaLink="false">isletatlas:news:${xml(item.id)}</guid><pubDate>${new Date(item.published + "T00:00:00Z").toUTCString()}</pubDate><category>${xml(item.category)}</category><description>${xml(item.summary + " " + item.significance + " Source: " + item.source)}</description></item>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Islet Atlas — News &amp; Developments</title><link>https://isletatlas.org/news</link><description>Curated developments in type 1 diabetes research.</description><language>en</language>${items}</channel></rss>`, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
