type Bucket = { tokens: number; last: number };

export type RateLimitConfig = {
  windowMs: number;
  max: number;
};

function now() {
  return Date.now();
}

function getStore(): Map<string, Bucket> {
  const g = globalThis as any;
  if (!g.__ss_rate_limit_store) g.__ss_rate_limit_store = new Map<string, Bucket>();
  return g.__ss_rate_limit_store as Map<string, Bucket>;
}

export function getClientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim();
  const xr = req.headers.get("x-real-ip");
  if (xr) return xr.trim();
  return "unknown";
}

export function rateLimit(req: Request, key: string, cfg: RateLimitConfig): { ok: boolean; retryAfterSec?: number } {
  const store = getStore();
  const ip = getClientIp(req);
  const k = `${key}:${ip}`;
  const t = now();

  const b = store.get(k) ?? { tokens: cfg.max, last: t };
  const elapsed = t - b.last;
  b.last = t;

  // token bucket refill
  const refillPerMs = cfg.max / cfg.windowMs;
  b.tokens = Math.min(cfg.max, b.tokens + elapsed * refillPerMs);

  if (b.tokens < 1) {
    const deficit = 1 - b.tokens;
    const retryAfterMs = Math.ceil(deficit / refillPerMs);
    store.set(k, b);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  b.tokens -= 1;
  store.set(k, b);
  return { ok: true };
}

