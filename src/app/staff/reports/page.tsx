import { auth } from "@auth";
import { redirect } from "next/navigation";
import { getStaffReports } from "@/db/queries/staff/reports";
import { getActiveCategories } from "@/db/queries/categories";
import { getTenantById } from "@/db/queries/tenants";
import { StaffReportFilterBar } from "@/components/staff/StaffReportFilterBar";
import { StaffReportTable } from "@/components/staff/StaffReportTable";
import type { ReportStatus, ReportPriority } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    category?: string;
    priority?: string;
    search?: string;
    sort?: string;
    page?: string;
  }>;
}

const ALLOWED_ROLES = new Set(["authority_user", "tenant_admin"]);

export default async function StaffReportsPage({ searchParams }: PageProps) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role ?? "";
  if (!session || !ALLOWED_ROLES.has(role)) redirect("/403");

  const tenantId = (session.user as { tenantId?: string }).tenantId ?? "";
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const [{ reports, total }, categories, tenant] = await Promise.all([
    getStaffReports(
      tenantId,
      {
        status: params.status as ReportStatus | undefined,
        categoryId: params.category,
        priority: params.priority as ReportPriority | undefined,
        search: params.search,
        sort: (params.sort as "newest" | "oldest" | "updated" | "priority") ?? "newest",
      },
      page
    ),
    getActiveCategories(),
    getTenantById(tenantId),
  ]);

  const tenantName = tenant?.name ?? "your council";
  const hasFilters = !!(params.status || params.category || params.priority || params.search);

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All reports for <span className="font-medium text-foreground">{tenantName}</span>.
        </p>
      </div>
      <div className="mb-4">
        <StaffReportFilterBar categories={categories} />
      </div>
      <StaffReportTable reports={reports} total={total} page={page} hasFilters={hasFilters} searchParams={params} />
    </div>
    </div>
  );
}
