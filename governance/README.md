# Governance

This directory is the canonical home for policy, legal, standards, and repository governance artifacts.

## Areas

- `ci/` for CI-related governance.
- `constraints/` for enforceable constraints.
- `legal/` for privacy, terms, and other legal texts.
- `policies/` for policy configuration and governance policies.
- `repo/` for repository governance controls.
- `standards/` for brand and organization standards.
- `schemas/` for governance schemas.

## Structure

```mermaid
flowchart TD
	Governance[governance/] --> Policies[policies/]
	Governance --> Legal[legal/]
	Governance --> Standards[standards/]
	Governance --> Constraints[constraints/]
	Governance --> Schemas[schemas/]
	Governance --> Repo[repo/]
	Governance --> CI[ci/]
```

## Indexing Notes

- Start here for rules and control definitions rather than runtime code.
- This directory replaces the former top-level `policy/`, `legal/`, and `tss/` roots.

## Related Indexes

- [policies/README.md](policies/README.md)
- [legal/README.md](legal/README.md)
- [standards/README.md](standards/README.md)
