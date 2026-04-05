# MCP Server MVP

This package hosts the teaching MVP server and the manual click-through page.

## Entry Points

- `src/index.ts` starts the Express server and exposes the REST API.
- `src/mvp-page.ts` serves the browser-based MVP page.
- `tests/api.test.ts` covers the main request flow end to end.

## Commands

```bash
pnpm --dir implementations/mcp-server test
pnpm --dir implementations/mcp-server build
pnpm --dir implementations/mcp-server start
```

Open `http://localhost:3000/mvp` after starting the server.
