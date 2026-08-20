import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@auth';
import { redirect } from 'next/navigation';
import { MapPin, Calendar, User } from 'lucide-react';
import { getStaffReportDetail } from '@/db/queries/staff/reports';
import { StaffReportMap } from '@/components/staff/StaffReportMap';
import { ReportStatusProvider, ReportStatusBadge } from '@/components/staff/ReportStatusContext';
import { StatusSelector } from '@/components/staff/StatusSelector';
import { ReportPriorityProvider, ReportPriorityBadge } from '@/components/staff/ReportPriorityContext';
import { PrioritySelector } from '@/components/staff/PrioritySelector';
import { ReportAssigneeProvider } from '@/components/staff/ReportAssigneeContext';
import { AssigneeSelector } from '@/components/staff/AssigneeSelector';
import { getStaffUsersForTenant } from '@/db/queries/staff/users';
import { CommentForm } from '@/components/staff/CommentForm';
import AiValidationPanel from '@/components/staff/AiValidationPanel';
import ReportDescription from '@/components/reports/ReportDescription';
import ReportAttachmentGallery from '@/components/reports/ReportAttachmentGallery';
import ReportActivityTracker from '@/components/reports/ReportActivityTracker';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = new Set(['authority_user', 'tenant_admin']);

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
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

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StaffReportDetailPage({ params }: PageProps) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role ?? '';
  if (!session || !ALLOWED_ROLES.has(role)) redirect('/403');

  const { id } = await params;
  const reportId = parseInt(id, 10);
  if (isNaN(reportId) || reportId < 1) notFound();

  const tenantId = (session.user as { tenantId?: string }).tenantId ?? '';
  const isPlatformAdmin = role === 'platform_admin';

  const [report, staffUsers] = await Promise.all([
    getStaffReportDetail(reportId, tenantId, isPlatformAdmin),
    getStaffUsersForTenant(tenantId),
  ]);
  if (!report) notFound();

  const sessionUserDisplayName = session.user.name ?? '';
  const latestAi = report.aiValidationResults[0] ?? null;
  const hasAttachments = report.attachments.some((a) => a.type === 'image');
  const initialAssignedTo = report.assignedUser
    ? { id: report.assignedUserId ?? '', displayName: report.assignedUser.displayName }
    : null;

  return (
    <ReportStatusProvider initialStatus={report.status}>
      <ReportPriorityProvider initialPriority={report.priority ?? null}>
        <ReportAssigneeProvider initialAssignedTo={initialAssignedTo}>
          <div className="flex-1">
            {/* ── Header — dark navy ── */}
            <section className="bg-[#161F2F] py-8 sm:py-10">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Title, badges, reporter/date */}
                <div>
                  <h1 className="text-2xl font-bold text-white sm:text-3xl leading-snug">{report.title}</h1>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <ReportStatusBadge />
                    <ReportPriorityBadge />
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-300">
                      {report.category.color && (
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: report.category.color }}
                          aria-hidden="true"
                        />
                      )}
                      {report.category.name}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" aria-hidden="true" />
                      Reported by {report.reporter.displayName}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatDate(report.createdAt)}
                    </span>
                    <span className="text-xs">Updated {formatRelativeTime(new Date(report.updatedAt))}</span>
                  </div>
                </div>

                {/* Description */}
                <ReportDescription description={report.description} />

                {/* Attachments */}
                {hasAttachments && <ReportAttachmentGallery attachments={report.attachments} />}
              </div>
            </section>

            {/* ── Progress tracker ── */}
            <section className="bg-section-alt py-8 sm:py-10">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <ReportActivityTracker status={report.status} activities={report.activities} />
              </div>
            </section>

            {/* ── Map + Action panel ── */}
            <section className="bg-section-primary py-8 sm:py-10">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-8 md:flex-row">
                  {/* Map */}
                  <div className="flex-1 min-w-0 space-y-3">
                    {report.coordinates ? (
                      <div className="h-[350px] overflow-hidden rounded-xl border border-border sm:h-[450px]">
                        <StaffReportMap lat={report.coordinates.latitude} lng={report.coordinates.longitude} />
                      </div>
                    ) : (
                      <div className="flex h-[350px] items-center justify-center rounded-xl border border-border bg-muted sm:h-[450px]">
                        <p className="text-sm text-muted-foreground">No location data</p>
                      </div>
                    )}
                    {report.locationText && (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                        {report.locationText}
                      </p>
                    )}
                  </div>

                  {/* Action panel */}
                  <aside className="w-full md:w-80 lg:w-96 shrink-0 space-y-4">
                    {/* AI Validation card */}
                    {latestAi && <AiValidationPanel aiResult={latestAi} />}

                    {/* Details card */}
                    <div className="h-[350px] sm:h-[450px] rounded-xl border border-border bg-surface overflow-hidden flex flex-col">
                      {/* Card header */}
                      <div className="border-b border-border bg-muted/50 px-5 py-3">
                        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Details</h2>
                      </div>

                      {/* Card body */}
                      <div className="flex-1 flex flex-col justify-evenly px-5">
                        {/* Reporter */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-muted-foreground">Reporter</span>
                          <span className="text-sm text-foreground">{report.reporter.displayName}</span>
                        </div>

                        {/* Reported */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-muted-foreground">Reported</span>
                          <span className="text-sm text-foreground">{formatDate(report.createdAt)}</span>
                        </div>

                        {/* Category */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-muted-foreground">Category</span>
                          <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                            {report.category.color && (
                              <span
                                className="inline-block h-2 w-2 rounded-full"
                                style={{ backgroundColor: report.category.color }}
                                aria-hidden="true"
                              />
                            )}
                            {report.category.name}
                          </span>
                        </div>

                        <div className="border-t border-border" />

                        {/* Status */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-muted-foreground">Status</span>
                          <StatusSelector reportId={reportId} />
                        </div>

                        {/* Priority */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-muted-foreground">Priority</span>
                          <PrioritySelector reportId={reportId} />
                        </div>

                        {/* Assigned to */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-muted-foreground">Assigned to</span>
                          <AssigneeSelector
                            reportId={reportId}
                            staffUsers={staffUsers}
                            sessionUserDisplayName={sessionUserDisplayName}
                          />
                        </div>
                      </div>

                      {/* Card footer */}
                      <div className="border-t border-border px-5 py-3 flex justify-end">
                        <Link
                          href="/staff/reports"
                          className="inline-flex items-center rounded-md bg-accent px-4 py-1.5 text-xs font-medium text-white hover:bg-accent/90 transition-colors"
                        >
                          Save
                        </Link>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            </section>

            {/* ── Comments ── */}
            <section className="py-8 sm:py-10">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {/* Comments */}
                <div>
                  <h2 className="mb-4 text-base font-semibold text-foreground">Comments ({report.comments.length})</h2>
                  {report.comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No comments yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {report.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className={
                            comment.isInternal
                              ? 'rounded-lg bg-muted border-l-4 border-accent/40 p-4'
                              : 'rounded-lg border border-border bg-surface p-4'
                          }
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted border border-border">
                              <User className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                            </div>
                            <span className="text-sm font-medium text-foreground">{comment.user.displayName}</span>
                            {comment.isInternal && (
                              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                                Internal
                              </span>
                            )}
                            <span className="ml-auto text-xs text-muted-foreground">
                              {formatRelativeTime(new Date(comment.createdAt))}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                            {comment.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  <CommentForm reportId={reportId} currentUserDisplayName={sessionUserDisplayName} />
                </div>
              </div>
            </section>
          </div>
        </ReportAssigneeProvider>
      </ReportPriorityProvider>
    </ReportStatusProvider>
  );
}
