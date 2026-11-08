# Architecture audit — 2026-11-07 (America/New_York)

Baseline: `elliroux/islet-atlas` main at `f67dd0e`. Production target: **https://isletatlas.org**, independent Cloudflare Worker `islet-atlas`, D1 binding `DB`. The ChatGPT-hosted application is a legacy research source, never a destination for this phase. This document describes the inspected baseline; implementation changes are described in `UNIFIED_EVIDENCE.md`.

## Architecture and observed operation

Vinext/React runs on a Cloudflare Worker. `worker/index.ts` delegates requests to Vinext and handles Access sign-in. `scripts/build-cloudflare.mjs` selects the independent configuration. `wrangler.jsonc` binds `islet-atlas-db`; `deploy:cloudflare` applies remote migrations then deploys. Main is the documented Workers Builds production branch. No GitHub Actions workflow was tracked at audit time. Do not push to main, merge, run remote migrations, or deploy without approval.

`db/schema.ts` and migrations 0000/0001 define user-scoped notebook documents, research records, leased import checkpoints, import-run logs, and an FTS5 index with insert/update/delete triggers. There is no entity/edge schema or persistent discovery state. Publications and trials use stable `pubmed-<PMID>` and `trial-<NCT>` IDs; curated findings use `atlas-<finding-id>`. DOI/PMCID are secondary fields, not unique identity indexes. Import upserts replace metadata without preserving history; full-text bodies survive metadata refreshes. Failed imports retain the prior cursor. There is no general export endpoint.

| Source / feature | Live calls | Persistent at baseline | Limits / gaps |
| --- | --- | --- | --- |
| PanKgraph | Fixed Cypher gene, pathway/GO/KEGG/Reactome/T1D queries | No | 80 edges; source endpoints lost by parser; row-index IDs unstable |
| NCATS Translator / ARAX | Bound TRAPI drug–gene lookup | No | 12 candidates × 12 edges; provider assertions, qualifiers, publication IDs, source chain |
| Europe PMC / PubMed | Connected search, cross-field search, import | Import and cross-field metadata only | Connected records not saved; PubMed IDs deduplicate metadata, not cohorts |
| ClinicalTrials.gov | v2 bounded searches and paginated import | Import records only | Registry status and reason preserved; status does not classify efficacy |
| PubMed eUtils | `/api/literature`, `/api/source`, `/api/trace` | Mostly notebook/device state | Separate lookup use cases; not a second independent scientific source |
| Atlas curated collection | Repository JSON, import into D1 | JSON + imported findings | 26 records, 26 findings, 15 families, 22 searches; 5 curated trace links |
| Full text | Europe PMC XML for explicit CC BY / CC0 / public-domain metadata | D1 body, max 250k characters | Baseline trusts article metadata license; do not generalize rights |

Read-only coverage requests to both `/api/research` endpoints succeeded with curl. Python's default request was refused (403), so that refusal is not evidence of outage. Snapshot at 2026-11-07 23:44 ET:

| Collection | Independent Cloudflare | Legacy | Difference (legacy − independent) |
| --- | ---: | ---: | ---: |
| Publications | 16,136 | 26,027 | 9,891 |
| Trials | 4,682 | 4,682 | 0 |
| Reviewed findings | 26 | 26 | 0 |
| Stored full-text bodies | 61 | 116 | 55 |

Cloudflare publication checkpoint: processed 16,100 / reported total 252,188. Legacy: 26,000 / 252,188. Counts show a substantial collection on Cloudflare but **do not prove identity, byte parity, or migration completeness**. Source totals are query matches, not a census of all T1D research. No remote database was changed during this audit.

The Sites database overview confirms legacy `DB` tables: investigations, research_records, research_imports, research_import_runs, research_fts. The legacy scheduled automation “Expand Islet Atlas research collection” is enabled at 03:00, 09:00, 15:00, 21:00 America/New_York. `scripts/update-research.py` still targets that legacy origin and retries fixed atlas/recent/publication/trial/full-text imports. Leave it and the automation operational until record-level reconciliation passes. Sites row inspection is bounded/truncated and is not a full backup or export mechanism.

