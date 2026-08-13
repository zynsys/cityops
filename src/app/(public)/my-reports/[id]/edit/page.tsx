import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { auth } from "@auth";
import { getReportForEdit } from "@/db/queries/reports";
import { getActiveCategories } from "@/db/queries/categories";
import EditReportForm from "@/components/reports/submit/EditReportForm";

const EDITABLE_STATUSES = new Set(["created", "under_validation"]);

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

  const [report, categories] = await Promise.all([
    getReportForEdit(reportId),
    getActiveCategories(),
  ]);

  if (!report) notFound();

  // Ownership check — redirect to /403 if not the reporter
  if (report.reporterUserId !== session.user.userId) {
    redirect("/403");
  }

  const isEditable = EDITABLE_STATUSES.has(report.status);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href={`/reports/${reportId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to report
        </Link>

        <h1 className="text-2xl font-bold text-foreground mb-6">Edit report</h1>

        {!isEditable ? (
          /* ── Locked state ── */
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-base font-semibold text-foreground">
                Report can no longer be edited
              </h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                This report can no longer be edited because it is already being processed by your council.
              </p>
            </div>
            <Link
              href={`/reports/${reportId}`}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Back to report
            </Link>
          </div>
        ) : (
          /* ── Edit form ── */
          <div className="rounded-xl border border-border bg-surface px-6 py-6">
            <EditReportForm
              reportId={reportId}
              initialTitle={report.title}
              initialDescription={report.description}
              initialCategoryId={report.categoryId}
              initialLocationText={report.locationText ?? ""}
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
