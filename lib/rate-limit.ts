// Caps search per client so a public deployment cannot hammer Europe PMC.
// ponytail: in-memory fixed window, per process. Resets on deploy and doesn't share across replicas;
// move to Redis (already running under Dokploy) if Neuronara ever runs more than one replica.

const hits = new Map<string, { count: number; reset: number }>();

export function allow(key: string, limit = 20, windowMs = 10 * 60_000): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    if (hits.size > 10_000) hits.clear(); // bound memory under a flood of unique IPs
    hits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  return ++h.count <= limit;
}

export const clientIp = (h: Headers) => h.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
