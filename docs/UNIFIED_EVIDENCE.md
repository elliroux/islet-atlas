# Unified evidence foundation — first vertical slice

This branch extends the existing independent Cloudflare app. It does not replace the application, migrate production data automatically, deploy to the legacy site, or establish new biological facts.

## Operational flow

`POST /api/connections` validates a gene, reuses the existing PanKgraph/ARAX/Europe PMC/ClinicalTrials.gov connectors, normalizes returned identifiers, and saves an eligible batch in D1. Response `persistence.status` distinguishes a successful save from an unavailable database. Live results survive a storage failure and remain exportable; that run is not cached as a successful persistent run. Original retrieval times survive the five-minute cache.

`GET /api/evidence?gene=IL2RA` retrieves saved relationships and publication/trial metadata without calling providers. Optional **combinable** `provider`, `classification`, and `review` filters apply to assertions. The display is capped at 224 assertions, 100 documents and 12 candidate questions; truncation is explicit. Stable publication/NCT identifiers also join to existing `research_records`, so previously imported records remain accessible. `GET /api/evidence?coverage=1` exposes bounded recent query statuses, retrieval dates, source counts and quarantine counts. It never exposes notebook documents or review identities.

Connected Research opens its Saved discoveries view after a new gene investigation. Users can browse saved evidence without a new live request, inspect directed source edges, follow publication locators, inspect uncertainty and priority factors, or return to the existing live Connections/Evidence/Open questions views. Nano-to-Macro's HLA and genetic-variation topics link to the saved HLA-DQA1 view. These are navigation links, not new biological assertions added to the curated scale map.

## Data model and classification

Migration `0002_unified_evidence.sql` is additive. Drizzle definitions and snapshot accompany the migration; raw SQL remains authoritative for FTS/history triggers.

| Tables | Purpose |
| --- | --- |
| evidence_entities / evidence_aliases | Stable CURIEs, source names/categories, explicit TRAPI query-binding equivalence |
| evidence_assertions | Directed subject/predicate/object and current source version/review status |
| evidence_assertion_versions | Immutable content-hashed metadata versions; old versions remain inspectable in D1 |
| evidence_runs / evidence_run_assertions | Query log, retrieval time, quarantined identifier failures and exact assertion versions used |
| evidence_documents / evidence_document_versions / evidence_run_documents | PMID/NCT metadata and version history; search matches are contextual records |
| evidence_citations / evidence_document_links | Cited publication IDs and registry references; neither implies support or independent replication |
| evidence_reviews | Append-only, version-specific maintainer decisions and notes |
| research_record_history | Exact previous research record before existing importers change substantive fields |
| research_migration_rows / research_migration_batches | Source archives and resumable migration checkpoints separate from active import cursors |

The category field can represent genes, variants, proteins, pathways, cells, tissues, drugs, diseases and other scientific/research types without a schema rewrite. **The delivered adapters populate only the types actually returned in the current gene workflow.** Full ontology resolution, cohorts, datasets/access conditions and clinical outcome/claim models are not implemented by adding a generic category column.

Canonicalization is deliberately narrow: Ensembl, PMID, NCT, GO/MONDO/etc. underscores, Reactome human IDs and observed KEGG human pathway IDs. Other syntactically valid CURIE namespaces stay source-specific. Names never merge entities. Invalid endpoints are quarantined; source direction is not guessed. A conflicting alias causes the complete ingestion batch to fail instead of changing an existing identity.

Classifications are `reported_association`, `provider_assertion`, or `computational_inference`. TRAPI statistical association is not treated as a prediction. No automated causal-evidence classification is asserted. Explicit provider negation remains separate. Missing species, tissue, population, statistics or direction remain null. Source qualifiers can provide direction, but an `affects` edge alone cannot establish it. Publication matching does not produce positive/negative/inconclusive study outcomes.

