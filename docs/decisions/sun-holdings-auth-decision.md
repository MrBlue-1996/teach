# Sun Holdings / Uncle Julio's Authorization Decision

## Status

Pending authorization.

## Decision

TopShelf must not represent that Sun Holdings, Uncle Julio's, UJ Arlington, managers, or cooks have approved, endorsed, piloted, or consented to this product until that authorization is explicitly obtained and recorded.

Current Uncle Julio's references are demo-content context only. They do not grant permission to deploy to a live store, onboard real employees, collect real worker data, use proprietary operational material, or market the product as approved by Sun Holdings or Uncle Julio's.

## What Is Allowed Now

- Internal demo development with synthetic or non-sensitive demo data.
- Static-bundled demo content while authorization is pending.
- Technical readiness work, validation, accessibility, performance, and deployment rehearsal.
- A private conversation with the appropriate authorization owner.

## What Is Not Allowed Yet

- Real cook or manager onboarding.
- Store-floor usage as a pilot.
- Collection of real employee performance, training, or credential data.
- Public claims of Sun Holdings or Uncle Julio's approval.
- Use of non-public Sun Holdings or Uncle Julio's materials unless permission is documented.

## Authorization Gate

Before any external pilot, record:

1. Approving organization and named approver.
2. Scope of permission.
3. Stores, roles, and users covered.
4. Data allowed to be collected.
5. Privacy, consent, retention, and deletion terms.
6. Dates authorization starts and expires.
7. Any brand, trademark, or content-use limits.

Until those details exist, tracker item `X3` remains pending even though this memo satisfies the file-exists gate.

## Operational Impact

- Demo readiness can proceed for internal review.
- Pilot readiness cannot be declared complete.
- `RUNBOOK.md` must keep the unauthorized external pilot risk visible.
- Any agent asked to build pilot onboarding should treat missing authorization as a blocker.
