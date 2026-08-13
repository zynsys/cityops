import { prisma } from "@/lib/prisma";

export interface PointHistoryEntry {
  id: string;
  points: number;
  reason: string | null;
  transactionType: string;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: Date;
}

export interface EarnedBadge {
  badgeId: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  awardedAt: Date;
}

/**
 * Returns the total point balance for a citizen.
 * Queries across all tenants — citizens earn points for reports submitted
 * to any council (the report tenant may differ from the user's home tenant).
 * Always returns 0 or a positive number.
 */
export async function getPointBalance(userId: string): Promise<number> {
  const result = await prisma.rewardPointLedger.aggregate({
    where: { userId },
    _sum: { points: true },
  });
  return result._sum.points ?? 0;
}

/**
 * Returns the most recent point ledger entries for a citizen, newest first.
 * Queries across all tenants.
 */
export async function getPointHistory(
  userId: string,
  limit = 20
): Promise<PointHistoryEntry[]> {
  return prisma.rewardPointLedger.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      points: true,
      reason: true,
      transactionType: true,
      referenceType: true,
      referenceId: true,
      createdAt: true,
    },
  });
}

/**
 * Returns all badges earned by a citizen, newest first.
 * Queries across all tenants.
 */
export async function getEarnedBadges(userId: string): Promise<EarnedBadge[]> {
  const rows = await prisma.userBadge.findMany({
    where: { userId },
    orderBy: { awardedAt: "desc" },
    select: {
      badgeId: true,
      awardedAt: true,
      badge: {
        select: {
          name: true,
          slug: true,
          description: true,
          icon: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    badgeId: row.badgeId,
    name: row.badge.name,
    slug: row.badge.slug,
    description: row.badge.description,
    icon: row.badge.icon,
    awardedAt: row.awardedAt,
  }));
}
