import { notFound } from "next/navigation";
import { auth } from "@auth";
import { getReportById } from "@/db/queries/reports";
import ReportHeader from "@/components/reports/ReportHeader";
import ReportDescription from "@/components/reports/ReportDescription";
import ReportAttachmentGallery from "@/components/reports/ReportAttachmentGallery";
import ReportActivityTracker from "@/components/reports/ReportActivityTracker";
import ReportSidebar from "@/components/reports/ReportSidebar";
import ReportComments from "@/components/reports/ReportComments";
import Breadcrumbs from "@/components/reports/Breadcrumbs";

const EDITABLE_STATUSES = new Set(["created", "under_validation"]);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportDetailPage({ params }: PageProps) {
  const { id } = await params;
  const reportId = parseInt(id, 10);
  if (isNaN(reportId) || reportId < 1) notFound();

  const [report, session] = await Promise.all([
    getReportById(reportId),
    auth(),
  ]);
  if (!report) notFound();

  const isOwnReport = session?.user?.userId === report.reporterUserId;
  const editHref =
    isOwnReport && EDITABLE_STATUSES.has(report.status as string)
      ? `/my-reports/${reportId}/edit`
      : undefined;

  const hasAttachments = report.attachments.some((a) => a.type === "image");

  return (
    <div className="page-shell">
      <Breadcrumbs reportTitle={report.title} />

      <div className="surface-card mt-5 p-5 sm:p-8">
        <ReportHeader report={report} editHref={editHref} />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <div className="surface-card p-5 sm:p-6">
            <ReportDescription description={report.description} />
          </div>
          {hasAttachments && (
            <div className="surface-card p-5 sm:p-6">
              <ReportAttachmentGallery attachments={report.attachments} />
            </div>
          )}

          <div className="surface-card p-5 sm:p-6">
            <ReportActivityTracker status={report.status} activities={report.activities} />
          </div>

          <div className="surface-card p-5 sm:p-6">
            <ReportComments comments={report.comments} />
          </div>
        </div>

        <aside className="surface-card min-w-0 overflow-hidden lg:sticky lg:top-24">
          <div className="border-b border-border p-5">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Location</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Where this issue was reported.</p>
          </div>
          <div className="h-80 sm:h-96">
            <ReportSidebar report={report} />
          </div>
        </aside>
      </div>
    </div>
  );
}
