# Brewdex on Cloudflare

The existing Next.js application uses OpenNext on Workers. This configuration needs no VPS, Docker, R2 or paid image service. Actual free-plan compatibility still requires a successful upload and live CPU verification; never automatically upgrade plans.

## Releases

Pushing a `v*` tag runs lint, type checking, unit tests, the OpenNext build and a Wrangler dry run, then deploys that exact revision. The `codex/brewdex-cloudflare` branch runs build validation only. Automatic tag creation is not configured.

Deployment requires the GitHub Actions repository secret `CLOUDFLARE_API_TOKEN`, scoped for Workers deployment and the brewdex.app domain. The account ID in wrangler.jsonc is public configuration. Never commit tokens. Existing Supabase migration workflows remain unchanged.

## Invite gate

The outer Worker checks every request before application code or static assets (`run_worker_first`). Both brewdex.app and workers.dev use the same gate. `/healthz` exposes only readiness. Missing configuration returns 503 rather than exposing the site.

Cloudflare runtime secrets:
- `INVITE_CODE`: at least 16 random characters.
- `INVITE_SESSION_SECRET`: at least 32 random bytes.

A valid shared code issues a signed 48-hour, host-only `__Host-brewdex_invite` cookie with Secure, HttpOnly and SameSite=Lax. This is a shared invitation gate, not individual accounts or single-use invitations. Existing application authentication still applies inside it.

POST `/invite/logout` from the same origin clears the session. Rotate INVITE_CODE to change future logins; also rotate INVITE_SESSION_SECRET to revoke all existing sessions. Never put secrets in code, logs or build artifacts.

The native rate limiter allows 10 attempts per IP per minute, approximately per Cloudflare location. Keep the invite code random. All protected responses use private/no-store; do not add cache rules that bypass the Worker.

## Verification

Gate unit tests cover failure-closed configuration, assets and APIs, incorrect/expired/tampered sessions, key rotation, request size, rate limiting, origin validation, redirects and logout. After deployment also verify real code entry, navigation, static assets, cookie persistence and both public hostnames. Passing tests or a dry run alone does not prove production readiness.
