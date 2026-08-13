import { notFound } from "next/navigation";
import { auth } from "@auth";
import { getReportById } from "@/db/queries/reports";
import ReportHeader from "@/components/reports/ReportHeader";
import ReportDescription from "@/components/reports/ReportDescription";
import ReportAttachmentGallery from "@/components/reports/ReportAttachmentGallery";
import ReportActivityTracker from "@/components/reports/ReportActivityTracker";
import ReportSidebar from "@/components/reports/ReportSidebar";
import ReportComments from "@/components/reports/ReportComments";

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
    <div className="flex-1">
      {/* Report info — dark section */}
      <section className="bg-[#161F2F] py-8 sm:py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <ReportHeader report={report} editHref={editHref} />
          <ReportDescription description={report.description} />
          {hasAttachments && (
            <ReportAttachmentGallery attachments={report.attachments} />
          )}
        </div>
      </section>

      {/* Activity Tracker — alt section */}
      <section className="bg-section-alt py-8 sm:py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <ReportActivityTracker status={report.status} activities={report.activities} />
        </div>
      </section>

      {/* Map — primary section */}
      <section className="bg-section-primary py-8 sm:py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-[350px] overflow-hidden rounded-lg border border-border sm:h-[450px]">
            <ReportSidebar report={report} />
          </div>
        </div>
      </section>

      {/* Public comments */}
      <section className="bg-section-alt py-8 sm:py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <ReportComments comments={report.comments} />
        </div>
      </section>
    </div>
  );
}
