/**
 * Server-only session utilities.
 *
 * This module must NOT be imported in client components.
 * The `server-only` package enforces this at build time.
 */
import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@auth";
import type { Session } from "next-auth";

/**
 * Returns the current session, or redirects to /sign-in if unauthenticated.
 * Use in page components and route handlers that require a login.
 */
export async function getRequiredSession(): Promise<Session> {
  const session = await auth();
  if (!session) {
    redirect("/sign-in");
  }
  return session;
}

/**
 * Returns the current session, or null if unauthenticated. Does not redirect.
 * Use where the page renders differently based on auth state.
 */
export async function getOptionalSession(): Promise<Session | null> {
  return auth();
}

/**
 * Returns true if the session's role matches one of the provided roles.
 * Synchronous — takes an already-resolved session.
 */
export function hasRole(session: Session, roles: string[]): boolean {
  return roles.includes(session.user.role);
}
