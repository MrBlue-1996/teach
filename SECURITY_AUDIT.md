# Security Audit Report - TopShelf Teaching Platform

**Audit Date:** 2026-03-25
**Auditor:** Team Delta - Security Hardening
**Scope:** Full codebase audit of the TopShelf Teaching monorepo
**Commit Base:** Current working tree

---

## Executive Summary

The TopShelf Teaching platform has a solid security foundation with proper use of Drizzle ORM (preventing SQL injection), Zod validation on most endpoints, bcrypt with adequate rounds, and JWT implementation using `jose`. However, several issues were identified ranging from critical (excessive token lifetimes, broken logout, missing IDOR protection) to medium (missing security headers, localStorage token storage). Seven issues were fixed directly; two require architectural changes and are documented as recommendations.

**Findings by Severity:**

- CRITICAL: 2 (both fixed)
- HIGH: 4 (3 fixed, 1 requires architectural change)
- MEDIUM: 4 (2 fixed, 2 documented)
- LOW: 3 (1 fixed, 2 documented)

---

## Findings

### FINDING-01: JWT Access Token Expiry Far Too Long (24 hours)

- **Severity:** CRITICAL
- **Status:** FIXED
- **File:** `packages/config/src/index.ts:59`
- **Also:** `.env.example:54`

**Description:** The default JWT access token expiry was set to `24h`. Access tokens should be short-lived (15 minutes or less) because they cannot be revoked once issued. A 24-hour window means a stolen token provides a full day of unauthorized access.

**Fix Applied:** Changed default from `24h` to `15m` in both the config schema and `.env.example`.

---

### FINDING-02: Logout Endpoint Does Not Revoke Session

- **Severity:** CRITICAL
- **Status:** FIXED
- **File:** `packages/api-server/src/routes/auth.ts:259-271` (original)

**Description:** The `/auth/logout` endpoint was a no-op. It accepted the request, ignored the token entirely, and returned success. This means:

- Refresh tokens remained valid after "logout"
- Sessions were never revoked in the database
- A stolen refresh token could be used indefinitely

**Fix Applied:** The logout endpoint now decodes the bearer token, looks up the associated session, and sets `revokedAt` to invalidate it. The refresh endpoint already checks for `revokedAt`, so this properly kills the session.

---

### FINDING-03: No Refresh Token Rotation

- **Severity:** HIGH
- **Status:** FIXED
- **File:** `packages/api-server/src/routes/auth.ts:208-254` (original)

**Description:** When a client uses a refresh token to get new tokens, the old session (and thus refresh token) remained valid. This means a stolen refresh token could be used alongside the legitimate one indefinitely without detection.

**Fix Applied:** The refresh endpoint now:

1. Revokes the old session (`revokedAt = now`)
2. Creates a new session with a new session ID
3. Issues new tokens bound to the new session

This implements proper refresh token rotation. If an attacker replays an old refresh token, it will fail because the session is revoked, and the legitimate user will know their session was compromised when their next refresh fails.

---

### FINDING-04: Error Handler Leaks Stack Traces and Internal Error Messages

- **Severity:** HIGH
- **Status:** FIXED
- **File:** `packages/api-server/src/middleware/error-handler.ts:126-139` (original)

**Description:** For unhandled/unknown errors, the error handler included `err.message` and `err.stack` in the JSON response when `NODE_ENV=development`. While this is development-only, it is dangerous because:

- Development environments are often internet-accessible (staging, preview deployments)
- Stack traces reveal file paths, dependency versions, and internal architecture
- Error messages from database drivers can leak schema details

**Fix Applied:** The catch-all error handler now always returns a generic message. The error is still logged server-side (via `console.error`) for debugging.

---

### FINDING-05: Badge Detail Endpoint Missing Ownership Check (IDOR)

- **Severity:** HIGH
- **Status:** FIXED
- **File:** `packages/api-server/src/routes/badge.ts:53-74` (original)

**Description:** The `GET /badge/:badgeId` endpoint returned full badge details (including the entire `contentPack` relation) for any badge ID, regardless of whether it belonged to the authenticated user. Any authenticated user could enumerate and view all badges in the system by iterating UUIDs. The `/verify/:hash` endpoint already provides a safe public view.

**Fix Applied:** Added `eq(badges.userId, userId)` to the query and restricted the `contentPack` columns to only `title` and `certificationTarget`.

---

### FINDING-06: Admin Role Update Accepts Arbitrary Strings

- **Severity:** HIGH
- **Status:** FIXED
- **File:** `packages/api-server/src/routes/admin.ts:126-129` (original)

**Description:** The `PATCH /admin/users/:userId` endpoint validated `role` as `z.string().optional()`, allowing any arbitrary string to be written into the role column. While the database uses a PostgreSQL enum that would reject invalid values, relying on database constraints for input validation is a defense-in-depth failure. An attacker with admin access could potentially escalate privileges if the DB enum were ever relaxed.

**Fix Applied:** Changed to `z.enum(['learner', 'instructor', 'content_author', 'school_admin', 'district_admin', 'system_admin']).optional()` to match the database enum exactly.

---

