# Validation report — 2026-11-07/08, America/New_York

Baseline audited: `f67dd0e` on `elliroux/islet-atlas/main`. Work isolated on `feat/unified-research-foundation`. No production/legacy writes, deployments, merges or schedule changes were made. Tests using Cloudflare-looking URLs inject local fake transports; their log messages are not production import runs.

## Deterministic automated checks

- **23 Node tests passed**: existing independent auth/JWT behavior; public evidence validation; forged identity/cross-origin/body-limit rejection; version-specific review audit; HLA-DQA1, IL2RA and IFIH1 provider → normalization → SQLite/D1-compatible storage → discovery; canonical IDs/KEGG regression; idempotency; atomic rollback/retry; alias conflict quarantine; source version retention/review invalidation; explicit contradictory assertions; no false efficacy from trial termination; computational classification; source text treated as data; joins to previously stored research; aggregator-path consolidation; axe accessibility semantics.
- **8 Python tests passed**: resumable interrupted migrations; duplicate replay; retained source versions/active cursors/private notebooks; FTS searchability; conflict preservation; corrupted manifest rejection before writes; schema drift rejection; import history; explicit remote authorization gate; remote transport retry; bounded importer retry/failure. Some tests cover multiple conditions.
- Existing `scripts/test-connectors.mjs` assertion suite passed, including transient retry, timeout, malformed schemas, empty/partial failures, HLA family behavior, direction, TRAPI bindings, provenance and streamed response-size limit.
- `pnpm check` / TypeScript passed.
- `pnpm build:cloudflare` passed. Existing Vinext “ineffective dynamic import” optimization warnings remain; no build errors.
- Wrangler applied 0000, 0001 and 0002 successfully to **local D1**. Generated Drizzle schema check reports no additional changes.
- Wrangler `deploy --dry-run` passed against the independent build; it did not upload or deploy.
- `git diff --check` passed.

Tests use Node 24.22.2, pinned pnpm 11.25.0, local SQLite and Python. CI uses Node 24/Python 3.12 and requires no external providers or secrets. The SQLite-compatible unit adapter exercises the actual SQL and transaction rollback; the live local Worker checks below additionally exercise workerd and local D1.

## Bounded live providers

Each smoke run resolved the exact human gene and completed all four provider families. These are observed snapshots, not availability guarantees or scientific validation:

| Query | Resolved Ensembl | PanKgraph links | Translator candidate entities | Publications + trials |
| --- | --- | ---: | ---: | ---: |
| HLA-DQA1 | ENSG00000196735 | 62 | 10 | 13 (10 + 3) |
| IL2RA | ENSG00000134460 | 46 | 12 | 20 (10 + 10) |
| IFIH1 | ENSG00000115267 | 61 | 12 | 12 (10 + 2) |

The HLA query verifies the previously missed GO/Reactome/KEGG label regression. IL2RA's live response exposed KEGG IDs such as `hsa_04630`; the normalizer now maps that observed form to `KEGG:hsa04630`, with a deterministic regression test.

## Local Worker and interface

A real browser investigation through the **local independently built Worker**, using real upstream providers, persisted HLA-DQA1 as **72 assertions and 13 documents**, then returned 12 source-linked candidate questions from D1. Navigating to `/connections?gene=HLA-DQA1` loaded them without another provider investigation. The first IL2RA run persisted 68 assertions and quarantined 11 KEGG IDs before the mapping fix; no test research was removed. The later HLA run had no quarantined IDs. Counts are not independent-study counts.

Combined PanKgraph + reported-association filtering worked. Browser checks verified native select keyboard navigation and visible focus, 390×844 mobile and 1280×900 desktop layouts with document width equal to viewport width, and source-linked, uncertainty-labeled candidate presentation. A screenshot is included in the review handoff. Existing navigation and snapshot/export controls remain available.

The automated axe test renders both the new controls and expanded discovery/source content, and verifies no semantic accessibility violations or injected script element. jsdom has no layout; contrast is not automatically evaluated there. Browser checks are bounded manual QA, **not a blanket WCAG conformance certification**. A broader screen-reader/keyboard audit remains follow-up work.

Initial Wrangler preview encountered macOS watcher/settings restrictions; checkout-local tool paths and polling resolved them. Rebuilding while watching briefly invalidated compiled module paths; restarting the preview against the completed build resolved it. No production configuration was changed to work around local preview issues.

## Migration verification boundary

The synthetic migration rehearsal confirms mechanics, preservation, hashes, indexing, conflict reporting and retry behavior. It does **not** prove parity of the real databases. Read-only production coverage showed 16,136 independent publications versus 26,027 legacy publications, with equal trial/finding counts and a 55-body full-text difference. Complete authorized exports, actual record-level reconciliation, staging transport validation and conflict review remain mandatory before production migration/automation cutover. See `MIGRATION.md` and `PHASE_2_STATUS.md`.

## Gene catalog follow-up (2026-11-08)

- 29 Node tests and 8 Python tests passed, plus the connector assertion suite. New tests cover catalog paging/idempotency/transaction rollback, retry and retained memberships, partial providers, identity mismatch, the global lease, public read-only validation, prediction classification and catalog axe semantics.
- TypeScript, Cloudflare build, Drizzle schema check, local migration 0003 and Wrangler deployment dry-run passed.
- Five bounded live **local** scheduled invocations enumerated 223 unique PanKgraph-linked genes and enriched five genes (CFTR, SKAP2, FARP2, ST7L, CD6) through the existing connectors. All five recorded successful provider completion; this does not imply positive scientific results. Underlying source membership counts: HIRN QTL/GWAS 18; Gaulton predictions 177; Atla predictions 18; Onengut-Gumuscu/Rich predictions 54. Counts overlap.
- Local browser selection of CFTR without typing retrieved 160 persisted relationships and 11 literature/registry matches, plus candidate research prompts. Keyboard selection transferred focus to the investigation. Catalog pagination, source/update display and 390px mobile overflow were checked. Only five genes were enriched in this bounded live test; enrichment of the whole catalog and primary-source coverage expansion remain future operations.
- The pinned Wrangler asset router returned a local scheduled-simulation error. The committed local-only preview helper removes asset routing from its temporary config and successfully exercises the built Worker's scheduled handler and the same local D1. Production scheduled activation still requires staging verification.
- No production database write, deployment, trigger activation, legacy schedule change or migration-parity claim was made.
