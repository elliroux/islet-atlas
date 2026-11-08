# Browsable gene catalog and background evidence

Connected Research starts with a paginated catalog: click **Explore [gene]** to open stored evidence without typing or calling upstream providers. The existing optional symbol lookup and fresh investigation remain available. Catalog filtering matches symbol prefixes; stable `(symbol, identifier)` keyset pagination returns 40 entries at a time. Selecting an entry moves keyboard focus to its investigation section.

## Scientific scope and coverage

The first catalog adapter enumerates direct gene links to PanKgraph's `MONDO_0005147` node. It is **not all known T1D genes**. The bounded live audit on 2026-11-08 returned `effector_gene_of` (209 distinct genes) and `signal_COLOC_with` (18 distinct genes); these counts overlap and must not be added as unique genes. Effector sources identify their results as predictions. The connector now labels prediction-attributed graph relationships computational inference, preserving the distinction from reported statistical associations.

Catalog membership is an unreviewed source claim, separate from normalized evidence assertions. Each entry retains Ensembl ID, source names, predicates, exact query, endpoint, first/last-seen dates and immutable metadata versions. No bulk full text is copied. Inspect original source terms before expanding retained content. A gene missing from this catalog is not evidence of no T1D relevance. Primary genetic catalogs, variant-level associations, HLA alleles/haplotypes and clinical causality adjudication remain gaps. Adding those requires source-specific, rights-reviewed enumeration adapters; do not relabel this initial source as comprehensive.

The UI reports total unique stored genes, underlying source counts, last page retrieval, last completed enumeration, pending/partial/failed refresh status, and each gene's provider observations and last successful/attempted enrichment. A completed scan is a completed traversal, not a consistent snapshot or proof of exhaustive scientific coverage. Entries absent from subsequent scans remain visible with their older last-seen dates.

## Storage and scheduling

Additive migration `0003_gene_catalog.sql` adds membership, immutable membership versions and a singleton checkpoint/lease. Existing notebooks, research records, import cursors and evidence remain intact. Apply after 0002. Schema generation metadata is committed with the SQL.

`catalogTick` takes a ten-minute D1 lease. Each invocation retrieves at most one 50-gene page and enriches at most one due gene using the existing PanKgraph, Translator, Europe PMC/PubMed and ClinicalTrials.gov connectors. Catalog writes, versions and cursor advancement are one atomic batch. Provider requests retain existing payload/time/retry bounds. No new public write endpoint exists; GET `/api/genes` only reads D1.

Full catalog scans recur after seven days. Successful gene refreshes recur after 30 days; partial/failing refreshes back off six hours, while unattempted genes take priority. Catalog failure retains its checkpoint and backs off one hour. Empty provider results count as successful requests, not negative biological evidence. A changed/unresolved Ensembl identity fails safely rather than attaching evidence to a different gene. Partial successful evidence is preserved and failures stay visible. The existing evidence graph deduplicates assertions, retains versions and generates source-linked candidate questions when read. Background updates do not generate clinical conclusions or persist new AI hypotheses.

Worker `scheduled` runs only when `ATLAS_BACKGROUND_INGESTION=enabled` and D1 is bound. **No Cron Trigger or enabling variable is added to production configuration in this PR.** The legacy research schedule is unchanged. Console summaries omit source payloads; public coverage reports bounded failure/status information. With a future five-minute cron, at most 12 genes/hour are attempted (one tick has one catalog request and existing bounded investigation requests, plus their single transient retries). Monitor actual rate limits, paid Worker CPU/cron limits, D1 growth and provider errors in staging before selecting a production cadence.

## Local verification and later activation

1. Install dependencies; run `pnpm check`, `pnpm test`, `pnpm build:cloudflare`.
2. Apply migrations **locally**: `pnpm exec wrangler d1 migrations apply islet-atlas-db --local --config wrangler.jsonc`.
3. Start the built scheduled-handler preview with `node scripts/catalog-preview.mjs` on localhost:8791. This generates a local-only config without assets because the pinned Wrangler asset router does not forward simulated scheduled events. Start the usual application preview separately on port 8790 to inspect the same local D1.
4. Invoke only the local scheduling simulator: `curl 'http://127.0.0.1:8791/cdn-cgi/handler/scheduled?cron=*/5+*+*+*+*'`. Wait for the `gene-catalog` completion log before another tick. Inspect `/api/genes` and `/connections`. The simulator is a Wrangler development endpoint, not a deployed application route. Provider access is live; do not include this in deterministic CI.
5. In a separate staging Worker/database, rehearse schema migration, compare saved research counts, seed all catalog pages, test provider outages and monitor resource use. Record coverage, queue completion and retained source records. Do not point staging at the production D1 binding.
6. Only after explicit production approval: back up D1, apply additive migrations, deploy to the independent Worker, enable the variable and configure a bounded Cron Trigger (for example `*/5 * * * *`, subject to staging limits). Prepopulate the catalog and verify browse/search/source traces. Production activation is not performed by this PR.

To stop collection, disable the variable and remove its trigger; do not delete catalog/evidence tables, version history or checkpoints. Rolling application code back can leave the additive tables intact. Re-enabling resumes the cursor and due queue. Archive a verified D1 export before any future schema rollback. This job neither replaces nor retires the legacy research importer; that requires the separately documented verified research migration.

## Extension contract

An enumerator returns stable gene ID, validated symbol, original relationship predicates and source attribution in ordered keyset pages. It must distinguish prediction/association, retain source-specific provenance and checkpoints, and declare coverage/rights limits. Add provider-specific membership keys/state before a second catalog enumerator (do not reuse or overwrite PanKgraph membership). Normalized enrichment continues through the existing connector and evidence contracts. Tests cover no-input browsing, paging, retries, rollback, leases, failed identity resolution, partial providers, evidence persistence, retained historical memberships and semantic accessibility.