### FINDING-07: Auth Tokens Stored in localStorage (XSS Vulnerable)

- **Severity:** MEDIUM
- **Status:** DOCUMENTED (architectural change required)
- **Files:**
  - `apps/web/src/hooks/use-auth.ts:26,40-41,58-59`
  - `apps/web/src/stores/auth-store.ts:14-31`
  - `apps/web/src/lib/api/client.ts:42-45`

**Description:** Both the `useAuth` hook and the `useAuthStore` Zustand store persist JWT access and refresh tokens in `localStorage`. Any XSS vulnerability anywhere in the application (including third-party scripts) would allow an attacker to exfiltrate these tokens and impersonate the user from any device.

**Recommended Fix (not implemented - architectural change):**

1. Move token handling to the API server: set tokens as `httpOnly`, `Secure`, `SameSite=Strict` cookies
2. Add a CSRF token mechanism (double-submit cookie pattern) since cookies are now sent automatically
3. Remove all `localStorage.getItem/setItem` calls for tokens from the frontend
4. The API client should stop setting `Authorization` headers manually; cookies handle auth automatically

---

### FINDING-08: Missing Security Headers on Next.js Frontend

- **Severity:** MEDIUM
- **Status:** FIXED
- **File:** `apps/web/next.config.js`

**Description:** The Next.js configuration had no security headers configured. Missing headers included:

- `X-Content-Type-Options` (MIME sniffing prevention)
- `X-Frame-Options` (clickjacking prevention)
- `Referrer-Policy` (referrer leakage prevention)
- `Permissions-Policy` (API access restriction)

**Fix Applied:** Added a `headers()` function to `next.config.js` that sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

---

### FINDING-09: .gitignore Missing Coverage for Credential Files

- **Severity:** MEDIUM
- **Status:** FIXED
- **File:** `.gitignore`

**Description:** The `.gitignore` covered `.env`, `.env.local`, and `.env.*.local` but did not cover:

- `.env.production`, `.env.staging`, `.env.development` (non-`.local` variants)
- Private key files (`*.pem`, `*.key`, `*.p12`, `*.pfx`)
- Common credential files (`credentials.json`, `service-account.json`)

**Fix Applied:** Added patterns for all the above.

---

### FINDING-10: In-Memory Rate Limiter Not Suitable for Production

- **Severity:** MEDIUM
- **Status:** DOCUMENTED (architectural change required)
- **File:** `packages/api-server/src/middleware/rate-limiter.ts:15`

**Description:** The rate limiter uses an in-memory `Map` for tracking request counts. The code itself contains a comment acknowledging this: "use Redis in production". In a multi-instance deployment:

- Each instance has its own counter, so the effective rate limit is multiplied by the number of instances
- Memory grows unboundedly with unique client IPs until the 60-second cleanup runs
- Server restarts clear all rate limit state

Additionally, the rate limiter runs _after_ CORS middleware but _before_ auth middleware (line 78 of `src/index.ts`), meaning `c.get('userId')` at line 38 of `rate-limiter.ts` will always be `undefined` for the global middleware, and rate limiting falls back to IP-based only.

**Recommended Fix:**

1. Use Redis (already in the config schema) for distributed rate limit storage
2. Add stricter per-endpoint rate limits for sensitive endpoints (`/auth/login`, `/auth/register`, `/auth/forgot-password`) to prevent brute force and credential stuffing attacks — the current global limit of 100/minute is too permissive for auth endpoints

---

### FINDING-11: No Account Lockout on Failed Login Attempts

- **Severity:** LOW
- **Status:** DOCUMENTED
- **File:** `packages/api-server/src/routes/auth.ts:142-203`

**Description:** The login endpoint has no mechanism to track or limit failed authentication attempts per account. An attacker can attempt unlimited password guesses against any email address, constrained only by the global rate limit (100 requests/minute, and per-IP only, easily bypassed with distributed IPs).

**Recommended Fix:**

1. Track failed login attempts per email in Redis with a TTL
2. After N failed attempts (e.g., 5), require a CAPTCHA or lock the account temporarily
3. Consider progressive delays (1s, 2s, 4s, 8s...) for repeated failures

---

### FINDING-12: Password Reset Not Implemented

- **Severity:** LOW
- **Status:** DOCUMENTED
- **File:** `packages/api-server/src/routes/auth.ts:303-317`

**Description:** The `/auth/reset-password` endpoint throws `badRequest('Password reset not fully implemented')`. The `/auth/forgot-password` endpoint generates a token but has a `TODO` comment about storing it and sending the email. This is incomplete functionality rather than a vulnerability per se, but it means:

- Users cannot recover accounts if they forget their password
- The forgot-password endpoint silently discards the reset token

No fix needed now, but this should be prioritized before production launch.

---

### FINDING-13: Admin Users List Not Scoped by Organization

- **Severity:** LOW
- **Status:** DOCUMENTED
- **File:** `packages/api-server/src/routes/admin.ts:66-86`

**Description:** The `GET /admin/users` endpoint has a comment "System admins see all, others see only their org" but the actual implementation returns all users for all admin roles (school_admin, district_admin, system_admin) without any organization filtering. A `school_admin` for Organization A can see all users across all organizations.

