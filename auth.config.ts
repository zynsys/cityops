import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible auth configuration.
 *
 * This file must NOT import Prisma, bcrypt, or any Node.js-only module —
 * it is imported by middleware.ts which runs in the Next.js Edge runtime.
 *
 * It contains only the JWT/session callbacks and session strategy.
 * Providers that require server-only code are added in auth.ts.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  callbacks: {
    /**
     * Runs whenever a JWT is created (sign-in) or accessed.
     * On sign-in, `user` is populated — copy custom fields onto the token
     * so they survive across requests without additional DB round-trips.
     *
     * JWT shape:
     *   token.userId   — User.id (UUID string)
     *   token.role     — highest-privilege role name
     *   token.tenantId — User.tenantId (UUID string)
     */
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id as string;
        token.role = (user as { role?: string }).role ?? "";
        token.tenantId = (user as { tenantId?: string }).tenantId ?? "";
      }
      return token;
    },
    /**
     * Runs whenever a session is read (server component, API route, middleware).
     * Copies the custom JWT fields onto session.user so callers get a fully
     * typed session without any DB round-trip.
     *
     * Session shape:
     *   session.user.userId   — same as token.userId
     *   session.user.role     — same as token.role
     *   session.user.tenantId — same as token.tenantId
     *   session.user.name     — display name
     *   session.user.email    — user email
     */
    session({ session, token }) {
      session.user.userId = token.userId as string;
      session.user.role = token.role as string;
      session.user.tenantId = token.tenantId as string;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
