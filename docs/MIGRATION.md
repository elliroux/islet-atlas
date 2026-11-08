# Legacy research preservation and migration

**Production target: https://isletatlas.org. No production migration has been run by this branch.** Leave the legacy collection and its scheduled updater enabled. The audit observed 9,891 more publications and 55 more stored full-text bodies in the legacy database; counts alone cannot identify all missing/conflicting records.

## Authorized exports required

1. Record timestamp, origin, schema, per-provider/kind counts and active import cursors from both environments. The audited public `/api/research` endpoint reports counts but intentionally omits full bodies and cursors. Its output is not a complete backup.
2. Obtain a consistent full legacy **SQL or SQLite export** through the owner's authorized hosting/database export facility. The connected Sites tools available during implementation expose only bounded row inspection (including truncated values and a pagination ceiling), not a complete export. If the hosting UI has no full export operation, request an owner-authorized export from the hosting provider. Do not deploy a new feature/export endpoint to the legacy app to bypass this dependency. Required research tables/columns are checked in `scripts/migrate-research.py`; include full `research_records`, `research_imports`, and `research_import_runs`. Preserve a separate original backup of any private `investigations`, but never feed private notebooks into the public research migration.
3. Export the independent D1 with authorized owner credentials, e.g. `pnpm exec wrangler d1 export islet-atlas-db --remote --output=work/backups/cloudflare-before.sql --config wrangler.jsonc`. This is a read-only export. Save the D1 Time Travel bookmark as an additional rollback option; verify the account's retention window. Keep exports outside Git, with restrictive file access.
4. Materialize trusted SQL exports in separate SQLite files, e.g. `sqlite3 work/backups/legacy.sqlite < work/backups/legacy.sql` and the same for `cloudflare-before.sqlite`. A SQL export is executable input: inspect that it came from the authorized database export, never a paper or arbitrary uploaded source. Record SHA-256 checksums and retain untouched originals.
5. Use a **copy** of the destination SQLite export for rehearsal. Apply migration 0002 to the copy if absent. Do not reapply 0000/0001 to an existing schema. Do not reset either database or its import checkpoints.

The legacy source export remains unavailable. The independent production D1 backup and isolated staging schema rehearsal were completed on 2026-11-08; see STAGING_READINESS.md for exact counts, hashes and preservation results. Legacy-to-independent archive parity and full migration remain unverified. Synthetic migration tests are not proof of legacy parity.

## Plan, rehearse, resume, reconcile

```sh
python3 scripts/migrate-research.py plan \
  --source work/backups/legacy.sqlite \
  --destination work/rehearsal.sqlite \
  --out work/migration-snapshot-1
python3 scripts/migrate-research.py apply-local \
  --plan work/migration-snapshot-1 \
  --destination work/rehearsal.sqlite \
  --backup work/rehearsal-before-1.sqlite
python3 scripts/migrate-research.py verify \
  --plan work/migration-snapshot-1 --destination work/rehearsal.sqlite
```

Planning is read-only. Pages are deterministic, SHA-256 checked and bound to a snapshot digest. Schema drift fails closed. The plan enumerates source/destination counts, missing IDs, exact content conflicts (excluding retrieval timestamp) and identical records. Every source row/version, checkpoint and import log is archived in a source namespace. Only **missing** research records are inserted into the destination, triggering its existing full-text index. Existing records and active destination cursors are not overwritten. Private notebooks are excluded.

Batches contain at most 25 rows, generally 500 KB of source JSON. Very large individual records are bounded and rejected above 900 KB. Each batch archives, inserts missing records and saves its completion marker together. Retry the same plan with a new backup filename after a failure. Repeated migration creates no duplicate records/archives. A later source snapshot is a new immutable plan; prior checkpoints and source versions stay retained.

Verification checks every source row hash in the archive, every research ID in the destination, and the presence of every migrated record in FTS. `preservationVerified=true` means no missing/unaligned archives or index entries. `parityVerified=true` additionally requires zero conflicting current records. Exit code 2 means parity has not passed. A source version can be safely archived while its conflicting destination version remains current: this is **not full visible-content parity**. Review conflicts, including additional full-text bodies, before cutover. No automatic conflict resolver is provided; a reviewed merge must preserve both versions and rerun verification. Test meaningful research searches and source links, not only counts.

## After staging verification and explicit approval

Apply 0002 to the independent staging D1, rehearse the same plan there, and export it to run verification. Confirm source-specific content rights, backups and rollback. The production migration command exists but must not be run until the owner explicitly approves the concrete migration and target:

```sh
# Supply CLOUDFLARE_API_TOKEN privately in the operator environment, never in arguments or Git.
python3 scripts/migrate-research.py apply-remote \
  --plan work/migration-snapshot-1 \
  --account <verified-cloudflare-account-id> \
  --database 5d965dbc-66fd-422e-a5b7-594788a26702 \
  --approved-production-migration
```

The runner uses the fixed Cloudflare D1 query endpoint and parameterized batch bodies. It retries transient failures up to three times, checks completion markers and never sends legacy service credentials to Cloudflare. The [Cloudflare D1 query API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/) documents single and batch parameterized queries. Remote transport is implemented but has not been exercised against the production account. Verify the explicit account/database IDs and export the destination again afterward; successful HTTP responses are not migration verification.

Because legacy importing remains active, take another consistent source export after the first transfer and repeat delta planning/reconciliation. Do not cut over based on a stale snapshot. Document the final source snapshot and any records created afterward before retiring the old workflow. Preserve source checkpoints in the archive even if the destination continues its own scan. Never adopt a source cursor until all records preceding it have been reconciled.

## Rollback and automation cutover

- Code rollback: restore the prior Worker version; leave additive tables and archived research intact. The previous code ignores the new tables. Do not run destructive down migrations.
- Migration interruption: retain completed batches and rerun the same manifest. Failed transactions do not advance their marker.
- Data incident: stop the new migration process; keep the old collection/updater. Restore the verified pre-migration backup into a **separate** database, reconcile legitimate later writes, test it, then request approval to switch the binding. Do not blindly restore production over newer notebooks/research. Retain migration archives and audit logs for diagnosis.
- Only after verified source/destination parity and explicit cutover approval, change the scheduled invocation to `python3 scripts/update-research.py --origin https://isletatlas.org --approved-cloudflare-cutover`. The default remains the legacy origin. `--service` is rejected for Cloudflare. `--sources` and `--max-batches` bound an invocation; failures exit nonzero.
- Run both old and independent verification reads, confirm the independent updater advances its own checkpoint and shows a successful update, then retire legacy imports through a separately approved automation change. No schedule was changed by this branch.

Browser-origin notebooks and Connected Research snapshots need user-side JSON export/import; they are separate from this public collection migration. Independent Access identities have a different namespace. Notebook identity reconciliation requires a dedicated, user-authorized migration.
