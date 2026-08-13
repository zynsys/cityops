import { prisma } from "@/lib/prisma";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: Date;
  _count: {
    submittedReports: number;
  };
}

export async function getMyProfile(userId: string): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      createdAt: true,
      _count: { select: { submittedReports: true } },
    },
  });

  return user ?? null;
}
