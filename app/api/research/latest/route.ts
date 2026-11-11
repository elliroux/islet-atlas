import { env } from "cloudflare:workers";
import { GLP_TOPIC, GLP_TERMS } from "../../../../research/topics";

export const dynamic = "force-dynamic";
const topics: Record<string, string[]> = {
  [GLP_TOPIC]: GLP_TERMS,
  Autoantibodies: ["autoantibod", "seroconversion"],
  HLA: ["HLA", "human leukocyte antigen"],
  Intervention: ["intervention", "therapy", "treatment", "teplizumab"],
  "Cell replacement": ["islet transplant", "cell replacement", "stem cell", "zimislecel"],
};

export async function GET(request: Request) {
  const topic = new URL(request.url).searchParams.get("topic") || "All research";
  if (topic !== "All research" && !topics[topic]) return Response.json({ error: "Unknown topic" }, { status: 400 });
  try {
    if (!env.DB) throw new Error("Database unavailable");
    const terms = topics[topic] || [];
    const relevance = ["type 1 diabetes", "type i diabetes", "type-1 diabetes", "T1D", "insulin-dependent diabetes"];
    const relevant = " AND (" + relevance.map(() => "(COALESCE(title, '') || ' ' || COALESCE(abstract, '')) LIKE ?").join(" OR ") + ")";
    const filter = terms.length ? " AND (" + terms.map(() => "(COALESCE(title, '') || ' ' || COALESCE(abstract, '')) LIKE ?").join(" OR ") + ")" : "";
    // Import time and full-text refreshes must never make an older paper look new.
    const date = "CASE WHEN json_valid(document) THEN json_extract(document, '$.firstPublicationDate') END";
    const rows = await env.DB.prepare(`SELECT id,title,url,year,provider,${date} AS published FROM research_records WHERE kind='Publication'${relevant} AND year>0 AND year<=CAST(strftime('%Y','now') AS INTEGER) AND (${date} IS NULL OR ${date}<=date('now'))${filter} ORDER BY year DESC, COALESCE(${date}, printf('%04d-01-01',year)) DESC, id ASC LIMIT 4`)
      .bind(...relevance.map(term => `%${term}%`), ...terms.map(term => `%${term}%`)).all();
    return Response.json({ items: rows.results }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return Response.json({ error: "Latest publications unavailable" }, { status: 503 });
  }
}
