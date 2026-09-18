import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@auth';
import { redirect } from 'next/navigation';
import { MapPin, Calendar, User, ClipboardList, MessageSquare } from 'lucide-react';
import { getStaffReportDetail } from '@/db/queries/staff/reports';
import { StaffReportMap } from '@/components/staff/StaffReportMap';
import { ReportStatusProvider } from '@/components/staff/ReportStatusContext';
import { StaffReportStatusBadge, StatusSelector } from '@/components/staff/StatusSelector';
import { ReportPriorityProvider } from '@/components/staff/ReportPriorityContext';
import { StaffReportPriorityBadge, PrioritySelector } from '@/components/staff/PrioritySelector';
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
          <div className="page-shell space-y-6">
            {/* Report overview */}
            <section className="surface-card space-y-6 p-5 sm:p-8">
              <div>
                <p className="eyebrow">Council report · #{reportId}</p>
                <h1 className="page-title mt-2 break-words">{report.title}</h1>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <StaffReportStatusBadge />
                  <StaffReportPriorityBadge />
                  <span className="status-badge bg-muted text-muted-foreground">
                    {report.category.color && (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: report.category.color, filter: 'saturate(0.55)' }}
                        aria-hidden="true"
                      />
                    )}
                    {report.category.name}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <User className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                    Reported by {report.reporter.displayName}
                  </span>
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                    {formatDate(report.createdAt)}
                  </span>
                  <span className="text-xs">Updated {formatRelativeTime(new Date(report.updatedAt))}</span>
                </div>
              </div>

              <div className="space-y-6 border-t border-border pt-6">
                <ReportDescription description={report.description} />
                {hasAttachments && <ReportAttachmentGallery attachments={report.attachments} />}
              </div>
            </section>

            {/* Progress tracker */}
            <section className="surface-card p-5 sm:p-6">
              <ReportActivityTracker status={report.status} activities={report.activities} />
            </section>

            {/* Location and report management */}
            <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
              <div className="surface-card min-w-0 overflow-hidden">
                <div className="flex items-center gap-3 border-b border-border px-5 py-5">
                  <MapPin className="h-5 w-5 text-accent" aria-hidden="true" />
                  <h2 className="text-base font-semibold text-foreground">Location</h2>
                </div>
                {report.coordinates ? (
                  <div className="h-[350px] sm:h-[450px]">
                    <StaffReportMap lat={report.coordinates.latitude} lng={report.coordinates.longitude} />
                  </div>
                ) : (
                  <div className="empty-state flex h-[350px] flex-col items-center justify-center gap-3 bg-muted/20 sm:h-[450px]">
                    <MapPin className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">No location data</p>
                  </div>
                )}
                {report.locationText && (
                  <p className="flex items-start gap-2 border-t border-border px-5 py-4 text-sm text-muted-foreground">
                    <MapPin className="h-4.5 w-4.5 shrink-0 text-accent" aria-hidden="true" />
                    {report.locationText}
                  </p>
                )}
              </div>

              <aside className="min-w-0 space-y-5">
                {latestAi && <AiValidationPanel aiResult={latestAi} />}

                <div className="surface-card overflow-hidden">
                  <div className="flex items-start gap-3 border-b border-border px-5 py-5">
                    <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                    <div>
                      <h2 className="text-base font-semibold text-foreground">Details</h2>
                      <p className="mt-1 text-xs text-muted-foreground">Status, priority and ownership</p>
                    </div>
                  </div>

                  <dl className="space-y-4 px-5 py-5 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-muted-foreground">Reporter</dt>
                      <dd className="text-right font-medium text-foreground">{report.reporter.displayName}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-muted-foreground">Reported</dt>
                      <dd className="text-right text-foreground">{formatDate(report.createdAt)}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-muted-foreground">Category</dt>
                      <dd className="inline-flex items-center gap-2 text-right text-foreground">
                        {report.category.color && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: report.category.color, filter: 'saturate(0.55)' }}
                            aria-hidden="true"
                          />
                        )}
                        {report.category.name}
                      </dd>
                    </div>
                  </dl>

                  <div className="space-y-4 border-t border-border px-5 py-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <span className="text-sm text-muted-foreground sm:pt-3">Status</span>
                      <StatusSelector reportId={reportId} />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <span className="text-sm text-muted-foreground sm:pt-3">Priority</span>
                      <PrioritySelector reportId={reportId} />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <span className="text-sm text-muted-foreground sm:pt-3">Assigned to</span>
                      <AssigneeSelector
                        reportId={reportId}
                        staffUsers={staffUsers}
                        sessionUserDisplayName={sessionUserDisplayName}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end border-t border-border bg-muted/20 px-5 py-4">
                    <Link href="/staff/reports" className="btn-primary">
                      Save
                    </Link>
                  </div>
                </div>
              </aside>
            </section>

            {/* Comments */}
            <section className="surface-card p-5 sm:p-6">
              <h2 className="mb-5 flex items-center gap-3 text-base font-semibold text-foreground">
                <MessageSquare className="h-5 w-5 text-accent" aria-hidden="true" />
                Comments ({report.comments.length})
              </h2>
              {report.comments.length === 0 ? (
                <div className="empty-state bg-muted/20 py-8">
                  <p className="text-sm text-muted-foreground">No comments yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {report.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={
                        comment.isInternal
                          ? 'rounded-xl border border-border border-l-2 border-l-accent/50 bg-muted/30 p-4'
                          : 'rounded-xl border border-border bg-background/50 p-4'
                      }
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface">
                          <User className="h-4.5 w-4.5 text-muted-foreground" aria-hidden="true" />
                        </div>
                        <span className="text-sm font-semibold text-foreground">{comment.user.displayName}</span>
                        {comment.isInternal && <span className="status-badge bg-accent/10 text-accent">Internal</span>}
                        <span className="ml-auto text-xs text-muted-foreground">
                          {formatRelativeTime(new Date(comment.createdAt))}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{comment.body}</p>
                    </div>
                  ))}
                </div>
              )}
              <CommentForm reportId={reportId} currentUserDisplayName={sessionUserDisplayName} />
            </section>
          </div>
        </ReportAssigneeProvider>
      </ReportPriorityProvider>
    </ReportStatusProvider>
  );
}
