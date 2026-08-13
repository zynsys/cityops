import type { Metadata } from "next";
import { getPublicReports, getPublicCategories } from "@/db/queries/reports";
import { getPublicTenants } from "@/db/queries/tenants";
import ReportsLayout from "@/components/reports/ReportsLayout";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reports – CityOps",
};

interface ReportsPageProps {
  searchParams: Promise<{
    council?: string;
    postcode?: string;
    city?: string;
    status?: string;
    category?: string;
    sort?: string;
    page?: string;
  }>;
}

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const council = params.council?.trim();
  const postcode = params.postcode?.trim();
  const city = params.city?.trim();

  const sort = (params.sort ?? "updated_desc") as
    | "updated_desc"
    | "created_desc"
    | "created_asc"
    | "priority";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const status = params.status;
  const categorySlug = params.category;

  const hasLocation = !!(council || postcode || city);

  // Always fetch — no location means all councils
  const [tenants, allCategories, { reports, total }] = await Promise.all([
    getPublicTenants(),
    getPublicCategories(),
    getPublicReports({ council, postcode, city, status, categorySlug, sort, page, pageSize: 20 }),
  ]);

  // Build the location heading
  let locationHeading: string | null = null;
  if (council) {
    locationHeading = reports[0]?.tenant_name ?? tenants.find((t) => t.slug === council)?.name ?? slugToTitle(council);
  } else if (postcode) {
    locationHeading = `Reports near ${postcode.toUpperCase()}`;
  } else if (city) {
    locationHeading = `Reports in ${city}`;
  }

  // Location-only params string (used in "Clear filters" links)
  const locationParams = new URLSearchParams();
  if (council) locationParams.set("council", council);
  else if (postcode) locationParams.set("postcode", postcode);
  else if (city) locationParams.set("city", city);

  return (
    <ReportsLayout
      reports={reports}
      total={total}
      categories={allCategories}
      tenants={tenants}
      currentPage={page}
      currentStatus={status ?? ""}
      currentCategory={categorySlug ?? ""}
      currentSort={sort}
      currentCouncil={council ?? ""}
      currentPostcode={postcode ?? ""}
      currentCity={city ?? ""}
      locationHeading={locationHeading}
      hasFilters={!!(status || categorySlug)}
      hasLocation={hasLocation}
      locationParams={locationParams.toString()}
      councilSlug={council}
    />
  );
}

