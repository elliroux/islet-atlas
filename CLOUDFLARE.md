# Production preparation: isletatlas.org

**Do not merge, apply remote migrations, or deploy without explicit owner approval.** Main is connected to production Workers Builds. This feature branch is for review/staging only. The legacy ChatGPT-hosted site is a research source, never a deployment target for new features.

# Independent Cloudflare deployment

This configuration deploys the public application into the owner's Cloudflare account. The existing ChatGPT-hosted site remains available during migration.

## Workers Builds

- Existing Worker: `islet-atlas`
- Repository: `elliroux/islet-atlas`, branch `main`, root `/`
- Build command: `pnpm run build:cloudflare`
- Deploy command: `pnpm run deploy:cloudflare`
- Use Node 22.13+ and the package.json-pinned pnpm version.

The deploy script first applies pending D1 migrations, then deploys the compiled Worker and assets. The build token needs permission to deploy Workers and edit D1 in this account. Do not paste tokens into source or chat. A failed migration stops deployment.

The DB binding points to `islet-atlas-db`, ID `5d965dbc-66fd-422e-a5b7-594788a26702`. This identifier is not a credential. Forks must supply their own database ID. Migrations create the notebook and research schema, including full-text search. They do not transfer records from the old site.

## Verify before moving the domain

1. Deploy and verify the generated workers.dev address.
2. Open `/`, `/connections`, `/nano-to-macro`, and `/api/research`.
3. Verify research imports, search and source links. Compare migrated collection counts before announcing parity with the existing site.
4. Confirm `/api/notebook` returns 401 even when a request supplies `oai-authenticated-user-id` and `oai-authenticated-user-email` headers.
5. Once ready, add `isletatlas.org` under the Worker's custom domains. Add `www.isletatlas.org` if desired.

## Migration status and limits

- Latest Nano-to-Macro source included from the current hosted source snapshot.
- Public literature exploration and device-local notebooks do not require ChatGPT sign-in.
- `ATLAS_AUTH_MODE=public` intentionally disables gateway-based account sync and maintainer AI access on this deployment. A verified independent identity provider must be installed before enabling those functions. Never enable the old header-only identity method on a directly accessible Worker.
- Existing browser notebooks belong to the old origin: export JSON there before switching. They do not automatically appear on a new domain.
- The live audit found 16,136 publications already in independent D1 versus 26,027 in legacy, plus matching counts of 4,682 trials and 26 findings. Complete record-level parity, import checkpoints, and scheduled update cutover still need verification/migration. The existing research-update automation continues to target the old site until explicitly switched after verification.
- ChatGPT service credentials do not belong in this Cloudflare account. AI credentials and budgets must be configured separately after independent authentication is ready.

## Local validation

    pnpm install --frozen-lockfile
    pnpm exec tsc --noEmit
    node --test tests/standalone-auth.test.mjs
    pnpm run build:cloudflare
    pnpm exec wrangler d1 migrations apply islet-atlas-db --local --config wrangler.jsonc
    pnpm exec wrangler deploy --dry-run --config dist/server/wrangler.json

These checks do not deploy to Cloudflare or modify the remote database.

## Independent sign-in

Create a Cloudflare Access self-hosted application for the exact path
`isletatlas.org/atlas-sign-in`. Use an Allow policy for the intended accounts,
starting with the owner. The Worker verifies the signed Access assertion on this route and stores it
in a host-only, HTTP-only session cookie.
Keep the root path and research API outside this Access application.

Set these runtime variables on the Worker before enabling sign-in. Wrangler uses
`keep_vars` to retain them on builds from GitHub. A standalone build without
Access configured defaults to public access without a signed-in identity.

- `ATLAS_AUTH_MODE=access`
- `ATLAS_ACCESS_ISSUER=https://<team>.cloudflareaccess.com`
- `ATLAS_ACCESS_AUDIENCE` to the application's AUD tag
- `ATLAS_ACCESS_AI_OWNER_EMAIL` to the owner's email from the Access identity provider

Keep `OPENAI_API_KEY` as a Worker secret. Verify signed-out investigations use
the curated guide and owner investigations report model-assisted output. Test
the notebook before enabling other accounts. Independent identities use an
`access:` namespace, so existing ChatGPT notebooks are separate.

## Unified evidence deployment gate

Read [migration and rollback instructions](docs/MIGRATION.md) and [current limitations](docs/PHASE_2_STATUS.md). Migration 0002 adds evidence tables and a history trigger without resetting existing data. Apply and verify it first in an independent staging D1 with its own config/database ID. Never use the production ID for a staging remote command. `pnpm test` covers atomic batches and resumable migration; `pnpm build:cloudflare` and Wrangler `--dry-run` do not publish. The GitHub Actions workflow only tests/builds locally.

After approval, deploy through the existing Cloudflare pipeline, check `/api/evidence?coverage=1`, run a bounded investigation, verify its `persistence.status`, reload `/connections?gene=IL2RA`, and verify notebook authorization. Keep the prior Worker version and verified backup available. If the graph fails, roll back the Worker code while retaining additive tables and research archives. Do not activate the new automation target until actual migration parity passes.
