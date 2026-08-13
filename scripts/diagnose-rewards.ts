import { prisma } from "../src/lib/prisma";
import { evaluateBadges } from "../src/lib/rewards";

async function main() {
  const userId = "fa15f3ec-09a1-4146-90d2-368b6c5b18d0";
  // Get any tenantId for the user (required by evaluateBadges for userBadge FK)
  const role = await prisma.userRole.findFirst({ where: { userId }, select: { tenantId: true } });
  const tenantId = role!.tenantId;
  console.log("Running evaluateBadges for", userId, "tenantId", tenantId);
  await evaluateBadges(userId, tenantId);

  const earned = await prisma.userBadge.findMany({
    where: { userId },
    select: { badge: { select: { name: true } }, awardedAt: true },
  });
  console.log("Badges now earned:", JSON.stringify(earned, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
