# neuronara
Clinical neurophysiology reference search with sources one click away and a bring-your-own-AI handoff. Live: https://neuronara.technoir.cloud

## Commands
- Check (before every commit and deploy): `npm test && npm run build`
- Dev: `npm run dev`
- Deploy: `./scripts/deploy.sh` (see `DEPLOYMENT.md`)

## Non-negotiables
1. Every external link is verified (`npm run verify:links`) before deploy: a wrong clinical link is a shipping bug.
2. No server-side LLM: nothing here spends money or needs a secret.
3. `/api/search` stays rate-limited per IP (`lib/rate-limit.ts`).
4. Leave the Next.js block below as is: `next dev` rewrites it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
