# Deployment

## Target

- URL: `https://neuronara.technoir.cloud`
- Runtime: Next.js standalone server (`node server.js`) in `node:24-alpine`, container port `3000`
- Edge: Hostinger VPS (`hoid`) → Traefik (Dokploy) → Swarm service `neuronara` on `dokploy-network`
- Former name: `naramd.technoir.cloud` (the product was called NaraMD) permanently redirects, path and query included, to the new domain through `/etc/dokploy/traefik/dynamic/nara-md.yml` on the VPS. Keep that file for as long as old links may exist
- DNS: `*.technoir.cloud` is a wildcard record pointing at the VPS, so no DNS change is needed

## Local verification

```bash
npm ci
npm test
npm run build && node .next/standalone/server.js   # http://localhost:3000/healthz
```

## Deploy / update

Images are built on the VPS and tagged with the git SHA, like every other site:

```bash
./scripts/deploy.sh              # deploys HEAD of main
```

The script refuses a dirty tree, runs `npm test` and `npm run verify:links` (stops if any external link is wrong or dead), then:

1. Copies the committed tree to `/opt/neuronara/<sha>`.
2. Runs `docker build -t neuronara:<sha>` on the server.
3. Creates the Swarm service the first time, and after that runs `docker service update --image`.
4. Writes the Traefik route to `/etc/dokploy/traefik/dynamic/neuronara.yml` (HTTP→HTTPS redirect, Let's Encrypt).

## Secrets

None. Nothing on the server spends money or needs a key; the only upstream is Europe PMC (open, no key needed). `/api/search` is rate-limited per IP (20 requests per 10 minutes, see `lib/rate-limit.ts`) to stay polite to it.

## Rollback

```bash
ssh hoid 'docker service rollback neuronara'
# or pin a previous build:
ssh hoid 'docker service update --image neuronara:<older-sha> neuronara'
```

## Public checks

```bash
curl -fsS https://neuronara.technoir.cloud/healthz
curl -fsS 'https://neuronara.technoir.cloud/api/search?q=MSLT' | head -c 300
curl -fsS https://neuronara.technoir.cloud/llms.txt | head -5
```
