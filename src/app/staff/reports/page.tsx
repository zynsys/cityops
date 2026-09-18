import { auth } from '@auth';
import { redirect } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import { getStaffReports } from '@/db/queries/staff/reports';
import { getActiveCategories } from '@/db/queries/categories';
import { getTenantById } from '@/db/queries/tenants';
import { StaffReportFilterBar } from '@/components/staff/StaffReportFilterBar';
import { StaffReportTable } from '@/components/staff/StaffReportTable';
import type { ReportStatus, ReportPriority } from '@/generated/prisma/enums';

export const dynamic = 'force-dynamic';

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

const ALLOWED_ROLES = new Set(['authority_user', 'tenant_admin']);

export default async function StaffReportsPage({ searchParams }: PageProps) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role ?? '';
  if (!session || !ALLOWED_ROLES.has(role)) redirect('/403');

  const tenantId = (session.user as { tenantId?: string }).tenantId ?? '';
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));

  const [{ reports, total }, categories, tenant] = await Promise.all([
    getStaffReports(
      tenantId,
      {
        status: params.status as ReportStatus | undefined,
        categoryId: params.category,
        priority: params.priority as ReportPriority | undefined,
        search: params.search,
        sort: (params.sort as 'newest' | 'oldest' | 'updated' | 'priority') ?? 'newest',
      },
      page,
    ),
    getActiveCategories(),
    getTenantById(tenantId),
  ]);

  const tenantName = tenant?.name ?? 'your council';
  const hasFilters = !!(params.status || params.category || params.priority || params.search);

  return (
    <div className="page-shell">
      <header className="page-header flex items-start justify-between gap-6">
        <div>
          <p className="eyebrow">Council workspace</p>
          <h1 className="page-title mt-2">Reports</h1>
          <p className="page-description mt-3">
            Manage reports for <span className="font-medium text-foreground">{tenantName}</span>.
          </p>
        </div>
        <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface text-accent shadow-soft sm:flex">
          <ClipboardList className="h-5 w-5" aria-hidden="true" />
        </div>
      </header>
      <div className="mb-6">
        <StaffReportFilterBar categories={categories} />
      </div>
      <StaffReportTable reports={reports} total={total} page={page} hasFilters={hasFilters} searchParams={params} />
    </div>
  );
}
