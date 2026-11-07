# Connected research

The `/connections` workspace is the first federated investigation workflow. It starts with one human gene symbol, resolves its Ensembl ID through PanKgraph, retrieves pathway/T1D relations and Translator drug edges, and searches T1D publications and trial registrations. Selecting a candidate reruns the evidence searches with its name. It is a bounded lookup workflow, not an autonomous discovery engine or clinical recommendation service.

## Modules and extension contract

- `pankgraph.ts`: fixed, read-only, bounded openCypher templates. No user-supplied query execution. Direction is taken from the actual edge endpoints. Current graph relationships are retrieved rather than assuming the obsolete `effector_gene` example exists.
- `translator.ts`: TRAPI lookup through ARAX. Returns only edges bound to query results, with original qualifiers, source chains and publication identifiers. Displays 12 candidate entities and up to 12 edges each. Does not expose ranking scores as clinical confidence.
- `literature.ts`: Europe PMC PubMed-indexed metadata and ClinicalTrials.gov v2 records; at most 10 of each. Publication types are reported, not inferred. No full text is redistributed. Stop reasons and registry-linked publication IDs are retained.
- `types.ts`: shared record types, HTTP(S)-only source URLs, per-request deadlines, a 12 MB streamed response ceiling, and query/status logs.
- `investigation.ts`: combines sources without making medical claims. Source failure is distinct from a valid empty response. PubMed IDs deduplicate publications; trial identifiers remain separate and linked references flag potential overlap.

New connectors should return source identifiers, exact queries, retrieval dates, evidence category and explicit incomplete/empty/unavailable status. Preserve upstream direction, species/tissue context, qualifiers, versions and provenance. Never equate a provider assertion with clinical efficacy, or multiple aggregators with independent replication. Keep network calls injectable for failure tests. Use fixed provider endpoints; do not accept caller-provided URLs.

## Persistence and reproducibility

Users can save five snapshots on their device and export JSON containing the displayed evidence, relationships and exact query log. Successful runs may be reused for five minutes within one server isolate; original retrieval timestamps are retained. Four concurrent distinct runs are allowed per isolate. These are modest load controls, not a global rate limiter. These runs are not yet synchronized to the server notebook or permanently ingested into the research collection. Results may change when queries are rerun; exports preserve the retrieved snapshot, not full upstream databases. The interface makes source reuse terms explicit; an accessible API is not a blanket redistribution license.

## Verified interfaces

- PanKgraph: https://pankgraph.org/docs/KG_API
- ARAX: https://arax.ncats.io/overview.html and https://arax.ncats.io/api/arax/v1.4/ui/
- TRAPI: https://ncatstranslator.github.io/TranslatorTechnicalDocumentation/architecture/sri/trapi/
- Europe PMC: https://europepmc.org/RestfulWebService
- ClinicalTrials.gov: https://clinicaltrials.gov/data-api/api

No new credentials or model key are needed. Existing research import automation and hosted-model access are unchanged. Run `node scripts/test-connectors.mjs` for deterministic checks; append `--live` for a bounded IL2RA smoke test, or `--live --candidate` for the candidate-evidence follow-up. Run `node node_modules/typescript/bin/tsc --noEmit` and the normal production build before deployment.

## Deliberate limitations

Single-gene exploration does not discover every T1D pathway. Results use provider ordering and bounded name searches, without exhaustive synonym expansion. No automatic claim-level contradiction extraction, study-family deduplication, approval verification, safety evaluation or causal inference is performed. Human review is required to establish the gene's relevance, drug effect direction, human evidence and testable next steps. Linked Discoveries and MAI-T1D are not connected by this release. Future integrations must verify documented access and reuse terms first.
