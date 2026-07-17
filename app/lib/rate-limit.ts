const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 60;

/**
 * Max order/payment-create requests a single user may make per 3-minute
 * window, shared across ALL payment endpoints (QRIS, BSC, BTCPay, manual,
 * wallet top-ups). Uses a dedicated key namespace (`order-create:<userId>`)
 * so it does not collide with the per-user chat rate limit (`user:<userId>`).
 */
export const ORDER_CREATE_RATE_LIMIT = 4;
export const ORDER_CREATE_WINDOW_MS = 3 * 60_000;

/** Per-user order-create rate limit (shared bucket across all 6 endpoints). */
export function checkOrderCreateLimit(userId: string) {
  const max = ORDER_CREATE_RATE_LIMIT;
  const key = `order-create:${userId}`;
  const now = Date.now();
  const entry = limits.get(key);

  if (!entry || now > entry.resetAt) {
    limits.set(key, { count: 1, resetAt: now + ORDER_CREATE_WINDOW_MS });
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

/**
 * Fixed-window in-memory rate limiter, keyed per user. An optional
 * per-user `maxPerMinute` overrides the default limit (e.g. from User.rateLimit).
 * Keyed separately from the per-key limiter so both can be enforced independently.
 */
export function checkUserRateLimit(
  userId: string,
  maxPerMinute?: number | null,
): {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
  limit: number;
} {
  if (!maxPerMinute || !Number.isFinite(maxPerMinute) || maxPerMinute <= 0) {
    return { allowed: true, remaining: Infinity, retryAfter: 0, limit: Infinity };
  }

  const max = Math.floor(maxPerMinute);
  const key = `user:${userId}`;
  const now = Date.now();
  const entry = limits.get(key);

  if (!entry || now > entry.resetAt) {
    limits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
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
