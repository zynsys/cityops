import { prisma } from "@/lib/prisma";

export interface StaffUser {
  id: string;
  displayName: string;
}

/**
 * Returns all active authority_user and tenant_admin accounts for the given
 * tenant, suitable for populating the assignee selector.
 */
export async function getStaffUsersForTenant(tenantId: string): Promise<StaffUser[]> {
  const rows = await prisma.userRole.findMany({
    where: {
      tenantId,
      role: { name: { in: ["authority_user", "tenant_admin"] } },
      user: { isActive: true, deletedAt: null },
    },
    distinct: ["userId"],
    orderBy: { user: { displayName: "asc" } },
    select: {
      user: { select: { id: true, displayName: true } },
    },
  });

  return rows.map((r) => r.user);
}
