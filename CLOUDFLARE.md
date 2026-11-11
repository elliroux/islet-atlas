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
- Production uses independently verified Cloudflare Access identities and owner-only AI. An unconfigured standalone deployment fails closed for account sync and AI. Never enable the old header-only identity method on a directly accessible Worker.
- Existing browser notebooks belong to the old origin: export JSON there before switching. They do not automatically appear on a new domain.
- The accumulated research collection, full texts, import checkpoints, and run history are migrated to the independent D1 database. See Research update cutover below for the ongoing updater.
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

## Research update cutover

The original hosted research automation is disabled. Research updates run in
the existing independent Worker at 03:00, 09:00, 15:00, and 21:00 in
America/New_York. An hourly Cloudflare trigger selects those local hours,
including daylight saving changes. The existing news refresh still runs every
six hours in UTC.

The Worker enables research updates with `ATLAS_RESEARCH_UPDATES=enabled`.
Each run resumes D1 checkpoints using the same importer as the research API,
with maximum batch counts of atlas 1, recent 10, publications 50, trials 20,
and full text 10. Completed or busy sources stop early. A provider failure is
recorded and does not stop the other sources. The next invocation retries the
saved checkpoint. An expired ClinicalTrials.gov pagination token starts a new
registry scan while retaining stored studies.

The standalone updater script also targets `https://isletatlas.org`.
The original hosted Site retains its research snapshot and returns a migration
notice for research-update POSTs, preventing further writes there.
