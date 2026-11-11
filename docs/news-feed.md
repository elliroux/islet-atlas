# Homepage updates

Latest Research reads the four newest publications from the existing D1 collection via `/api/research/latest`. It orders by source year and first publication date, never by import or full-text refresh time. The homepage requires an explicit type 1 diabetes term in the title or abstract to reduce peripheral matches from the broader import query. Topic filters match titles and abstracts. Undated records use their source year and are displayed with year-only precision. Future-dated publications are excluded. Newly imported publications appear after the five-minute cache expires; this does not install or change an import schedule.

Indexed publications are explicitly labeled as not yet reviewed. While loading, when the database is unavailable, or when a topic has no publications, the homepage shows curated findings ordered by source year and explains that fallback.

News & Developments is an editorial feed, separate from publication evidence. Add original short summaries to `research/news.ts`, including the original source URL, publication date, category, and an explanation of what the announcement does and does not establish. The homepage shows the newest three entries. `/news` shows the archive and `/news/feed.xml` provides RSS. Entries are published with the normal application deployment; there is no unauthenticated submission endpoint or automatic news scraping.

For future ingestion, use an allowlist of institutional news/RSS sources and a review queue. Deduplicate by canonical URL, retain original publication dates, and distinguish preprints, trial results, registry updates, funding announcements, and hypotheses. Review before promoting an announcement into the evidence collection.
