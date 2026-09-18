import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@auth';
import { prisma } from '@/lib/prisma';
import { getPointBalance, getPointHistory, getEarnedBadges } from '@/db/queries/rewards';
import Link from 'next/link';
import { Award, History, Star, Trophy } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Rewards — CityOps',
};

const STAFF_ROLES = new Set(['authority_user', 'tenant_admin', 'platform_admin']);

// Map internal reason codes to plain-English labels
const REASON_LABELS: Record<string, string> = {
  report_validated: 'Report validated',
  report_submitted: 'Report submitted',
  report_resolved: 'Report resolved',
  bonus: 'Bonus points',
};

function reasonLabel(reason: string | null): string {
  if (!reason) return 'Points earned';
  return REASON_LABELS[reason] ?? reason;
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'just now';
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
    redirect('/sign-in?callbackUrl=/my-rewards');
  }

  const { userId, role } = session.user;

  if (STAFF_ROLES.has(role)) {
    redirect('/staff/reports');
  }

  const [balance, history, badges, reportCount] = await Promise.all([
    getPointBalance(userId),
    getPointHistory(userId),
    getEarnedBadges(userId),
    prisma.report.count({ where: { reporterUserId: userId, deletedAt: null } }),
  ]);

  return (
    <div className="page-shell max-w-6xl">
      <header className="page-header">
        <div>
          <p className="eyebrow">Community participation</p>
          <h1 className="page-title mt-3">My Rewards</h1>
          <p className="page-description">Your civic contributions, recognised.</p>
        </div>
      </header>

      {/* ── Points Summary ─────────────────────────────────────────── */}
      <section aria-labelledby="points-heading" className="surface-card mb-10 p-6 sm:p-8">
        <div className="flex items-start gap-4 sm:gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted text-accent sm:h-14 sm:w-14">
            <Star className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Points balance</p>
            <h2
              id="points-heading"
              className="break-words text-4xl font-semibold tracking-tight text-foreground tabular-nums sm:text-5xl"
            >
              <span className="sr-only">Points balance: </span>
              {balance.toLocaleString()}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {balance === 1 ? 'point' : 'points'} earned across{' '}
              {reportCount === 1 ? '1 report' : `${reportCount.toLocaleString()} reports`}
            </p>
          </div>
        </div>
      </section>

      {/* ── Earned Badges ──────────────────────────────────────────── */}
      <section aria-labelledby="badges-heading" className="mb-10">
        <h2 id="badges-heading" className="mb-5 flex items-center gap-2.5 text-lg font-semibold text-foreground">
          <Trophy className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          Badges
        </h2>

        {badges.length === 0 ? (
          <div className="empty-state py-12">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Award className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="text-base font-semibold text-foreground">No badges yet</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Submit your first report to start earning badges.
            </p>
            <Link href="/reports/new" className="btn-primary mt-6">
              Submit a Report
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {badges.map((badge) => (
              <li key={badge.badgeId} className="surface-card flex min-w-0 flex-col p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-accent">
                  <Award className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="break-words font-semibold text-foreground">{badge.name}</h3>
                {badge.description && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{badge.description}</p>
                )}
                <p className="mt-auto pt-5 text-xs leading-relaxed text-muted-foreground">
                  Awarded{' '}
                  <time dateTime={badge.awardedAt.toISOString()}>
                    {badge.awardedAt.toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
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
        <h2 id="history-heading" className="mb-5 flex items-center gap-2.5 text-lg font-semibold text-foreground">
          <History className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          Recent Activity
        </h2>

        {history.length === 0 ? (
          <div className="empty-state py-12">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <History className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="text-base font-semibold text-foreground">No points yet</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Points appear here once your reports are validated.
            </p>
          </div>
        ) : (
          <div
            role="region"
            aria-labelledby="history-heading"
            tabIndex={0}
            className="surface-card overflow-x-auto focus-visible:outline-offset-4"
          >
            <table className="w-full min-w-[32rem] text-left text-sm">
              <caption className="sr-only">Recent points activity</caption>
              <thead className="border-b border-border bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-6 py-4 font-medium">
                    Activity
                  </th>
                  <th scope="col" className="px-6 py-4 font-medium">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-4 text-right font-medium">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((entry) => (
                  <tr key={entry.id} className="transition-colors hover:bg-muted/30">
                    <th scope="row" className="px-6 py-5 font-medium text-foreground">
                      {reasonLabel(entry.reason)}
                    </th>
                    <td className="whitespace-nowrap px-6 py-5 text-muted-foreground">
                      <time dateTime={entry.createdAt.toISOString()}>
                        {formatRelativeTime(new Date(entry.createdAt))}
                      </time>
                    </td>
                    <td className="whitespace-nowrap px-6 py-5 text-right font-semibold text-accent tabular-nums">
                      +{entry.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
