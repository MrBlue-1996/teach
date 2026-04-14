# TopShelf Teaching

TopShelf Teaching is a pnpm monorepo for the teaching platform, supporting packages, apps, governance artifacts, content packs, and implementation prototypes including the MCP MVP.

## Start Here

- Workspace map: [docs/WORKSPACE_INDEX.md](docs/WORKSPACE_INDEX.md)
- Documentation hub: [docs/README.md](docs/README.md)
- Apps overview: [apps/README.md](apps/README.md)
- Packages overview: [packages/README.md](packages/README.md)
- MCP MVP: [implementations/mcp-server/README.md](implementations/mcp-server/README.md)

## Quick Start

```bash
pnpm install
pnpm test
pnpm build
```

## MVP Quick Start

```bash
pnpm --dir implementations/mcp-server test
pnpm --dir implementations/mcp-server build
pnpm --dir implementations/mcp-server start
```

Then open `http://localhost:3000/mvp` to click through the teaching MVP in a browser.

## Repository Groups

- `apps/` contains user-facing applications.
- `packages/` contains reusable platform packages.
- `implementations/` contains prototypes and focused reference implementations.
- `docs/` contains project and operational documentation.
- `content/` and `content-packs/` contain teaching content assets and pack definitions.
- `governance/` contains merged policy, legal, standards, and repository governance material.
- `scripts/`, `tests/`, `pilot/`, and `infrastructure/` contain operational tooling and validation assets.

## Commands

```bash
pnpm dev
pnpm test
pnpm build
pnpm lint
pnpm typecheck
pnpm validate
```

## License

See [LICENSE](LICENSE).
