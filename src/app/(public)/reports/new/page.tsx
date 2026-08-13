import { getActiveTenants } from "@/db/queries/tenants";
import { getActiveCategories } from "@/db/queries/categories";
import NewReportWizard from "./NewReportWizard";

export const metadata = { title: "Submit a Report – CityOps" };

export default async function NewReportPage() {
  const [tenants, categories] = await Promise.all([
    getActiveTenants(),
    getActiveCategories(),
  ]);
  return <NewReportWizard tenants={tenants} categories={categories} />;
}
