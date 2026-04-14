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
echo "Suggested next commands:"
echo "  gh auth login"
echo "  pnpm --filter @topshelf/web dev"
echo "  pnpm --filter @topshelf/api-server dev"
echo "  pnpm db:migrate"
echo
