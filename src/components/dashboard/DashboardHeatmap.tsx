'use client';

import { MapContainer, TileLayer, useMap, GeoJSON, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@/components/map/map-chrome.css';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, MapPin } from 'lucide-react';
import type { HeatmapPoint } from '@/db/queries/analytics';

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
    [points],
  );

  useEffect(() => {
    if (heatData.length === 0) return;

    let heat: L.Layer | null = null;
    let cancelled = false;

    import('leaflet.heat').then(() => {
      if (cancelled) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      heat = (L as any).heatLayer(heatData, {
        radius: 20,
        blur: 15,
        maxZoom: 12,
        gradient: { 0.25: '#678CA4', 0.5: '#4D8F87', 0.75: '#A99562', 1: '#AA7259' },
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

function FitToBounds({
  points,
  geoJson,
  postcodeCenter,
}: {
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
      } catch {
        // Invalid/unsupported GeoJSON geometry — fall back to postcode/points bounds below.
      }
    }

    if (postcodeCenter) {
      map.setView(postcodeCenter, 13);
      return;
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number]));
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
      data={geoJson as Parameters<typeof GeoJSON>[0]['data']}
      style={{
        color: '#587C99',
        weight: 2,
        opacity: 0.8,
        fillColor: '#587C99',
        fillOpacity: 0.07,
      }}
    />
  );
}

export default function DashboardHeatmap({ points, councilSlug, postcode }: DashboardHeatmapProps) {
  const router = useRouter();
  const hasPoints = points.length > 0;

  const [councilData, setCouncilData] = useState<{ slug: string; geojson: GeoJsonGeometry } | null>(null);
  const [postcodeData, setPostcodeData] = useState<{ postcode: string; center: [number, number] } | null>(null);

  // Fetch council boundary GeoJSON
  useEffect(() => {
    if (!councilSlug) return;
    let cancelled = false;

    fetch(`/api/analytics/boundary?council=${encodeURIComponent(councilSlug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.geojson) setCouncilData({ slug: councilSlug, geojson: data.geojson });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [councilSlug]);

  // Geocode postcode or city name via Nominatim (OpenStreetMap)
  useEffect(() => {
    if (!postcode) return;

    const trimmed = postcode.trim();
    if (!trimmed) return;

    let cancelled = false;

    (async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1&countrycodes=gb`;
        const r = await fetch(url, {
          headers: { 'Accept-Language': 'en', 'User-Agent': 'CityOps/1.0' },
        });
        if (!r.ok) return;
        const results = await r.json();
        if (!cancelled && Array.isArray(results) && results[0]?.lat && results[0]?.lon) {
          setPostcodeData({ postcode, center: [Number(results[0].lat), Number(results[0].lon)] });
        }
      } catch {
        // Geocoding is best-effort — silently ignore network/parse failures.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [postcode]);

  // Only surface data that matches the current inputs, so stale results are
  // cleared as soon as councilSlug / postcode changes.
  const councilGeoJson = councilData && councilData.slug === councilSlug ? councilData.geojson : null;
  const postcodeCenter = postcodeData && postcodeData.postcode === postcode ? postcodeData.center : null;

  const handleViewFullMap = () => {
    const url = councilSlug ? `/map?council=${encodeURIComponent(councilSlug)}` : '/map';
    router.push(url);
  };

  return (
    <div className="surface-card overflow-hidden">
      {/* Section Header */}
      <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Report density</h2>
            <p className="mt-1 text-sm text-muted-foreground">Geographic concentration of reported issues</p>
          </div>
        </div>
        <div
          className="flex items-center gap-2 text-xs text-muted-foreground"
          role="img"
          aria-label="Heatmap density scale: low to high"
        >
          <span>Low</span>
          <span
            className="h-2 w-24 rounded-full"
            style={{ background: 'linear-gradient(to right, #678CA4, #4D8F87, #A99562, #AA7259)' }}
            aria-hidden="true"
          />
          <span>High density</span>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative h-[250px] md:h-[400px]">
        <MapContainer
          center={UK_CENTER}
          zoom={UK_ZOOM}
          scrollWheelZoom={false}
          className="cityops-map h-full w-full z-0"
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
                color: '#AA925D',
                weight: 2,
                opacity: 0.8,
                fillColor: '#AA925D',
                fillOpacity: 0.1,
              }}
            />
          )}

          {hasPoints && <HeatLayer points={points} />}

          <FitToBounds points={points} geoJson={councilGeoJson} postcodeCenter={postcodeCenter} />
        </MapContainer>

        {/* Empty state overlay */}
        {!hasPoints && (
          <div className="absolute inset-0 flex items-center justify-center z-[500] pointer-events-none">
            <div className="mx-4 rounded-xl border border-border bg-surface/95 px-5 py-4 text-center shadow-soft backdrop-blur-sm">
              <p className="text-sm text-foreground">No location data for the selected period.</p>
            </div>
          </div>
        )}

        {/* View full map button */}
        <div className="absolute bottom-3 right-3 z-[500]">
          <button onClick={handleViewFullMap} className="btn-secondary shadow-soft">
            View full map
            <ArrowUpRight className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
