import type { NewsItem } from "./news";

export const newsSources = [
  { id: "yale", name: "Yale School of Medicine", url: "https://medicine.yale.edu/news/", host: "medicine.yale.edu", path: "/news-article/", format: "jsonld" },
  { id: "harvard", name: "Harvard Gazette", url: "https://news.harvard.edu/gazette/feed/", host: "news.harvard.edu", path: "/gazette/story/", format: "rss" },
  { id: "diabetes-uk", name: "Diabetes UK", url: "https://www.diabetes.org.uk/about-us/news-and-views", host: "www.diabetes.org.uk", path: "/about-us/news-and-views/", format: "articles" },
] as const;
type Source = typeof newsSources[number];
type Candidate = { title: string; url: string; date: string; description: string };

export function plainNews(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]*>/g, " ").replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp|#039);/gi, (_, entity: string) => {
    const known: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
    if (known[entity]) return known[entity];
    const code = entity.toLowerCase().startsWith("#x") ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : " ";
  }).replace(/\s+/g, " ").trim();
}
export function canonicalNewsUrl(value: string, base?: string) {
  try { const url = new URL(value, base); if (url.protocol !== "https:" || url.username || url.password || url.port) return null; url.search = ""; url.hash = ""; return url.href.replace(/\/$/, ""); } catch { return null; }
}
function trustedArticle(value: string, source: Source) {
  const url = canonicalNewsUrl(value, source.url);
  return url && new URL(url).hostname === source.host && new URL(url).pathname.startsWith(source.path) ? url : null;
}
export function jsonNews(html: string, fallbackUrl = ""): Candidate[] {
  const result: Candidate[] = [];
  function walk(value: unknown, depth = 0) {
    if (!value || typeof value !== "object" || depth > 12) return;
    if (Array.isArray(value)) { value.forEach(v => walk(v, depth + 1)); return; }
    const node = value as Record<string, unknown>;
    if (typeof node.headline === "string" && typeof node.datePublished === "string") {
      result.push({ title: node.headline, date: node.datePublished, url: typeof node.url === "string" ? node.url : typeof node["@id"] === "string" ? node["@id"] : fallbackUrl, description: typeof node.description === "string" ? node.description : "" });
    }
    for (const child of Object.values(node)) if (typeof child === "object") walk(child, depth + 1);
  }
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { walk(JSON.parse(match[1])); } catch { /* Non-JSON scripts are not executed. */ }
  }
  return result;
}
export function rssNews(xml: string): Candidate[] {
  if (!/<rss\b/i.test(xml) || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Invalid RSS feed");
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0, 100).map(match => {
    const tag = (name: string) => plainNews(match[1].match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] || "");
    return { title: tag("title"), url: tag("link"), date: tag("pubDate"), description: tag("description") };
  });
}
export function normalizeNews(candidate: Candidate, source: Source, now = new Date()): NewsItem | null {
  const title = plainNews(candidate.title).slice(0, 300), description = plainNews(candidate.description).slice(0, 2000);
  const text = title + " " + description;
  const url = trustedArticle(candidate.url, source), time = Date.parse(candidate.date);
  if (!url || title.length < 10 || !Number.isFinite(time)) return null;
  const published = new Date(time).toISOString().slice(0, 10);
  if (published > now.toISOString().slice(0, 10) || time < now.getTime() - 180 * 86400000) return null;
  if (!/\b(type[ -]?(1|i)(?: diabetes)?|t1d|islet|beta.cell)\b/i.test(text)) return null;
  if (!/research|stud(?:y|ies)|trial|therap|treatment|immun|transplant|screen|prevent|vaccine|discovery|discover|funding|gift|scientist|cell|risk|approval/i.test(text)) return null;
  if (/fundrais|marathon|gala|obituar|tribute|walkathon/i.test(title)) return null;
  const category = /funding|gift|grant/i.test(title) ? "Funding & research programs" : /trial/i.test(title) ? "Clinical trial update" : /screen|prevent|risk/i.test(title) ? "Prevention & early detection" : "Research update";
  return { id: url, url, title, published, source: source.name, category,
    summary: `New reporting from ${source.name}. Read the original article for the research details and context.`,
    significance: "Automatically collected from a trusted publisher. This news report has not been appraised as Atlas research evidence.", automatic: true };
}
async function fetchSource(url: string, source: Source) {
  // No arbitrary URLs, credentials, or cross-host redirects.
  let current = url;
  for (let redirects = 0; redirects < 3; redirects++) {
    if (new URL(current).hostname !== source.host || !current.startsWith("https://")) throw new Error("Untrusted source URL");
    const response = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(15000), headers: { "User-Agent": "IsletAtlas-News/1.0 (+https://isletatlas.org/news)" } });
    if (response.status >= 300 && response.status < 400) { const next = response.headers.get("Location"); if (!next) throw new Error("Invalid redirect"); current = new URL(next, current).href; continue; }
    if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
    const reader = response.body?.getReader(); if (!reader) throw new Error("Empty source response");
    const decoder = new TextDecoder(); let text = "", size = 0;
    try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 2_000_000) throw new Error("Source response too large"); text += decoder.decode(value, { stream: true }); } } finally { await reader.cancel(); }
    return text + decoder.decode();
  }
  throw new Error("Too many redirects");
}
export async function collectNews(source: Source, now = new Date()) {
  const text = await fetchSource(source.url, source);
  let candidates = source.format === "rss" ? rssNews(text) : jsonNews(text);
  if (source.format === "articles") {
    const urls = [...new Set([...text.matchAll(/href=["']([^"']+)["']/gi)].map(m => trustedArticle(m[1], source)).filter((v): v is string => !!v))].slice(0, 12);
    if (!urls.length) throw new Error("No article links found; source format may have changed");
    const results = await Promise.allSettled(urls.map(async url => jsonNews(await fetchSource(url, source), url)));
    candidates = results.flatMap(result => result.status === "fulfilled" ? result.value : []);
    if (results.some(result => result.status === "rejected")) throw new Error("Some source articles could not be read; retry on next run");
  }
  if (!candidates.length) throw new Error("No dated articles found; source format may have changed");
  return [...new Map(candidates.map(c => normalizeNews(c, source, now)).filter((v): v is NewsItem => !!v).map(item => [item.url, item])).values()];
}

