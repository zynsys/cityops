import { getMapReports } from "@/db/queries/reports";
import ReportMapLoader from "@/components/map/ReportMapLoader";

interface MapPageProps {
  searchParams: Promise<{ lat?: string; lng?: string; zoom?: string }>;
}

export default async function MapPage({ searchParams }: MapPageProps) {
  const params = await searchParams;
  let reports = await getMapReports();
  if (!reports) reports = [];

  const focusLocation =
    params.lat && params.lng
      ? {
          lat: parseFloat(params.lat),
          lng: parseFloat(params.lng),
          zoom: params.zoom ? parseInt(params.zoom, 10) : 16,
        }
      : undefined;

  return (
    <div className="h-[calc(100dvh-65px)] w-full overflow-hidden">
      <ReportMapLoader reports={reports} focusLocation={focusLocation} />
    </div>
  );
}
