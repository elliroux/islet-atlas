# Islet Atlas

An open-source research workspace for people investigating the causes, progression and treatment of type 1 diabetes. Families, scientists and developers in the #WeAreNotWaiting community are invited to run a copy, correct evidence and extend the project. This is an independent project.

[Public workspace](https://islet-evidence-atlas.mattepaste.chatgpt.site) · [Contribution guide](CONTRIBUTING.md)

## Run locally

Use Node 22.13 or later and pnpm 11.25.0. Clone this repository or unzip the release, then run these commands in the directory containing package.json.

    pnpm install --frozen-lockfile
    pnpm dev

Open the loopback address printed by the dev server. Browsing, public searches, the curated investigation guide, source comparisons, local notebooks and Markdown export work without a model key. Public literature services require internet access. Use pnpm build for a production build. If you publish a fork, regenerate public/islet-atlas-source.zip from the Git checkout with python3 scripts/community-release.py after staging your files and before building.

## Independent hosting

See [Cloudflare deployment and migration status](CLOUDFLARE.md) for the standalone build, database setup, and remaining migration steps.

## Optional integrations

The [connected research workspace](https://islet-evidence-atlas.mattepaste.chatgpt.site/connections) links PanKgraph, NCATS Translator/ARAX, Europe PMC and ClinicalTrials.gov in a bounded gene-to-drug-to-evidence workflow. No model key is required. Source provenance, query logs, device snapshots and JSON exports are included. See [connector architecture and contribution instructions](research/connectors/README.md) for verified interfaces, tests and current limitations.

The Worker uses vinext, React and Cloudflare D1. For notebook synchronization, bind your own D1 database as DB and apply drizzle/0000_swift_phalanx.sql. The notebook API scopes records by authenticated user. Local drafts also persist in the browser. For a shared deployment, use a trusted identity gateway that strips incoming identity headers and inserts verified identities, or replace app/chatgpt-auth.ts before enabling notebook sync.

Model-assisted research is optional. Set OPENAI_API_KEY privately on your Worker and ATLAS_AI_OWNER_ID to the authorized maintainer’s identity from your gateway. In loopback development the simulated signed-in identity is local_seedy. All three model-backed endpoints use the same check. The default experience works without these settings. Keep keys and research notebooks out of issues and pull requests.

## Evidence and scope

research/corpus.json contains curated records, findings and study families. research/trace-links.json describes checked relationships. The supplement starter and glucose-test cohort comparison illustrate independent investigations. Public searches use PubMed, Europe PMC and ClinicalTrials.gov. Coverage is selective and searches are bounded. Use source locators to check extracted claims. This software supports research and does not provide personal treatment recommendations.

## License

Original Islet Atlas code and original evidence annotations are available under Apache License 2.0 (LICENSE). Dependencies and bundled third-party components retain their respective licenses and notices. Source publications, quoted material and linked datasets remain subject to their own terms. This release contains no participant-level cohort files, notebooks, hosting credentials or private Git history.
