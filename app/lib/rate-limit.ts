const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 60;

/* ============================================================
   Auth brute-force protection (login & register)
   ------------------------------------------------------------
   Two complementary buckets per attempt:

   - Per-IP bucket: caps total attempts from one source IP across
     ALL email targets. Stops an attacker trying many different
     emails/passwords from a single host.
   - Per-email bucket (login only): caps attempts against one
     specific email regardless of source IP. Stops a distributed
     brute-force against a single account.

   Both use the same fixed-window mechanism as the chat limiter.
   The window is longer (10 min for login, 1 hour for register)
   because auth attempts are low-frequency but high-risk.
   ============================================================ */

export const LOGIN_IP_MAX = 10;
export const LOGIN_EMAIL_MAX = 5;
export const LOGIN_WINDOW_MS = 10 * 60_000;

export const REGISTER_IP_MAX = 5;
export const REGISTER_WINDOW_MS = 60 * 60_000;

type LimitState = { count: number; resetAt: number };

const authLimits = new Map<string, LimitState>();

function checkFixedWindow(
  store: Map<string, LimitState>,
  key: string,
  max: number,
  windowMs: number,
): { allowed: boolean; remaining: number; retryAfter: number; limit: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
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
 * Enforce login rate limits: per-IP + per-email. The strictest failure wins.
 * Call BEFORE validating credentials so every attempt (success or fail) is
 * counted — this is intentional. A successful login still consumes a slot,
 * which is acceptable since legit users don't retry 10x in 10 minutes.
 *
 * Returns the failed bucket first so the error message can hint which limit
 * was hit (without leaking the email itself).
 */
export function checkLoginRateLimit(ip: string, email: string): {
  allowed: boolean;
  retryAfter: number;
  limit: number;
} {
  const ipResult = checkFixedWindow(authLimits, `login-ip:${ip}`, LOGIN_IP_MAX, LOGIN_WINDOW_MS);
  if (!ipResult.allowed) return { allowed: false, retryAfter: ipResult.retryAfter, limit: ipResult.limit };

  const emailResult = checkFixedWindow(authLimits, `login-email:${email.toLowerCase()}`, LOGIN_EMAIL_MAX, LOGIN_WINDOW_MS);
  if (!emailResult.allowed) return { allowed: false, retryAfter: emailResult.retryAfter, limit: emailResult.limit };

  return { allowed: true, retryAfter: 0, limit: LOGIN_IP_MAX };
}

/**
 * Read-only peek at the current login rate-limit state for a (ip, email)
 * pair. Does NOT increment the counter — used by the login server action to
 * surface a "try again in N minutes" message AFTER `authorize` has already
 * thrown `RateLimitError` (which did the incrementing). Without this, the
 * user-facing error would be generic ("rate limited") with no retry hint.
 *
 * Returns `retryAfter` in seconds (0 if not currently rate-limited).
 */
export function peekLoginRateLimit(ip: string, email: string): {
  rateLimited: boolean;
  retryAfter: number;
} {
  const now = Date.now();
  const ipEntry = authLimits.get(`login-ip:${ip}`);
  const emailEntry = authLimits.get(`login-email:${email.toLowerCase()}`);

  const ipRetry = ipEntry && now <= ipEntry.resetAt && ipEntry.count > LOGIN_IP_MAX
    ? Math.ceil((ipEntry.resetAt - now) / 1000)
    : 0;
  const emailRetry = emailEntry && now <= emailEntry.resetAt && emailEntry.count > LOGIN_EMAIL_MAX
    ? Math.ceil((emailEntry.resetAt - now) / 1000)
    : 0;

  const retryAfter = Math.max(ipRetry, emailRetry);
  return { rateLimited: retryAfter > 0, retryAfter };
}

/**
 * Enforce register rate limit: per-IP only. Email isn't known until the
 * user submits, and we don't want to leak "is this email already rate-
 * limited?" info. One IP can register up to REGISTER_IP_MAX accounts per
 * hour — generous for legit users (multi-account household), tight enough
 * to block mass-account creation.
 */
export function checkRegisterRateLimit(ip: string): {
  allowed: boolean;
  retryAfter: number;
  limit: number;
} {
  const result = checkFixedWindow(authLimits, `register-ip:${ip}`, REGISTER_IP_MAX, REGISTER_WINDOW_MS);
  return { allowed: result.allowed, retryAfter: result.retryAfter, limit: result.limit };
}

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
