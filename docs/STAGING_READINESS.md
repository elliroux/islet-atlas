# PR #2 staging readiness — 2026-11-08 UTC

No production deployment, production database write, merge, legacy import change or production schedule activation was performed. Staging is https://islet-atlas-staging-pr2.hanneschoch.workers.dev with its own D1 and separate owner-only Cloudflare Access application. It remains available for review with background ingestion disabled and no cron triggers.

## Production backup and migration rehearsal

A full production D1 export completed at 05:42:17 UTC, including FTS and both private notebooks. The private SQL backup is 376,325,070 bytes, SHA-256 `b2bb77d03236ea79fe7601fb8b32f37401f6d0dc99f7cb5f32f2ff0fa33cd22d`. Its export/Time Travel bookmark is `0000001e-00000000-0000511d-ee12a7bb9cee061322cf8ad2235f3393`. The SQL, restored SQLite database and manifest are retained in ignored `work/backups/production-20261108T0542.*`, with restrictive local permissions; none are committed. They contain private data and must not be uploaded to a public artifact store. Arrange a private retained off-device copy before treating this as a long-term disaster-recovery archive.

The export used the D1 API's `dump_options.compatibility="sqlite3_cli_only"` and was restored with the SQLite CLI. **No FTS table was dropped from production.** This format is for SQLite restoration, not direct D1 import. See [D1 export API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/export/).

The restored backup passed SQLite integrity checks. `scripts/rehearse-schema.py` applied additive migrations 0002/0003 on a new local copy and verified unchanged aggregate row hashes for the four existing application tables, including both notebooks and all import checkpoints/history. The source backup was never modified.

An isolated remote staging database was populated with the three public research/import tables only; private production notebooks were excluded. Its baseline migrations and then real Wrangler migrations 0002/0003 completed successfully. A fresh full staging export was restored to SQLite and reconciled against the production snapshot:

| Preserved table | Records | Aggregate SHA-256 |
| --- | ---: | --- |
| research_records | 20,844 | b65a053e9911c75bbdd97e804eeead0fe8a4c22dd6860c42de253729ad1760ec |
| research_imports | 5 | 8262aaf45821591ab0126e9855e7b9a63588f1ed57d94756963d4141bfc12f0c |
| research_import_runs | 243 | fbef464e2f8d37f4ec117c0f8174382e4df62f437b70e417a2b4e2bd9d16dd28 |

Research comprises 16,136 publications, 4,682 trials and 26 curated Atlas records. All public-table content hashes matched. All 20,844 FTS rows matched source title/abstract/full-text/document fields; no missing, extra or duplicate index rows were found. SQLite integrity passed. The staging export SHA-256 was `21d31d1773532fbded69ea6194d8b1a564ab09c073472554f2c5345b1f149d7d`.

This proves preservation of the **independent production snapshot** through these schema migrations. It does not establish legacy ChatGPT-to-Cloudflare parity: the legacy export, known publication/full-text gaps and conflict reconciliation in MIGRATION.md remain outstanding. Legacy imports must stay active.

## Existing application regression checks

- Production and staging research queries returned identical ordered record IDs for HLA-DQA1 (23), IL2RA (15) and IFIH1 (19).
- Connections and Nano-to-Macro returned HTTP 200 on both origins.
- Anonymous notebook requests returned 401 on both origins. Deterministic tests additionally reject forged identity, cross-origin writes, other owners' records and stale revisions.
- The owner completed staging email sign-in. A synthetic staging investigation saved successfully, was returned by the authenticated `/api/notebook` endpoint, and reopened in the notebook after navigation. No production notebook was changed. Staging has no copied production AI secret; the test correctly used the labeled curated evidence guide.
- Relative sign-in links plus an exact configurable HTTPS origin allow isolated staging auth; the default production origin remains https://isletatlas.org. No Access bypass was introduced.

## Scheduled ingestion and recovery

Four actual Cloudflare scheduled Worker invocations, 05:55–05:58 UTC, imported four 50-gene pages and enriched CFTR, SKAP2, FARP2 and ST7L. Each recorded complete/empty provider observations within advertised limits: one resolver result, at most 80 PanKgraph links, 12 Translator candidates, 10 publications and 10 trials. Empty responses are not evidence of biological absence. This bounded success does not certify sustained workload capacity or upstream quotas.

The temporary every-minute cron was removed and `ATLAS_BACKGROUND_INGESTION` disabled at 05:59 UTC. The Cloudflare schedules API confirmed an empty schedule list. Staging version after disabling: `39332bba-df06-4403-a974-26b65e10ac57`.

