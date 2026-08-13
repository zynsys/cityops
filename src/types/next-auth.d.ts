import { DefaultSession } from "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      /** Resolved from User.id — always present on a valid session. */
      userId: string;
      /** Highest-privilege role name — always present on a valid session. */
      role: string;
      /** Tenant the user belongs to — always present on a valid session. */
      tenantId: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: string;
    tenantId?: string;
  }
}
