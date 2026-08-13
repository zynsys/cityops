import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@auth";
import { prisma } from "@/lib/prisma";
import {
  getPointBalance,
  getPointHistory,
  getEarnedBadges,
} from "@/db/queries/rewards";
import Link from "next/link";
import { Award, Star, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Rewards — CityOps",
};

const STAFF_ROLES = new Set(["authority_user", "tenant_admin", "platform_admin"]);

// Map internal reason codes to plain-English labels
const REASON_LABELS: Record<string, string> = {
  report_validated: "Report validated",
  report_submitted: "Report submitted",
  report_resolved: "Report resolved",
  bonus: "Bonus points",
};

function reasonLabel(reason: string | null): string {
  if (!reason) return "Points earned";
  return REASON_LABELS[reason] ?? reason;
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

export default async function MyRewardsPage() {
  const session = await auth();

  if (!session?.user?.userId) {
    redirect("/sign-in?callbackUrl=/my-rewards");
  }

  const { userId, role } = session.user;

  if (STAFF_ROLES.has(role)) {
    redirect("/staff/reports");
  }

  const [balance, history, badges, reportCount] = await Promise.all([
    getPointBalance(userId),
    getPointHistory(userId),
    getEarnedBadges(userId),
    prisma.report.count({ where: { reporterUserId: userId, deletedAt: null } }),
  ]);

  return (
    <main className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">My Rewards</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your civic contributions, recognised.
        </p>
      </div>

      {/* ── Points Summary ─────────────────────────────────────────── */}
      <section
        aria-labelledby="points-heading"
        className="mb-10 rounded-2xl border border-border bg-surface p-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
            <Star className="h-6 w-6 text-accent" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="points-heading"
              className="text-4xl font-bold text-accent tabular-nums"
            >
              {balance.toLocaleString()}
            </h2>
            <p className="text-sm text-muted-foreground">
              {balance === 1 ? "point" : "points"} earned across{" "}
              {reportCount === 1
                ? "1 report"
                : `${reportCount.toLocaleString()} reports`}
            </p>
          </div>
        </div>
      </section>

      {/* ── Earned Badges ──────────────────────────────────────────── */}
      <section aria-labelledby="badges-heading" className="mb-10">
        <h2
          id="badges-heading"
          className="mb-4 flex items-center gap-2 text-xl font-semibold text-foreground"
        >
          <Trophy className="h-5 w-5 text-accent" aria-hidden="true" />
          Badges
        </h2>

        {badges.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
            <Trophy
              className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40"
              aria-hidden="true"
            />
            <p className="font-medium text-foreground">No badges yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Submit your first report to start earning badges.
            </p>
            <Link
              href="/reports/new"
              className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
            >
              Submit a Report
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {badges.map((badge) => (
              <li
                key={badge.badgeId}
                className="rounded-xl border border-border bg-surface p-5 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Award className="h-5 w-5 text-accent" aria-hidden="true" />
                </div>
                <p className="font-semibold text-foreground">{badge.name}</p>
                {badge.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {badge.description}
                  </p>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  Awarded{" "}
                  <time dateTime={badge.awardedAt.toISOString()}>
                    {badge.awardedAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Point History ──────────────────────────────────────────── */}
      <section aria-labelledby="history-heading">
        <h2
          id="history-heading"
          className="mb-4 flex items-center gap-2 text-xl font-semibold text-foreground"
        >
          <Star className="h-5 w-5 text-accent" aria-hidden="true" />
          Recent Activity
        </h2>

        {history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
            <p className="font-medium text-foreground">No points yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Points appear here once your reports are validated.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface" role="list">
            {history.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {reasonLabel(entry.reason)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <time dateTime={entry.createdAt.toISOString()}>
                      {formatRelativeTime(new Date(entry.createdAt))}
                    </time>
                  </p>
                </div>
                <span className="text-sm font-semibold text-accent">
                  +{entry.points}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