**Recommended Fix:** Add organization-based filtering for non-system_admin roles:

```typescript
const conditions = [];
if (userRole !== 'system_admin') {
  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, c.get('userId')),
    columns: { organizationId: true },
  });
  if (currentUser?.organizationId) {
    conditions.push(eq(users.organizationId, currentUser.organizationId));
  }
}
```

---

## Areas Reviewed - No Issues Found

### SQL Injection Protection

All database queries use Drizzle ORM's query builder or parameterized tagged template literals (in `packages/database/src/index.ts:65` for health checks). No string concatenation in queries was found. The `sql` template tag used in `admin.ts:36-50` is safe as it uses Drizzle's parameterized template literals.

### Input Validation

All user-facing POST/PATCH endpoints use `zValidator` with Zod schemas. Query parameters are validated where used (`content.ts:44`). No endpoints accept raw `c.req.body()` without validation.

### XSS Prevention

- No usage of `dangerouslySetInnerHTML` anywhere in the frontend
- No `eval()` or `Function()` usage in any source file
- React's default JSX escaping handles all user content rendering
- All user content in the frontend goes through React's built-in XSS protections

### CORS Configuration

CORS origins are loaded from `config.auth.allowedOrigins` (not hardcoded to `*`). The default is `['http://localhost:3000']` which is appropriate for development. Credentials are enabled properly. Production deployments must set `ALLOWED_ORIGINS` to the actual frontend domain.

### Password Security

- bcrypt with 12 rounds (default) - exceeds the minimum recommendation of 10
- Password validation requires: 8+ chars, uppercase, lowercase, number, special character
- Password hash is explicitly excluded from API responses (`admin.ts:116`)
- Timing-safe comparison for OAuth state validation (`auth/src/index.ts:348-357`)

### JWT Implementation

- Uses `jose` library (well-maintained, standards-compliant)
- HS256 algorithm with minimum 32-character secret enforced by Zod schema
- Issuer and audience claims are set and verified
- Access and refresh tokens use different audiences (`topshelf-api` vs `topshelf-refresh`)
- Token payload is validated with Zod after decoding
- Refresh token includes a `type: 'refresh'` claim that is verified

### Session Management

- Session IDs generated with `crypto.getRandomValues(32)` - cryptographically secure
- Sessions stored in database with expiry, revocation tracking, and IP/UA logging
- Refresh endpoint checks both session existence and expiry

### Secrets Management

- No hardcoded secrets in any source file
- `.env.example` contains only placeholder values (`your-secure-database-password`, `your-256-bit-secret-key-here-minimum-32-chars`)
- JWT secret has a minimum length of 32 characters enforced at config validation time
- `ConfigurationManager.redactSensitive()` properly redacts sensitive keys from log output
- No `NEXT_PUBLIC_` environment variables expose secrets (only `NEXT_PUBLIC_API_URL`)

### Authentication Middleware

- All protected routes are properly gated behind `authMiddleware()` (line 126 of `src/index.ts`)
- Role-based access control is correctly implemented for admin routes
- Content creation requires explicit role authorization

### Error Handling

- Custom error classes prevent leaking internal details
- Login failure messages are generic ("Invalid email or password") preventing user enumeration
- Forgot-password always returns success regardless of email existence

---

## Summary of Changes Made

| File                                                  | Change                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| `packages/config/src/index.ts`                        | JWT expiry default: `24h` -> `15m`                           |
| `.env.example`                                        | JWT expiry: `24h` -> `15m`                                   |
| `packages/api-server/src/middleware/error-handler.ts` | Removed stack trace and raw error message from 500 responses |
| `packages/api-server/src/routes/auth.ts`              | Implemented session revocation on logout                     |
| `packages/api-server/src/routes/auth.ts`              | Implemented refresh token rotation                           |
| `packages/api-server/src/routes/admin.ts`             | Role field now validated against enum                        |
| `packages/api-server/src/routes/badge.ts`             | Badge detail endpoint scoped to current user                 |
| `apps/web/next.config.js`                             | Added security headers                                       |
| `.gitignore`                                          | Added patterns for credential/key files                      |

---

## Recommendations for Future Work

1. **Move tokens to httpOnly cookies** (FINDING-07) - Highest priority architectural change
2. **Implement Redis-backed rate limiting** (FINDING-10) - Required before multi-instance deployment
3. **Add per-endpoint rate limits** for auth endpoints (5-10 req/min for login, register, forgot-password)
4. **Implement account lockout** (FINDING-11) - Track failed attempts in Redis
5. **Complete password reset flow** (FINDING-12) - Required before production
6. **Add organization scoping** to admin endpoints (FINDING-13)
7. **Add Content-Security-Policy header** - Requires careful configuration based on CDN and asset hosting
8. **Implement audit logging** for security-sensitive operations (login, role changes, session revocation) - the `audit_logs` table exists but is not being written to
9. **Add CSRF protection** when migrating to cookie-based auth
10. **Consider adding `nbf` (not-before) claim** to JWTs to prevent token pre-dating attacks
