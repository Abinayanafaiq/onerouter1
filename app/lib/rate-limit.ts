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

type LimitResult = { allowed: boolean; remaining: number; retryAfter: number; limit: number };

type Bucket = { store: Map<string, LimitState>; key: string; max: number; windowMs: number };

const authLimits = new Map<string, LimitState>();

/**
 * Fixed-window check across one or more buckets, all-or-nothing:
 * - A rejected request does NOT consume a slot (no counter increment), so
 *   hammering a 429 neither prolongs nor deepens the block.
 * - When several buckets apply (e.g. per-IP + per-email, per-key + per-user),
 *   a slot is only taken from every bucket if ALL of them allow the request.
 *   Previously a request rejected by bucket B had already burned a slot in A.
 */
function consumeBuckets(buckets: Bucket[]): LimitResult {
  const now = Date.now();
  let retryAfter = 0;
  for (const b of buckets) {
    const entry = b.store.get(b.key);
    if (entry && now <= entry.resetAt && entry.count >= b.max) {
      retryAfter = Math.max(retryAfter, Math.ceil((entry.resetAt - now) / 1000));
    }
  }
  if (retryAfter > 0) {
    return { allowed: false, remaining: 0, retryAfter, limit: Math.min(...buckets.map((b) => b.max)) };
  }

  let remaining = Infinity;
  let limit = Infinity;
  for (const b of buckets) {
    const entry = b.store.get(b.key);
    if (!entry || now > entry.resetAt) {
      b.store.set(b.key, { count: 1, resetAt: now + b.windowMs });
      remaining = Math.min(remaining, b.max - 1);
    } else {
      entry.count++;
      remaining = Math.min(remaining, b.max - entry.count);
    }
    limit = Math.min(limit, b.max);
  }
  return { allowed: true, remaining, retryAfter: 0, limit };
}

