"use client";

import { MapContainer, TileLayer, useMap, GeoJSON, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { HeatmapPoint } from "@/db/queries/analytics";

const UK_CENTER: [number, number] = [54.5, -3.5];
const UK_ZOOM = 6;

interface DashboardHeatmapProps {
  points: HeatmapPoint[];
  councilSlug?: string;
  postcode?: string;
}

function HeatLayer({ points }: { points: HeatmapPoint[] }) {
  const map = useMap();

  const heatData = useMemo(
    () => points.map((p) => [p.latitude, p.longitude, p.intensity] as [number, number, number]),
    [points]
  );

  useEffect(() => {
    if (heatData.length === 0) return;

    let heat: L.Layer | null = null;
    let cancelled = false;

    import("leaflet.heat").then(() => {
      if (cancelled) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      heat = (L as any).heatLayer(heatData, {
        radius: 20,
        blur: 15,
        maxZoom: 12,
      });
      heat!.addTo(map);
    });

    return () => {
      cancelled = true;
      if (heat) map.removeLayer(heat);
    };
  }, [map, heatData]);

  return null;
}

function FitToBounds({ points, geoJson, postcodeCenter }: {
  points: HeatmapPoint[];
  geoJson: GeoJsonGeometry | null;
  postcodeCenter: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (geoJson) {
      try {
        const layer = L.geoJSON(geoJson as Parameters<typeof L.geoJSON>[0]);
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20] });
          return;
        }
      } catch {}
    }

    if (postcodeCenter) {
      map.setView(postcodeCenter, 13);
      return;
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(
        points.map((p) => [p.latitude, p.longitude] as [number, number])
      );
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, geoJson, postcodeCenter]);

  return null;
}

// Minimal GeoJSON geometry type accepted by Leaflet
type GeoJsonGeometry = { type: string; coordinates: unknown };

function CouncilBoundaryLayer({ geoJson }: { geoJson: GeoJsonGeometry }) {
  return (
    <GeoJSON
      // key forces re-render on slug change
      key={JSON.stringify(geoJson).slice(0, 60)}
      data={geoJson as Parameters<typeof GeoJSON>[0]["data"]}
      style={{
        color: "#3B82F6",
        weight: 2,
        opacity: 0.8,
        fillColor: "#3B82F6",
        fillOpacity: 0.07,
      }}
    />
  );
}

export default function DashboardHeatmap({ points, councilSlug, postcode }: DashboardHeatmapProps) {
  const router = useRouter();
  const hasPoints = points.length > 0;

  const [councilGeoJson, setCouncilGeoJson] = useState<GeoJsonGeometry | null>(null);
  const [postcodeCenter, setPostcodeCenter] = useState<[number, number] | null>(null);

  // Fetch council boundary GeoJSON
  useEffect(() => {
    setCouncilGeoJson(null);
    if (!councilSlug) return;

    fetch(`/api/analytics/boundary?council=${encodeURIComponent(councilSlug)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.geojson) setCouncilGeoJson(data.geojson);
      })
      .catch(() => {});
  }, [councilSlug]);

  // Geocode postcode or city name via Nominatim (OpenStreetMap)
  useEffect(() => {
    setPostcodeCenter(null);
    if (!postcode) return;

    const trimmed = postcode.trim();
    if (!trimmed) return;

    (async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1&countrycodes=gb`;
        const r = await fetch(url, {
          headers: { "Accept-Language": "en", "User-Agent": "CityOps/1.0" },
        });
        if (!r.ok) return;
        const results = await r.json();
        if (Array.isArray(results) && results[0]?.lat && results[0]?.lon) {
          setPostcodeCenter([Number(results[0].lat), Number(results[0].lon)]);
        }
      } catch {}
    })();
  }, [postcode]);

  const handleViewFullMap = () => {
    const url = councilSlug ? `/map?council=${encodeURIComponent(councilSlug)}` : "/map";
    router.push(url);
  };

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Section Header */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Report Density</h3>
      </div>

      {/* Map Container */}
      <div className="relative h-[250px] md:h-[400px]">
        <MapContainer
          center={UK_CENTER}
          zoom={UK_ZOOM}
          scrollWheelZoom={false}
          className="h-full w-full z-0"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Council boundary polygon */}
          {councilGeoJson && <CouncilBoundaryLayer geoJson={councilGeoJson} />}

          {/* Postcode circle — 2 km radius */}
          {postcodeCenter && (
            <Circle
              center={postcodeCenter}
              radius={2000}
              pathOptions={{
                color: "#F59E0B",
                weight: 2,
                opacity: 0.8,
                fillColor: "#F59E0B",
                fillOpacity: 0.1,
              }}
            />
          )}

          {hasPoints && <HeatLayer points={points} />}

          <FitToBounds
            points={points}
            geoJson={councilGeoJson}
            postcodeCenter={postcodeCenter}
          />
        </MapContainer>

        {/* Empty state overlay */}
        {!hasPoints && (
          <div className="absolute inset-0 flex items-center justify-center z-[500] pointer-events-none">
            <div className="bg-background/80 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-sm text-muted-foreground">
                No location data for the selected period.
              </p>
            </div>
          </div>
        )}

        {/* View full map button */}
        <div className="absolute bottom-3 right-3 z-[500]">
          <button
            onClick={handleViewFullMap}
            className="bg-background/80 backdrop-blur-sm text-foreground text-sm font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-background/95 transition-colors cursor-pointer"
          >
            View full map &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