export async function refreshNews(db: D1Database) {
  const results = await Promise.allSettled(newsSources.map(async source => {
    const now = new Date(), token = crypto.randomUUID();
    await db.prepare("INSERT OR IGNORE INTO news_sources(id) VALUES (?)").bind(source.id).run();
    const lease = await db.prepare("UPDATE news_sources SET lease=?,lease_until=? WHERE id=? AND lease_until<?").bind(token, Date.now() + 300000, source.id, Date.now()).run();
    if (!lease.meta.changes) return;
    try {
      const items = await collectNews(source, now);
      if (items.length) await db.batch(items.map(item => db.prepare("INSERT INTO news_items(url,published,document) VALUES (?,?,?) ON CONFLICT(url) DO UPDATE SET published=excluded.published,document=excluded.document").bind(item.url, item.published, JSON.stringify(item))));
      await db.prepare("UPDATE news_sources SET last_checked=?,last_success=?,error=NULL,item_count=?,lease=NULL,lease_until=0 WHERE id=? AND lease=?").bind(now.toISOString(), now.toISOString(), items.length, source.id, token).run();
    } catch (error) {
      await db.prepare("UPDATE news_sources SET last_checked=?,error=?,lease=NULL,lease_until=0 WHERE id=? AND lease=?").bind(now.toISOString(), error instanceof Error ? error.message : "Source unavailable", source.id, token).run();
      throw error;
    }
  }));
  if (results.some(result => result.status === "rejected")) throw new Error("One or more news sources failed; last good stories retained. See /api/news source status.");
}