function checkFixedWindow(
  store: Map<string, LimitState>,
  key: string,
  max: number,
  windowMs: number,
): LimitResult {
  return consumeBuckets([{ store, key, max, windowMs }]);
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
  const result = consumeBuckets([
    { store: authLimits, key: `login-ip:${ip}`, max: LOGIN_IP_MAX, windowMs: LOGIN_WINDOW_MS },
    { store: authLimits, key: `login-email:${email.toLowerCase()}`, max: LOGIN_EMAIL_MAX, windowMs: LOGIN_WINDOW_MS },
  ]);
  return { allowed: result.allowed, retryAfter: result.retryAfter, limit: result.limit };
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

  const ipRetry = ipEntry && now <= ipEntry.resetAt && ipEntry.count >= LOGIN_IP_MAX
    ? Math.ceil((ipEntry.resetAt - now) / 1000)
    : 0;
  const emailRetry = emailEntry && now <= emailEntry.resetAt && emailEntry.count >= LOGIN_EMAIL_MAX
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

/* ============================================================
   Email verification code (register step 1 & 2)
   ------------------------------------------------------------
   - Send: per-email (3/10 min, cukup untuk "kirim ulang") dan
     per-IP (10/jam) supaya endpoint ini tidak bisa dipakai
     meng-spam inbox orang lain.
   - Verify: per-email (5/10 min). 6 digit = 1 juta kombinasi,
     jadi 5 percobaan per masa berlaku kode membuat brute-force
     praktis mustahil tanpa perlu menyimpan state kode di DB.
   ============================================================ */

export const EMAIL_CODE_SEND_EMAIL_MAX = 3;
export const EMAIL_CODE_SEND_IP_MAX = 10;
export const EMAIL_CODE_VERIFY_MAX = 5;
export const EMAIL_CODE_WINDOW_MS = 10 * 60_000;

export function checkEmailCodeSendLimit(email: string, ip: string): {
  allowed: boolean;
  retryAfter: number;
} {
  const result = consumeBuckets([
    {
      store: authLimits,
      key: `emailcode-send:${email.toLowerCase()}`,
      max: EMAIL_CODE_SEND_EMAIL_MAX,
      windowMs: EMAIL_CODE_WINDOW_MS,
    },
    { store: authLimits, key: `emailcode-send-ip:${ip}`, max: EMAIL_CODE_SEND_IP_MAX, windowMs: REGISTER_WINDOW_MS },
  ]);
  return { allowed: result.allowed, retryAfter: result.retryAfter };
}

export function checkEmailCodeVerifyLimit(email: string): {
  allowed: boolean;
  retryAfter: number;
} {
  const result = checkFixedWindow(
    authLimits,
    `emailcode-verify:${email.toLowerCase()}`,
    EMAIL_CODE_VERIFY_MAX,
    EMAIL_CODE_WINDOW_MS,
  );
  return { allowed: result.allowed, retryAfter: result.retryAfter };
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
export function checkOrderCreateLimit(userId: string): LimitResult {
  return checkFixedWindow(limits, `order-create:${userId}`, ORDER_CREATE_RATE_LIMIT, ORDER_CREATE_WINDOW_MS);
}

/**
 * Standard 429 for the order/payment-create endpoints. The body is a generic
 * message — it no longer exposes the bucket size or the exact second-level
 * countdown of the internal window. Only the standard `Retry-After` header is
 * sent (rounded up to whole minutes) so clients can still back off politely.
 */
export function orderCreateRateLimitResponse(rl: LimitResult): Response {
  const minutes = Math.max(1, Math.ceil(rl.retryAfter / 60));
  return Response.json(
    {
      success: false,
      error: `Terlalu banyak membuat pesanan. Silakan coba lagi dalam ${minutes} menit.`,
    },
    { status: 429, headers: { "Retry-After": String(minutes * 60) } },
  );
}

const limits = new Map<string, LimitState>();

function resolveMax(maxPerMinute: number | null | undefined, fallback: number): number {
  return maxPerMinute && Number.isFinite(maxPerMinute) && maxPerMinute > 0
    ? Math.floor(maxPerMinute)
    : fallback;
}

/**
 * Fixed-window in-memory rate limiter, keyed per API key. An optional
 * per-key `maxPerMinute` overrides the default limit (e.g. from ApiKey.rateLimit).
 */
export function checkRateLimit(keyId: string, maxPerMinute?: number | null): LimitResult {
  return checkFixedWindow(limits, keyId, resolveMax(maxPerMinute, DEFAULT_RATE_LIMIT_MAX), RATE_LIMIT_WINDOW_MS);
}

/**
 * Fixed-window in-memory rate limiter, keyed per user. An optional
 * per-user `maxPerMinute` overrides the default limit (e.g. from User.rateLimit).
 * Keyed separately from the per-key limiter so both can be enforced independently.
 */
export function checkUserRateLimit(userId: string, maxPerMinute?: number | null): LimitResult {
  if (!maxPerMinute || !Number.isFinite(maxPerMinute) || maxPerMinute <= 0) {
    return { allowed: true, remaining: Infinity, retryAfter: 0, limit: Infinity };
  }
  return checkFixedWindow(limits, `user:${userId}`, Math.floor(maxPerMinute), RATE_LIMIT_WINDOW_MS);
}

/**
 * Per-key AND per-user limit for the chat completion endpoints, checked
 * atomically: a request rejected by one bucket does not consume a slot in the
 * other. Callers should answer a rejection with one generic 429 (only
 * `Retry-After`) so the response does not reveal which bucket was hit.
 */
export function checkKeyAndUserRateLimit(
  keyId: string,
  keyMaxPerMinute: number | null | undefined,
  userId: string,
  userMaxPerMinute: number | null | undefined,
): LimitResult {
  const buckets: Bucket[] = [
    {
      store: limits,
      key: keyId,
      max: resolveMax(keyMaxPerMinute, DEFAULT_RATE_LIMIT_MAX),
      windowMs: RATE_LIMIT_WINDOW_MS,
    },
  ];
  if (userMaxPerMinute && Number.isFinite(userMaxPerMinute) && userMaxPerMinute > 0) {
    buckets.push({
      store: limits,
      key: `user:${userId}`,
      max: Math.floor(userMaxPerMinute),
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
  }
  return consumeBuckets(buckets);
}
