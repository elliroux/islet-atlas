# Phase 2 status and remaining work

This is the first tested vertical slice, not completion of all nine phases. All implementation targets the independent Cloudflare repository. No production deployment, production D1 migration, merge, or automation cutover was performed.

| Area | Implemented in this branch | Still required |
| --- | --- | --- |
| Audit | Source/code/schema/automation inspection, production/legacy counts, bounded live provider checks | Complete authorized database exports and record-level production parity |
| Normalization | Entity CURIEs/aliases, directed assertions, context/provenance, source versions, citations, review states | Full variant/HLA allele resolution, protein/target ontologies, cohort/dataset/access-condition models |
| Ingestion | Connected Research → atomic D1 batches; idempotency, failure handling, licensed metadata retention, quarantine | Wider connector coverage, rights review per provider, distributed quotas/retention policy |
| Migration | Checksummed plans, local backup/rehearsal, resumable local and remote runners, conflict/index/hash verification | Real source export, staging/production execution with approval, reviewed conflict resolution, live parity |
| Discovery | Deterministic one/two-edge candidate questions, contrary negated edges, gaps, transparent priority | Comparable-study synthesis, reviewed supports/contradicts/outcome extraction, cohort independence, multi-hop drug repurposing, retraction-aware reevaluation |
| Interface | Saved evidence, combined assertion filters, linked prior collection records, uncertainty/source/priority views, HLA map navigation | Aggregate clinical variable filters with coverage metadata, richer scale/entity navigation, review UI |
| Automation | Existing updater remains compatible; explicit future Cloudflare target, bounded volumes, failures exit nonzero; append-only research history and recent evidence logs | Approved schedule cutover, correction/retraction detection, autonomous edge extraction, persisted hypothesis lifecycle, alert/feed integration |
| Testing/security | Deterministic connector/D1/discovery/migration/auth tests, axe semantic test, CI build/local migrations/dry-run, manual responsive/keyboard checks | Load testing against staging; broad assistive-technology audit; production auth/rate-limit review |

## Suggested next reviewable increments

1. Obtain authorized complete exports; rehearse this migration against the actual accumulated collection. Review conflicting full-text/metadata versions. Securely reconcile snapshots and test preserved search. This blocks retirement of legacy imports.
2. Add rights-reviewed structured adapters for primary source assertions and comprehensive retained contextual attributes, with explicit licensing per provider. Map retraction/correction links into versioned record status before automated scientific synthesis consumes them.
3. Add curated study-family membership and population/design/endpoint comparisons. Support/contradiction/outcome labels require source locators and human review; never derive negative efficacy from a terminated trial status.
4. Expand molecular paths with verified gene–protein and target–drug mappings. Add direction/tissue/species constraints before more complex mechanistic suggestions. Keep candidate hypotheses separate from assertions and version their input evidence.
5. Build a reviewer workflow, multi-reviewer authorization, metadata-supported aggregate study filters and a real recent-changes feed. Verify mobile and assistive-technology flows at each step.
6. Measure indexed queries and resource limits in independent staging, set distributed quotas and retention budgets, then request production deployment approval. No graph infrastructure change is currently justified by measured workload.
