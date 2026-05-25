# Production Deploy Checklist — P1.5.1

Target: Vercel (see `docs/decisions/hosting-decision.md`)
App: `apps/web` (Next.js)

## 1. Pre-Deploy Environment Variables

Set these in the Vercel project dashboard (Settings > Environment Variables).
Do NOT copy real values into this file; see `.env.example` for variable names and shapes.

| Variable                        | Notes                                                             |
| ------------------------------- | ----------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`           | Production API base URL, e.g. `https://api.yourdomain.com/api/v1` |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL (public, safe for client)                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public, safe for client)                       |
| `NODE_ENV`                      | Set to `production`                                               |

Server-only variables (not `NEXT_PUBLIC_`) are not needed by the web app itself; they belong to the API deployment.

## 2. Build Verification

Run locally before deploying:

```bash
pnpm --filter @topshelf/web build
```

Build must exit 0 with no type errors. Fix all errors before proceeding.

## 3. Deploy to Vercel

### Option A — Vercel CLI

```bash
pnpm dlx vercel --prod
```

Follow prompts: link to existing project or create a new one, confirm `apps/web` as the root directory, confirm framework as Next.js.

### Option B — Git-connected deploy

1. Push the branch to GitHub.
2. Open the Vercel dashboard and confirm the deployment triggered.
3. Review the build log for any env var warnings.
4. Promote the preview deployment to production once smoke tests pass.

## 4. Custom Domain + SSL

1. In Vercel dashboard: Settings > Domains.
2. Add your custom domain (e.g. `app.topshelfteaching.com`).
3. Follow Vercel's DNS instructions (add CNAME or A record at your registrar).
4. Wait for DNS propagation (typically under 10 minutes on Vercel).
5. Confirm Vercel shows the domain as "Valid Configuration" with a green SSL badge.
6. Open `https://your-domain.com` in a browser and confirm HTTPS padlock.

## 5. Post-Deploy Smoke Tests

Open each URL and confirm it loads without errors:

- [ ] `https://your-domain.com/` — app shell loads
- [ ] `https://your-domain.com/manifest.json` — JSON manifest is served (check `name`, `icons`, `start_url`)
- [ ] `https://your-domain.com/auth/login` — login page renders
- [ ] `https://your-domain.com/kitchen` — kitchen home renders with pack list
- [ ] On a real phone: open URL in Chrome, confirm "Add to Home Screen" / install banner appears
