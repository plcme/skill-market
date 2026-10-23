# Brewdex on Cloudflare

The existing Next.js application uses OpenNext on Workers. This configuration needs no VPS, Docker, R2 or paid image service. Fixture series reuse a bounded in-memory cache and the national ticker is reused across requests to avoid repeated calculations. Verify detail pages and filtered navigation on the live free plan after releases; never automatically upgrade plans.

## Releases

Updates to `main` run lint, type checking, unit tests, the OpenNext build and a Wrangler dry run. After success, the publish job creates the next patch tag (for example v0.1.4 → v0.1.5) and deploys that exact build. Branches and pull requests do not deploy. Existing v* tag pushes also deploy their exact revision. Manual workflow runs validate only. A failed deployment can be retried from Actions without creating another tag. GitHub-generated tags do not start a duplicate workflow; the current publish job performs deployment.

Deployment requires the GitHub Actions repository secret `CLOUDFLARE_API_TOKEN`, scoped to Individual Workers Editor for the `brewdex` Worker. The direct-upload adapter uses the official Cloudflare asset and script upload APIs, preserves runtime secrets, and does not list other Workers or alter domains. The existing custom domain is configured once in the dashboard. Wrangler produces the multipart bundle offline; this avoids its dashboard-config comparison requesting account-wide route metadata. Domain changes require a separate reviewed operation. The account ID in wrangler.jsonc is public configuration. Never commit tokens. Existing Supabase migration workflows remain unchanged.

## Request handling

Wrangler runs the generated OpenNext Worker directly. Cloudflare serves static assets before invoking the application Worker. The deployed site and the standard local Next.js preview use the application's own routing and authentication; there is no separate site-wide access layer.

## Verification

Deployment tests validate scoped upload endpoints, asset routing, required application bindings and authorization failures. After deployment, check that `/` and `/market` return HTTP 200 without a Cookie header, then verify detail pages and filtered navigation in a browser. Existing application authentication remains responsible for private features.
