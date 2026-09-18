import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import { auth } from '@auth';
import { getReportForEdit } from '@/db/queries/reports';
import { getActiveCategories } from '@/db/queries/categories';
import EditReportForm from '@/components/reports/submit/EditReportForm';

const EDITABLE_STATUSES = new Set(['created', 'under_validation']);

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Edit Report #${id} — CityOps` };
}

export default async function EditReportPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.userId) {
    const { id } = await params;
    redirect(`/sign-in?callbackUrl=/my-reports/${id}/edit`);
  }

  const { id: idStr } = await params;
  const reportId = parseInt(idStr, 10);
  if (isNaN(reportId) || reportId < 1) notFound();

  const [report, categories] = await Promise.all([getReportForEdit(reportId), getActiveCategories()]);

  if (!report) notFound();

  // Ownership check — redirect to /403 if not the reporter
  if (report.reporterUserId !== session.user.userId) {
    redirect('/403');
  }

  const isEditable = EDITABLE_STATUSES.has(report.status);

  return (
    <div className="min-h-screen bg-background">
      <div className="page-shell max-w-4xl">
        {/* Back link */}
        <Link
          href={`/reports/${reportId}`}
          className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to report
        </Link>

        <header className="page-header">
          <div>
            <p className="eyebrow mb-2">Report #{reportId}</p>
            <h1 className="page-title">Edit report</h1>
            <p className="page-description">Keep the details accurate so your council can respond.</p>
          </div>
        </header>

        {!isEditable ? (
          /* ── Locked state ── */
          <div className="surface-card flex flex-col items-center gap-5 px-5 py-10 text-center sm:px-8 sm:py-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Report can no longer be edited</h2>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                This report can no longer be edited because it is already being processed by your council.
              </p>
            </div>
            <Link href={`/reports/${reportId}`} className="btn-secondary">
              Back to report
            </Link>
          </div>
        ) : (
          /* ── Edit form ── */
          <div className="surface-card p-5 sm:p-8">
            <EditReportForm
              reportId={reportId}
              initialTitle={report.title}
              initialDescription={report.description}
              initialCategoryId={report.categoryId}
              initialLocationText={report.locationText ?? ''}
              initialLat={report.lat ?? 54.5}
              initialLng={report.lng ?? -3.5}
              existingAttachments={report.attachments}
              categories={categories}
            />
          </div>
        )}
      </div>
    </div>
  );
}
