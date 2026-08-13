import { prisma } from "@/lib/prisma";

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

/**
 * Returns all active platform-level categories.
 * Categories are no longer tenant-scoped — they are managed by platform admins
 * and shared across all councils.
 */
export async function getActiveCategories(): Promise<CategorySummary[]> {
  return prisma.reportCategory.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      color: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}
