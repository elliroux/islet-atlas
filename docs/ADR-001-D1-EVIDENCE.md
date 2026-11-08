# ADR 001: keep the first evidence graph in D1

Status: accepted for this feature branch; production deployment requires approval.

The current workload is a bounded gene neighborhood (80 PanKgraph edges and at most 144 Translator edges) plus a publication/trial collection. Use normalized SQLite tables, directed subject/object indexes, append-only versions and source citations in the existing D1 binding. Keep existing FTS research search. Do not add a graph service before measuring actual query latency, rows scanned, storage and concurrency on a staging workload.

D1 `batch()` provides rollback of the batch if a statement fails; evidence batches and completion records must be committed together. See [Cloudflare's D1 database API](https://developers.cloudflare.com/d1/worker-api/d1-database/). Large migrations use deterministic small batches with durable checkpoints, never one unbounded transaction. Partial runs must not appear as complete discovery evidence.

Entity resolution uses explicit stable IDs and source-provided same-entity bindings; names alone cannot merge entities. Graph sources do not count as studies. Publication references and registry links identify possible overlapping evidence, without asserting independent replication. Source assertions are retained separately from deterministic candidate hypotheses. Contradictory/negated assertions coexist.

Reconsider a separate graph engine only if measured indexed one/two-hop workloads exceed acceptable latency or storage budgets after query tuning. Record those measurements and operational tradeoffs before changing infrastructure.
