#!/usr/bin/env bash
set -euo pipefail

cd /workspaces/teach

export PNPM_HOME=/home/node/.local/share/pnpm
export PATH="${PNPM_HOME}:${PATH}"

mkdir -p "${PNPM_HOME}"

corepack enable
pnpm --version

pnpm config set store-dir /home/node/.local/share/pnpm/store >/dev/null
pnpm install --frozen-lockfile

# Run database migrations (Postgres is healthy before this script runs)
echo "Running database migrations..."
pnpm --dir packages/database db:migrate

# Seed content packs (idempotent — safe to run on every rebuild)
echo "Seeding content packs..."
pnpm --filter @topshelf/database seed || true

if pnpm --filter @topshelf/tests exec playwright --version >/dev/null 2>&1; then
  pnpm --filter @topshelf/tests exec playwright install --with-deps chromium || true
fi

git config --global core.editor "code --wait"
git config --global pull.rebase false
git config --global init.defaultBranch main
git config --global fetch.prune true

echo
echo "Codespace post-create complete."
echo "Timezone: ${TZ:-America/Chicago}"
echo "GitHub CLI: $(gh --version | head -n 1 || true)"
echo "pnpm: $(pnpm --version)"
echo
echo "Services:"
echo "  API Server  → http://localhost:3000"
echo "  Web App     → http://localhost:3001"
echo "  PostgreSQL  → localhost:5432"
echo "  Redis       → localhost:6379"
echo "Suggested next commands:"
echo "  gh auth login"
echo "  pnpm --filter @topshelf/web dev"
echo "  pnpm --filter @topshelf/api-server dev"
echo "  pnpm db:migrate"
echo
