const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 60;

const limits = new Map<string, { count: number; resetAt: number }>();

/**
 * Fixed-window in-memory rate limiter, keyed per API key. An optional
 * per-key `maxPerMinute` overrides the default limit (e.g. from ApiKey.rateLimit).
 */
export function checkRateLimit(
  keyId: string,
  maxPerMinute?: number | null,
): {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
  limit: number;
} {
  const max =
    maxPerMinute && Number.isFinite(maxPerMinute) && maxPerMinute > 0
      ? Math.floor(maxPerMinute)
      : DEFAULT_RATE_LIMIT_MAX;

  const now = Date.now();
  const entry = limits.get(keyId);

  if (!entry || now > entry.resetAt) {
    limits.set(keyId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: max - 1, retryAfter: 0, limit: max };
  }

  entry.count++;
  if (entry.count > max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      limit: max,
    };
  }

  return {
    allowed: true,
    remaining: max - entry.count,
    retryAfter: 0,
    limit: max,
  };
}
