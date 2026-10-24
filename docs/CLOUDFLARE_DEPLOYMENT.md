# Brewdex on Cloudflare

The existing Next.js application uses OpenNext on Workers. This configuration needs no VPS, Docker, R2 or paid image service. Fixture series reuse a bounded in-memory cache and the national ticker is reused across requests to avoid repeated calculations. Verify detail pages and filtered navigation on the live free plan after releases; never automatically upgrade plans.

## Releases

Production deploys only when a `v*` tag is pushed, for example `git tag v0.1.9 && git push origin v0.1.9`. The tag must point at a commit on `main`; any other tag fails before deployment. The release run builds that exact revision (lint, type checking, unit tests, the OpenNext build and a Wrangler dry run) and then deploys it. Pushes to `main` or `dev` never deploy; CI still checks them. Manual workflow runs validate only. A failed deployment can be retried from Actions by re-running the tag's workflow.

Deployment requires the GitHub Actions repository secret `CLOUDFLARE_API_TOKEN`, scoped to Individual Workers Editor for the `brewdex` Worker. The direct-upload adapter uses the official Cloudflare asset and script upload APIs, preserves runtime secrets, and does not list other Workers or alter domains. The existing custom domain is configured once in the dashboard. Wrangler produces the multipart bundle offline; this avoids its dashboard-config comparison requesting account-wide route metadata. Domain changes require a separate reviewed operation. The account ID in wrangler.jsonc is public configuration. Never commit tokens. Existing Supabase migration workflows remain unchanged.

## Request handling

Wrangler runs the generated OpenNext Worker directly. Cloudflare serves static assets before invoking the application Worker. The deployed site and the standard local Next.js preview use the application's own routing and authentication; there is no separate site-wide access layer.

## Verification

Deployment tests validate scoped upload endpoints, asset routing, required application bindings and authorization failures. After deployment, check that `/` and `/market` return HTTP 200 without a Cookie header, then verify detail pages and filtered navigation in a browser. Existing application authentication remains responsible for private features.

## Product name

The repository, local development and ordinary previews default to `skill-market`. The release build and the Brewdex Worker set `APP_NAME=Brewdex` for `brewdex.app`; components continue to read the shared app-name configuration.
