# Homepage news and research updates

Latest Research reads the four newest publications from the existing D1 collection via `/api/research/latest`. Publication dates, not import timestamps, determine order. This change does not alter the research import schedule.

## Cloudflare build configuration

Both Production and Previews Base must use `pnpm run build:cloudflare` as the build command. The generic `pnpm run build` uses the legacy Sites configuration and can combine its placeholder `DB` with the standalone Wrangler binding, causing duplicate-binding validation failures. Keep the preview command `npx wrangler preview`; production uses `pnpm run deploy:cloudflare`.

## Automatic news

The existing Cloudflare Worker runs `refreshNews` at 00:00, 06:00, 12:00, and 18:00 UTC, independently of browser visits or the owner's computer. Wrangler manages this trigger in `wrangler.jsonc`; the built Worker exports `scheduled`. Deploy using the existing Cloudflare build/deploy workflow, which applies `0002_news_feed.sql` before publishing. The schedule is only active after deployment. No Codex desktop automation, AI credentials, or additional service is required.

The fixed allowlist in `research/news-import.ts` contains:

- Yale School of Medicine: dated article metadata from its news index.
- Harvard Gazette: its public RSS feed.
- Diabetes UK: the newest twelve linked news pages, using their structured article metadata.

Breakthrough T1D's direct endpoints rejected automated requests during implementation. Its independently checked stories are included in the editorial backfill, but it is not a scheduled source.

Each check uses bounded requests and same-host redirects only. Items must have a source publication date, match T1D and research-related terms, be no more than 180 days old, and not be future-dated. Fundraising event headlines are excluded. URLs are canonicalized to remove query strings, fragments, and trailing slashes, then upserted. Repeated runs are idempotent; a per-source lease prevents overlapping work. Distinct publishers reporting the same event can remain separate entries. No source HTML or full article text is published. Automatically collected entries use publisher headlines and a neutral template description, and are explicitly labeled as unappraised news.

A failed source leaves previously stored stories intact and records its error. `/api/news` returns per-source last-check and last-success timestamps plus errors and item counts. The UI flags pending, unavailable, or delayed sources (over 24 hours). A zero-match successful check is not a failure. Source format changes that yield no dated candidates are treated as failures, not successful empty updates.

The homepage, `/news`, and `/news/feed.xml` share the same database-backed collection with a five-minute cache. The homepage shows four tiles. The archive/RSS returns up to 100 imported stories plus editorial entries. `research/news.ts` supplies five original, source-checked summaries even before the first scheduled run or during a database outage. Editorial text wins when its canonical URL matches an import.

## Validation

Run `node --test tests/news-feed.test.mjs`, `node node_modules/typescript/bin/tsc --noEmit`, and `node scripts/build-cloudflare.mjs`.

The tests cover source restrictions, dates, relevance, URL deduplication, JSON-LD/RSS parsing, idempotency, and retention on source failure. Live-source checks and a built-Worker scheduled invocation were also performed against the local database. Diabetes UK and Harvard succeeded in the Worker; Yale succeeded in a direct Node fetch but the local Worker returned an internal fetch error on both attempts. Its last-good editorial entry remains available, the failure is visible in source status, and the scheduler retries next run. Production verification must confirm Yale connectivity after deployment.

Wrangler 4.92's asset-router preview does not forward scheduled events to the user Worker. For local scheduled testing, use a temporary copy of the built Wrangler config with only `assets` removed, keep the same local D1 persistence path, and call `/cdn-cgi/handler/scheduled` on that preview. Do not change production asset settings. Never expose a public HTTP endpoint that starts an import.
