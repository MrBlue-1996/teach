# Future Packages (Phase 2)

These packages are **built but not yet integrated** into the running system. They represent Phase 2 features that are fully implemented at the code level but have zero connections to the live application routes or startup paths.

They remain in the pnpm workspace (via `packages/_future/*`) so they continue to resolve and can be built/tested independently.

## Packages

### client-pwa

**Progressive Web App shell with offline support.**
Duplicates the functionality in `apps/web`. Integration work needed: consolidate with the main web app or replace it, wire up service worker registration, and connect to the live API layer.

### mcp-server

**MCP (Model Context Protocol) integration stub for stateless orchestration and policy evaluation.**
Integration work needed: wire MCP endpoints into the API server's route tree, connect to the policy-engine and nlp packages it depends on, and add authentication middleware.

### policy-engine

**Multi-signal promotion policy engine.**
Currently hardcoded to always return `hold`. Integration work needed: replace the hardcoded decision with real signal evaluation, expose via an API route or integrate into the learning flow, and connect to the content-pack data.

### nlp

**NLP scoring and learner state management.**
Fully built but never wired to any route. Integration work needed: expose NLP scoring through an API endpoint, integrate learner state tracking into the session flow, and connect to the database layer for persistence.

### deterministic-formatter

**Deterministic content formatter ensuring parity between offline and online outputs.**
Fully built and imported by `packages/content-authoring` (which is itself not yet in the live path). Integration work needed: activate the content-authoring pipeline in the live system, which will bring this package along with it.
