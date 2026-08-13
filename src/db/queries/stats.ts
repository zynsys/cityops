import { prisma } from "@/lib/prisma";

export interface PlatformStats {
  reportsThisWeek: number;
  reportsFixed: number;
  updatesSent: number;
  activeMembers: number;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [reportsThisWeek, reportsFixed, updatesSent, activeMembers] =
      await Promise.all([
        prisma.report.count({
          where: { createdAt: { gte: sevenDaysAgo } },
        }),
        prisma.report.count({
          where: { status: { in: ["resolved", "closed"] } },
        }),
        prisma.reportActivity.count(),
        prisma.user.count({
          where: { isActive: true },
        }),
      ]);

    return { reportsThisWeek, reportsFixed, updatesSent, activeMembers };
  } catch {
    return {
      reportsThisWeek: 0,
      reportsFixed: 0,
      updatesSent: 0,
      activeMembers: 0,
    };
  }
}
