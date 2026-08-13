import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@auth";
import { getMyReports } from "@/db/queries/reports";
import { getPublicTenants } from "@/db/queries/tenants";
import MyReportsLayout from "@/components/reports/MyReportsLayout";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Reports — CityOps",
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    category?: string;
    council?: string;
    postcode?: string;
    city?: string;
    sort?: string;
  }>;
}

export default async function MyReportsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.userId) {
    redirect("/sign-in?callbackUrl=/my-reports");
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const status = params.status;
  const categorySlug = params.category;
  const councilSlug = params.council?.trim();
  const postcode = params.postcode?.trim();
  const city = params.city?.trim();
  const sort = (params.sort ?? "created_desc") as
    | "created_desc"
    | "updated_desc"
    | "created_asc"
    | "priority";
  const hasFilters = !!(status || categorySlug || councilSlug || postcode || city);

  const [{ reports, total, categories }, tenants] = await Promise.all([
    getMyReports(session.user.userId, page, {
      status,
      categorySlug,
      tenantSlug: councilSlug,
      postcode,
      city,
      sort,
    }),
    getPublicTenants(),
  ]);

  return (
    <MyReportsLayout
      reports={reports}
      total={total}
      categories={categories}
      tenants={tenants}
      currentPage={page}
      currentStatus={status ?? ""}
      currentCategory={categorySlug ?? ""}
      currentCouncil={councilSlug ?? ""}
      currentPostcode={postcode ?? ""}
      currentCity={city ?? ""}
      currentSort={sort}
      hasFilters={hasFilters}
    />
  );
}
