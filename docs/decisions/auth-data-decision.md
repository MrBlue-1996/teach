# Auth and Data Decision

## Status

Accepted for v0.1.x.

## Decision

Use the existing repo architecture:

- Custom JWT authentication
- Drizzle-managed PostgreSQL data layer
- Supabase browser client only where already present
- Zustand for web auth/session state where already implemented

Do not introduce Firebase Auth or Firestore.

## Why

The repo baseline confirms that the current project does not use Firebase. Adding Firebase now would create a second auth system, a second data model, and unnecessary confusion for future agents.

The correct move is to validate the current auth/data path, not replace it.

## Architecture

API requests use Bearer JWT authentication:

Authorization: Bearer accessToken

JWTs must carry user identity, role, organization context, session identity, issued time, and expiration.

Protected data must be owned by the API/database layer. UI checks are allowed for usability, but they are not security.

## Tenant Isolation Rule

A user must not read, write, or infer another tenant's learner progress.

Tenant isolation must be enforced by API and database queries, not only by React components.

## Explicit Non-Decisions

The following are not approved for v0.1.x:

- Firebase Auth
- Firestore
- Supabase Auth replacement
- client-only tenant isolation
- unscoped learner progress queries
- role checks only in UI

## Follow-up Tasks

1. Document token lifecycle.
2. Verify login, logout, refresh, and session recovery behavior.
3. Confirm learner progress persistence.
4. Add tenant isolation tests before manager sign-off features.
5. Audit environment variables.

## Acceptance Criteria

- Auth/data stack is documented.
- Firebase and Firestore are explicitly excluded.
- API/database ownership of protected data is clear.
- Tenant isolation is identified as a hard gate.

## Success Benchmarks

- No future agent suggests Firebase for this repo.
- Protected data does not rely on UI-only checks.
- P1 auth work validates the current system instead of replacing it.

## Definition of Done

This decision is done when merged to main and all future auth/data work follows custom JWT plus Drizzle/Postgres unless a later decision replaces it.