## APIs and interfaces

- `/api/connections`: same-origin public POST; fixed validated gene/name input; four in-flight investigations per isolate, 30-entry five-minute cache; no database write. Provider failures are visible rather than interpreted as no evidence.
- `/api/research`: public coverage/search/details and same-origin fixed-source imports; no arbitrary SQL or URL. Imports mutate the shared research collection without authentication (only fixed upstream sources). A distributed rate limit is absent.
- `/api/investigate`, `/api/trace`, `/api/cross-field`: curated retrieval and optional owner-only model synthesis. Cross-field alone saves fetched publication metadata via `rememberSources`. AI outputs remain notebook/client material; cited input IDs are validated but this is not scientific peer review.
- `/api/notebook`: authenticated owner-scoped documents with optimistic revisions. Independent auth uses signed Cloudflare Access JWTs; `public` mode rejects legacy identity headers. Browser notebooks and five Connected Research snapshots are origin-local, not automatically migrated to the new domain. Device exports require the user's browser; private notebooks must not enter the public evidence graph.
- Nano-to-Macro: 21 curated topic nodes at seven levels, editorial background links and navigation; not a computed evidence graph. Connected Research and curated `research/discovery.ts` have separate workflows. Existing static study filters describe aggregate findings only.

## Provenance, validation, and risks

Baseline source URLs, PMID/NCT IDs, retrieval timestamps, qualifiers, trial reference links and some license fields are retained, but inconsistently across endpoints. PanKgraph parser loses endpoint identifiers and uses row-order edge IDs. Graph assertions lack a durable source record/version, review state, alias resolution or relational links to publications/families. Repeated aggregators could look like replication if naively counted. Literature search matches do not establish support, contradiction, causality or measured effect. Statistical association must not be mislabeled computational prediction merely because it has a knowledge-level attribute.

Default connector and auth tests passed. Bounded live HLA-DQA1 test resolved ENSG00000196735 and returned 62 PanKgraph relationships and 10 Translator candidates; provider counts and test outcomes are recorded in `VALIDATION.md`. Live availability is time-dependent, not guaranteed by README descriptions. No full production export, remote SQL inspection, participant data or credentials was available in the checkout. Main contains no deterministic migration test or CI definition yet.

## Incremental target and sequence

1. Add D1 entity IDs/aliases, directed source assertions, immutable versions, evidence links, query observations and review audit. Keep current research tables and FTS intact.
2. Reuse the existing connectors; repair identity preservation. Normalize only known identifiers and retain unknown fields explicitly. Unresolved endpoints are quarantined, not silently promoted. Keep source metadata apart from generated hypotheses.
3. Persist permissible metadata and source links, not unrestricted source bodies. Unknown graph-provider reuse terms remain a link-only review gate. Publication/trial matches remain context, never automatic claim support.
4. Discover deterministic bounded paths from the persisted graph with reproducible priority factors; no clinical probability, efficacy or novelty score. Preserve contrary evidence and shared-study warnings.
5. Add source-linked saved evidence to Connected Research and a narrow Nano-to-Macro entry point. Preserve existing screens and device exports.
6. Rehearse an additive, idempotent migration from consistent authorized source/destination exports. Archive every source version and checkpoint; reconcile IDs/hashes, searchability and counts. Never reset a cursor or replace a destination record silently.
7. Gate production migration, automation cutover and deployment on explicit approval and reconciliation. Continue source collection until then.

See `ADR-001-D1-EVIDENCE.md` for the infrastructure decision and `MIGRATION.md` for export and rollback requirements. Broad cohort-level synthesis, full entity ontology expansion, clinical-effect extraction and automated retraction reconciliation remain follow-up work until implemented and validated.
