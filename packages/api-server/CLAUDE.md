# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package: `@topshelf/api-server`

Hono-based HTTP API. All business logic routes live in `src/routes/`. Consumed by `apps/web` via REST; not a library package (no `exports` field).

```bash
pnpm test                                    # all tests
pnpm test -- src/routes/learner.test.ts      # single file
pnpm dev                                     # ts-node watch
pnpm build && pnpm start                     # production
pnpm typecheck
```

## Middleware Stack

Applied globally in `src/index.ts` in this order:

```
requestId → secureHeaders → compress → timing → cors → logger(dev-only)
  → rateLimiter → [errorHandler registered via app.onError]
```

Auth is **not** global — each router mounts `authMiddleware()` itself. After auth, context vars available: `c.get('userId')`, `c.get('userRole')`, `c.get('tokenPayload')`.

## Route Structure

```
src/routes/
  auth.ts       # /auth/* — public (login, signup, refresh, logout, verify, oauth)
  learner.ts    # /learner/* — protected; session lifecycle + teaching kernel calls
  content.ts    # /content/* — protected; content pack CRUD
  session.ts    # /session/* — protected; session list/detail
  policy.ts     # /policy/* — protected; policy evaluation
  badge.ts      # /badge/* — protected; badge award/list
  admin.ts      # /admin/* — protected; admin-only (role check inside)
```

Public endpoints not behind auth: `GET /health`, `GET /ready`.

## Adding a Route

1. Create `src/routes/myroute.ts` exporting `createMyRouteRoutes(): Hono`
2. Mount auth middleware at the top of the function before any `.get/.post`
3. Register in `src/index.ts` with `app.route('/myroute', createMyRouteRoutes())`
4. Create `src/routes/myroute.test.ts` — mock `@topshelf/database` at module level (see existing test files for the established mock pattern)

## Testing Pattern

Route tests use Hono's `app.request()` for HTTP-level testing without a live server. The mock setup pattern is consistent across all route test files:

```ts
vi.mock('@topshelf/database', () => ({
  getDatabase: () => mockDb,
  // re-export table objects and operators as plain values
  eq: (...args) => args,
  and: (...args) => args,
  desc: (f) => f,
  // table columns as string placeholders
  learnerStates: { id: 'id', userId: 'userId', ... },
}));

vi.mock('@topshelf/config', () => ({ getConfig: () => ({ environment: 'development' }) }));
```

Always inject the auth context manually in the test `beforeEach`:

```ts
app.use('*', async (c, next) => {
  c.set('userId' as any, 'user-test-1');
  c.set('userRole' as any, 'learner');
  await next();
});
```

## Learner Routes (`/learner/*`)

The most complex router — integrates `@topshelf/engine` directly:

| Route                             | What it does                                                               |
| --------------------------------- | -------------------------------------------------------------------------- |
| `GET /learner/stats`              | Aggregate stats across all user's packs (time, mastery, blocks, sessions)  |
| `GET /learner/states`             | All per-pack learner states                                                |
| `GET /learner/state/:packId`      | Single learner state                                                       |
| `GET /learner/progress/:packId`   | State + last 50 events                                                     |
| `GET /learner/weekly-goal`        | Weekly time target + progress                                              |
| `PATCH /learner/weekly-goal`      | Update weekly target (stored in `users.metadata`)                          |
| `POST /learner/session/start`     | Create session; infers `deviceProfile` via `ConstraintEngine.inferProfile` |
| `POST /learner/session/:id/event` | Record event; runs `TriggerDetector`, persists elevated `teachingMode`     |
| `POST /learner/session/:id/teach` | Reconstruct context from DB, run `PedagogyEngine`, return response         |
| `POST /learner/session/:id/end`   | Mark session completed                                                     |

`/learner/stats` active-pack threshold: `lastActivityAt >= now - 30 days`.

## Error Handling

Use helpers from `src/middleware/error-handler.ts`:

```ts
throw notFound('Resource', id); // 404
throw badRequest('Reason'); // 400
throw unauthorized('Reason'); // 401
throw forbidden('Reason'); // 403
```

Do not `throw new Error(...)` directly in route handlers — it produces an unformatted 500.
