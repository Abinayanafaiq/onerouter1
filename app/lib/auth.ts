import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "@auth/core/errors";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { ADMIN_EMAIL } from "./constants";
import { checkLoginRateLimit } from "./rate-limit";
import { getClientIp } from "./proxy-utils";

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

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
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

export { RateLimitError };
