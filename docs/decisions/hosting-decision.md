# Hosting Decision

## Status

Accepted for v0.1.x.

## Decision

Use Vercel as the first production hosting target for the web app.

The web app lives in apps/web and is built with Next.js. The API, database, Redis, and Supabase-related infrastructure remain separate concerns.

## Why

The shortest path to a reliable public demo is to deploy the Next.js web app on a platform that handles HTTPS, previews, rollbacks, and custom domains with minimal operational overhead.

The goal of the next layer is to prove the TopShelf / Uncle Julio's training experience, not to spend time debugging hosting infrastructure.

## Options Considered

### Vercel

Chosen because it is the fastest path for a Next.js app and gives preview deployments, simple HTTPS, and easy rollback.

### Cloudflare Pages / Workers

Deferred. Cloudflare may be useful later for edge delivery, policy gates, and static assets, but it adds complexity before the product is proven.

### Self-hosted Docker

Deferred for the web app. Docker remains useful for API and infrastructure services, but self-hosting the web app first increases operational burden.

## Constraints

- Do not introduce Firebase.
- Do not expose server secrets through NEXT_PUBLIC variables.
- Do not combine web hosting, API hosting, and database hosting into one unclear deployment model.
- Do not start multi-cloud deployment work during P1.

## Follow-up Tasks

1. Create Vercel deployment checklist.
2. Verify required web environment variables.
3. Confirm NEXT_PUBLIC_API_URL target.
4. Add deployment notes to RUNBOOK.md during production hardening.

## Acceptance Criteria

- Hosting target is documented.
- Vercel is the first web hosting target.
- API and database remain separate production concerns.
- No feature work starts until this decision is merged.

## Success Benchmarks

- Deployment target can be explained in under 2 minutes.
- Web deployment does not block PWA work.
- No server secrets are exposed to the client bundle.

## Definition of Done

This decision is done when merged to main and treated as the default hosting direction for v0.1.x.
