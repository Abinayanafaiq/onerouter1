import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "@auth/core/errors";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { ADMIN_EMAIL } from "./constants";
import { checkLoginRateLimit } from "./rate-limit";
import { getClientIp } from "./proxy-utils";
import { getAdmin2FASettings, verifyAdmin2FAAnswer } from "./admin-2fa";

/**
 * Custom error thrown by `authorize` when the per-IP or per-email brute-force
 * bucket is exhausted. Extends `CredentialsSignin` so NextAuth propagates it
 * through the normal error pipeline (URL `?error=CredentialsSignin&code=...`
 * for browser flows, or as a thrown error for `signIn` called from server
 * actions). The login server action catches this specifically to render a
 * "rate limited" message instead of the generic "invalid credentials" one.
 *
 * NOTE: The `code` field ends up in the URL — keep it short and non-sensitive.
 * The retry-after value is NOT included here; it would leak timing info to an
 * attacker probing the endpoint directly. The server action re-peeks the
 * rate-limit state to obtain `retryAfter` for the user-facing message.
 */
class RateLimitError extends CredentialsSignin {
  code = "rate_limited";
}

/**
 * Thrown when an admin user has 2FA configured but no `securityAnswer`
 * credential was supplied with the sign-in attempt. The login server action
 * catches this to transition the client form from "step 1: password" to
 * "step 2: security question" — it surfaces the question text to the user
 * and re-submits with the answer included.
 *
 * This error does NOT consume a rate-limit slot by itself: the credential
 * check (password) succeeded, so we don't want to penalize the admin for
 * the normal 2-step flow. The slot is consumed only when the answer is
 * actually checked (and potentially fails) — see Admin2FAFailedError.
 *
 * The question text is attached via `cause` rather than `code` to avoid
 * putting it in the URL (it could be long or contain spaces). The server
 * action reads it via `(err as Admin2FARequiredError).question`.
 */
class Admin2FARequiredError extends CredentialsSignin {
  code = "admin_2fa_required";
  question: string;
  constructor(question: string) {
    super();
    this.question = question;
  }
}

/**
 * Thrown when the admin provided a security answer that does NOT match the
 * stored hash. This DOES consume a rate-limit slot (counted in the authorize
 * flow before this is thrown) — so repeated wrong answers hit the same 5/10
 * minute per-email bucket as wrong passwords, locking the admin out after
 * 5 combined failures.
 */
class Admin2FAFailedError extends CredentialsSignin {
  code = "admin_2fa_failed";
}

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        // Optional: only supplied at step 2 of the admin 2FA flow.
        // For normal user login and admin step-1, this is undefined.
        securityAnswer: { label: "Security Answer", type: "text" },
      },
      async authorize(credentials, request) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;
        if (!email || !password) return null;

        const normalizedEmail = email.toLowerCase().trim();

        // Brute-force protection — enforced HERE, inside the authorize callback,
        // because this is the single choke point that ALL credential sign-in
        // attempts must pass through:
        //   - Server action `loginAction` -> `signIn()` -> internal POST to
        //     /api/auth/callback/credentials -> this callback.
        //   - Direct POST to /api/auth/callback/credentials by an attacker
        //     bypassing the form -> this callback.
        //   - NextAuth's default sign-in page (if any) -> this callback.
        // Rate-limiting only in the server action would leave the direct API
        // path unprotected. Putting it here closes that gap.
        //
        // Every call to authorize — including the admin 2FA step-2 retry with
        // a wrong answer — consumes a slot. This is intentional: a wrong
        // answer is just as much of a "failed sign-in attempt" as a wrong
        // password from a brute-force perspective.
        const clientIp = getClientIp(request.headers) || "unknown";
        const rl = checkLoginRateLimit(clientIp, normalizedEmail);
        if (!rl.allowed) {
          throw new RateLimitError();
        }

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        // Admin 2FA gate. Only applies to ADMIN role AND only when the admin
        // has configured a security question + answer via /admin/settings.
        // Until configured, admin login proceeds without 2FA (the "opsional
        // sampai di-set" semantics agreed with the operator).
        if (user.role === "ADMIN") {
          const settings = await getAdmin2FASettings();
          if (settings.enabled) {
            const providedAnswer = credentials?.securityAnswer;
            // Step 1 of admin login: no answer supplied yet. Tell the client
            // to prompt for the security question. This does NOT count as a
            // failure — we throw Admin2FARequiredError BEFORE any sensitive
            // state change. But the rate-limit slot was already consumed at
            // the top of this function; that's acceptable: the legitimate
            // admin reaches this point exactly once per login session, then
            // supplies the answer, and the second authorize call consumes
            // a second slot. Two slots per legit admin login is fine.
            if (typeof providedAnswer !== "string" || !providedAnswer.trim()) {
              throw new Admin2FARequiredError(settings.question);
            }
            // Step 2: verify the answer. A wrong answer is a real failed
            // attempt — the rate-limit slot consumed at the top of this
            // function counts toward the 5/10-minute per-email lockout.
            const ok = await verifyAdmin2FAAnswer(providedAnswer);
            if (!ok) {
              throw new Admin2FAFailedError();
            }
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.email,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: {
    // Locale prefix is added by next-intl proxy; bare path is rewritten.
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = (token.role as string) || "USER";
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export async function ensureAdminUser() {
  const email = ADMIN_EMAIL.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;
  const password = process.env.ADMIN_PASSWORD || "admin12345";
  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, password: hashed, name: "Admin", role: "ADMIN" },
  });
}

export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === "ADMIN";
}

export { RateLimitError, Admin2FARequiredError, Admin2FAFailedError };
