import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Role priority order: highest number = highest privilege.
 * Used to resolve the single role when a user holds multiple.
 */
const ROLE_PRIORITY: Record<string, number> = {
  platform_admin: 4,
  tenant_admin: 3,
  authority_user: 2,
  citizen: 1,
};

/**
 * Fetches the minimal user record needed to authenticate a sign-in attempt.
 * The passwordHash field is intentionally scoped to this module only.
 */
async function getUserForAuth(email: string) {
  return prisma.user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      deletedAt: null,
    },
    select: {
      id: true,
      tenantId: true,
      displayName: true,
      email: true,
      passwordHash: true,
      isActive: true,
      emailVerifiedAt: true,
      userRoles: {
        select: {
          role: { select: { name: true } },
        },
      },
    },
  });
}

/**
 * Resolves the highest-privilege role name from a user's role list.
 * Falls back to "citizen" when the list is empty or contains only unknown roles.
 */
function resolveHighestRole(userRoles: { role: { name: string } }[]): string {
  if (userRoles.length === 0) return "citizen";
  return userRoles.reduce((best, cur) => {
    const curPriority = ROLE_PRIORITY[cur.role.name] ?? 0;
    const bestPriority = ROLE_PRIORITY[best.role.name] ?? 0;
    return curPriority > bestPriority ? cur : best;
  }).role.name;
}

/** Updates lastLoginAt without blocking the caller. */
function touchLastLogin(userId: string): void {
  prisma.user
    .update({ where: { id: userId }, data: { lastLoginAt: new Date() } })
    .catch(() => {});
}

/**
 * Verifies email + password and returns session-safe user fields on success,
 * or null for any failure (uniform response — no enumeration).
 * passwordHash is never included in the return value.
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<{ userId: string; role: string; tenantId: string; displayName: string; email: string } | null> {
  const user = await getUserForAuth(email);

  if (!user) return null;
  if (!user.isActive) return null;
  if (!user.emailVerifiedAt) return null;

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) return null;

  const role = resolveHighestRole(user.userRoles);

  touchLastLogin(user.id);

  return { userId: user.id, role, tenantId: user.tenantId, displayName: user.displayName, email: user.email };
}
