const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;

const limits = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(keyId: string): {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
} {
  const now = Date.now();
  const entry = limits.get(keyId);

  if (!entry || now > entry.resetAt) {
    limits.set(keyId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, retryAfter: 0 };
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX - entry.count,
    retryAfter: 0,
  };
}
