/**
 * Rewards utilities — point awards and badge evaluation.
 */

import { prisma } from "@/lib/prisma";

interface AwardPointsOptions {
  tenantId: string;
  userId: string;
  points: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
}

/**
 * Awards points to a citizen and triggers badge evaluation.
 * Fire-and-forget safe — swallows all errors.
 */
export async function awardPoints(options: AwardPointsOptions): Promise<void> {
  const { tenantId, userId, points, reason, referenceType, referenceId } = options;

  try {
    await prisma.rewardPointLedger.create({
      data: {
        tenantId,
        userId,
        transactionType: "earned",
        points,
        reason,
        referenceType: referenceType ?? null,
        referenceId: referenceId ?? null,
      },
    });

    // Trigger badge evaluation after awarding points
    void evaluateBadges(userId, tenantId);
  } catch (err) {
    console.error("[Rewards] Failed to award points:", err);
  }
}

/**
 * Checks whether the user now qualifies for any badges they have not yet received
 * and awards them all in one idempotent write.
 * Fire-and-forget safe — swallows all errors.
 */
export async function evaluateBadges(
  userId: string,
  tenantId: string
): Promise<void> {
  try {
    // Fetch all platform badges not yet awarded to this user
    const unearnedBadges = await prisma.badge.findMany({
      where: {
        tenantId: null,
        userBadges: { none: { userId } },
      },
    });

    if (unearnedBadges.length === 0) return;

    // Gather stats needed for criteria evaluation
    const [submittedCount, resolvedCount, pointBalance] = await Promise.all([
      prisma.report.count({ where: { reporterUserId: userId, deletedAt: null } }),
      prisma.report.count({
        where: { reporterUserId: userId, status: "resolved", deletedAt: null },
      }),
      prisma.rewardPointLedger
        .aggregate({ where: { userId }, _sum: { points: true } })
        .then((r) => r._sum.points ?? 0),
    ]);

    const stats: Record<string, number> = {
      reports_submitted: submittedCount,
      reports_resolved: resolvedCount,
      points_total: pointBalance,
    };

    // Determine which badges the user now qualifies for
    const qualifying = unearnedBadges.filter((badge) => {
      const criteria = badge.criteria as Record<string, number>;
      return Object.entries(criteria).every(
        ([key, threshold]) => (stats[key] ?? 0) >= threshold
      );
    });

    if (qualifying.length === 0) return;

    await prisma.userBadge.createMany({
      data: qualifying.map((badge) => ({
        tenantId,
        userId,
        badgeId: badge.id,
      })),
      skipDuplicates: true,
    });

    console.log(
      `[Rewards] Awarded ${qualifying.length} badge(s) to user ${userId}:`,
      qualifying.map((b) => b.slug).join(", ")
    );
  } catch (err) {
    console.error("[Rewards] Failed to evaluate badges:", err);
  }
}
