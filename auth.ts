import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { verifyCredentials } from "@/db/queries/auth";

/**
 * Full Auth.js v5 configuration for Node.js runtime (API routes, server components).
 *
 * Edge-compatible callbacks live in auth.config.ts and are spread here.
 * The Credentials provider is added only in this file because `verifyCredentials`
 * imports Prisma, which must not reach the Edge runtime used by middleware.
 *
 * The passwordHash field is NEVER included in the token or session.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const result = await verifyCredentials(email, password);
        if (!result) return null;

        return {
          id: result.userId,
          name: result.displayName,
          email: result.email,
          role: result.role,
          tenantId: result.tenantId,
        };
      },
    }),
  ],
});