All assertions enter `unreviewed`. POST `/api/evidence/review` requires an independent signed Cloudflare Access session belonging to `ATLAS_ACCESS_AI_OWNER_EMAIL`, exact assertion/version, a decision and a substantive source-review note. Cross-origin requests and legacy identity headers are rejected. Reviews of stale versions return 409. New source content invalidates the current reviewed state, while preserving the old review. “Reviewed” means source attribution inspected, not established causality or efficacy. A review form and multi-reviewer roles are future work; this release supplies a tested maintainer API.

## Rights and source records

Persistence is metadata/reference-first. It preserves provider identifiers, URLs, source-chain attribution, publication IDs, qualifiers used for normalization, factual context, retrieval time and a hash of the original connector metadata. Full original graph attributes are retained only when the record supplies an explicit supported CC BY/CC0/public-domain license; otherwise `references_only` and a reuse-limit note are shown. An API's existence is not a redistribution license. Unknown-license provider attributes remain available in the transient live response/export under the existing connector behavior, not copied wholesale to the shared database. Verify source-specific terms before widening retention.

No paper body or abstract is copied by this graph ingestion path. Existing authorized full-text collection is preserved. Migration preserves historical source records and records conflicts rather than retroactively discarding content. Dataset-access restrictions and entity/provider licensing exceptions require dedicated adapters/review before expansion.

## Deterministic discovery v1

The engine enumerates single-edge questions and pairs of source-linked edges sharing exactly one entity, from different graph providers, in a stable ID order. It considers at most 400 paths and displays 12 questions. Repeated paths through the same entity set share a question and retain all associated source assertions. This is structural retrieval, not a claim of a mechanistic bridge being experimentally established. Edge directions remain visible; adjacency never implies a causal chain.

Priority factors are reproducible integers: two-edge cross-provider path +2; at least one publication locator +1; explicit contrary edge +2; direction supplied on both edges +1. Duplicate paths do not add points. Stable IDs break ties. These are review-priority heuristics, **not validated probabilities, clinical confidence or drug efficacy**. Priorities are deliberately not increased by paper/provider counts. The output includes entities, source edges, explicit negations, gaps, uncertainty, already-reported/unknown status and validation prompts. No model is used in this path. External text is rendered as escaped data and never interpreted as instructions.

Publication IDs are deduplicated and registry references retained, but cohort independence is unknown. No independent-study count is displayed. Existing 15 curated study families remain intact. A shared pathway plus a drug edge cannot establish that the drug benefits T1D. Unknown novelty and unknown stop reasons are displayed as unknown.

## Resource controls and observability

Existing per-isolate four-run coalescing and five-minute cache remain. Connector response bytes are capped at 12 MB, with a total 45-second request deadline and one short transient retry; parsing, authorization and payload-limit failures are not retried. Existing imports retain provider pagination, checkpoints, leases and retry handling. A normalized ingestion is capped at 224 assertions/20 documents/750 KB and uses 11 set-oriented prepared statements in one D1 batch. On failure all changes roll back. Provider status and quarantine detail are recorded per run; the Worker logs a bounded `evidence_ingestion_failed` event without raw SQL or secrets.

These are not distributed abuse controls. A production WAF/rate-limit configuration, retention budget for append-only observations, and staged latency/row-scan measurements remain deployment review items. No new recurring import is activated by this branch. `update-research.py` gains an explicit Cloudflare target and bounded options, while preserving its legacy default and requiring a deliberate cutover flag.

## Contributor contract

A connector accepts an injectable fetcher and fixed provider URLs, returns stable endpoint IDs, edge direction, source/provider identity, publication references, query/retrieval status and available context. It must distinguish an empty response from a failure. Add deterministic fixtures for empty/invalid/timeout/transient responses and source-specific identities. Never fabricate metadata to satisfy the contract. Add a canonical-ID rule only after observing and documenting the source form; test it. Keep raw rights-restricted text outside the durable graph and document the policy. Keep hypotheses in `discovery.ts`, separate from source assertions.

Run `pnpm test`, `pnpm check`, `pnpm build:cloudflare`, local D1 migrations and Wrangler dry-run. Node 24 is used for tests (native SQLite and module hooks); Python 3.12+ runs migration tests. CI does not call live providers. Optional bounded live tests are explicit commands in the connector README.