With cron paused, the actual `catalogTick` implementation was exercised through a parameterized D1 REST adapter against the same staging database. Its fetch transport injected **one HTTP 429 with Retry-After:120** for catalog enumeration only; all enrichment and recovery evidence came from real providers. No synthetic scientific evidence was inserted. The check confirmed:

1. Exactly one throttled request, no premature retry, unchanged cursor and visible one-hour backoff.
2. Existing assertions retained and research count unchanged at 20,844.
3. An immediate subsequent tick did not query the throttled catalog.
4. An explicitly expedited staging-only retry cleared the error and resumed the final 23-gene page; 223 unique genes, no duplicate IDs, released lease. Three additional genes were enriched across these direct pipeline calls, leaving seven enriched genes and 394 assertions.

The expedited retry does not prove passage of a real one-hour cooldown. Deterministic tests advance time to prove cooldown/retry and expired-lease recovery, and cover timeouts, partial failures, transaction rollback, over-limit response rejection and repeated ingestion. The remote fault test exercises the pipeline and real D1; the four separate scheduled invocations verify deployed cron wiring.

## Coverage wording

The catalog prominently says **“PanKgraph coverage only—not all known T1D-associated genes.”** It includes predicted effector genes and colocalization links, with readable relationship labels, source counts and retrieval/refresh dates. Membership is unreviewed and does not establish causation. Source counts overlap: HIRN QTL/GWAS 18, Gaulton predictions 177, Atla predictions 18, Onengut-Gumuscu/Rich predictions 54. Primary genetic catalogs and HLA alleles/haplotypes are not comprehensively covered. Only seven genes were enriched in this staging test; complete enumeration is not complete evidence enrichment.

## Repeatable operator workflow

1. Export a fresh production snapshot with the D1 export API and SQLite compatibility option above; securely download, record SHA-256/bookmark, restore with `sqlite3 new.sqlite < backup.sql`, and check integrity. Never remove FTS to enable export. Export can briefly block database queries; plan its timing.
2. Run `python3 scripts/rehearse-schema.py --help`, then rehearse on a **new** destination copy. Keep original immutable. Reconcile hashes and full-text search before proceeding.
3. Create a separate staging D1/Worker and owner-only Access app. Generate the local config with `node scripts/prepare-staging.mjs --name islet-atlas-staging-<suffix> --database <new-uuid> --origin https://islet-atlas-staging-<suffix>.<account>.workers.dev --issuer https://<team>.cloudflareaccess.com --audience <staging-aud>`. Existing generated config files are never overwritten.
4. Restore only authorized public data with bounded parameterized, idempotent batches and durable progress markers. Do not put production private notebooks or AI secrets into staging. Apply migrations with `wrangler d1 migrations apply <staging-db-name> --remote --config work/staging/wrangler.json`.
5. Build with `ATLAS_STAGING_CONFIG=work/staging/wrangler.json pnpm build:cloudflare`. Inspect `dist/server/wrangler.json`: exact staging name, separate D1 ID, no production routes. Deploy only that verified config. A normal build restores the production configuration, so always recheck before any deploy command.
6. Repeat authenticated notebook, public search, count/hash and source-linked UI checks. For bounded cron rehearsal explicitly enable the staging-only flag and temporary trigger, observe completion/errors, then disable both. Confirm schedules are empty and coverage reports background disabled.
7. For controlled failure testing, pause cron, invoke the same pipeline against staging D1 with one injected throttling response and real provider fetches otherwise; assert unchanged cursor/data, visible backoff, no early retry, recovery and no duplicates. Never provoke real upstream throttling intentionally. Keep the test transport outside production routes and do not deploy fault hooks.

## Release boundary and rollback

34 Node tests, 9 Python tests and the connector assertion suite passed after readiness changes; TypeScript and Cloudflare builds passed. Automated tests are deterministic and require no provider credentials. Broader accessibility, sustained-load/resource-capacity and scientific validation remain ongoing work, not certified by this rehearsal.

A deployment requires explicit owner approval, fresh backup if production has changed, and the production checklist in CLOUDFLARE.md. Catalog activation must use a bounded cadence chosen from observed provider/Worker limits. Do not claim comprehensive genes, full enrichment or completed legacy migration. Code rollback restores the prior Worker and disables new ingestion while retaining additive tables. Restore data only into a separate database, reconcile subsequent legitimate writes, and obtain approval before switching bindings; never overwrite newer production research/notebooks with an old snapshot.
