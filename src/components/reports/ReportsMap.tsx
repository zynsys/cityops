'use client';

import { useRef, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@/components/map/map-chrome.css';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useReportsPageContext } from './ReportsPageContext';
import type { PublicReport } from '@/db/queries/reports';

const DEFAULT_PIN_COLOR = '#6B7280';
const UK_CENTER: [number, number] = [54.5, -3.5];
const UK_ZOOM = 6;

function createNormalIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    html: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="pin-shadow" x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#000" flood-opacity="0.22"/>
        </filter>
      </defs>
      <path d="M16 2C9.92 2 5 6.92 5 13c0 8.5 11 17 11 17s11-8.5 11-17c0-6.08-4.92-11-11-11z"
            fill="${color}" stroke="#fff" stroke-width="2" filter="url(#pin-shadow)"/>
      <circle cx="16" cy="13" r="4.5" fill="#fff"/>
    </svg>`,
  });
}

function createHighlightIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
    html: `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="pin-hl-shadow" x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.32"/>
        </filter>
      </defs>
      <path d="M20 2C12.82 2 7 7.82 7 15c0 10.5 13 23 13 23s13-12.5 13-23c0-7.18-5.82-13-13-13z"
            fill="${color}" stroke="#fff" stroke-width="2.5" filter="url(#pin-hl-shadow)"/>
      <circle cx="20" cy="15" r="6" fill="#fff"/>
    </svg>`,
  });
}

function FitBounds({ reports, boundaryGeoJSON }: { reports: PublicReport[]; boundaryGeoJSON: object | null }) {
  const map = useMap();

  useEffect(() => {
    // When a council boundary is available, fit to the boundary polygon
    if (boundaryGeoJSON) {
      const layer = L.geoJSON(boundaryGeoJSON as GeoJSON.GeoJsonObject);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], animate: false });
        return;
      }
    }

    // Fallback: fit to report pin coordinates
    const withCoords = reports.filter((r) => r.latitude != null && r.longitude != null);
    if (withCoords.length === 0) return;

    if (withCoords.length === 1) {
      map.setView([withCoords[0].latitude!, withCoords[0].longitude!], 15, { animate: false });
      return;
    }

    const lats = withCoords.map((r) => r.latitude!);
    const lngs = withCoords.map((r) => r.longitude!);
    map.fitBounds(L.latLngBounds([Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]), {
      padding: [40, 40],
      animate: false,
    });
  }, [map, reports, boundaryGeoJSON]);

  return null;
}

interface ReportsMapProps {
  reports: PublicReport[];
  councilSlug?: string;
  fitBounds?: boolean;
}

export default function ReportsMap({ reports, councilSlug, fitBounds = true }: ReportsMapProps) {
  const { hoveredId } = useReportsPageContext();
  const markerRefs = useRef<Record<number, L.Marker>>({});
  const reportsRef = useRef(reports);
  useEffect(() => {
    reportsRef.current = reports;
  }, [reports]);

  // Fetch council boundary GeoJSON when a council slug is provided
  const [boundaryData, setBoundaryData] = useState<{ slug: string; geojson: object } | null>(null);
  useEffect(() => {
    if (!councilSlug) return;
    let cancelled = false;
    fetch(`/api/analytics/boundary?council=${encodeURIComponent(councilSlug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.geojson) setBoundaryData({ slug: councilSlug, geojson: data.geojson });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [councilSlug]);

  // Only surface the boundary for the current slug so stale data clears on change.
  const boundaryGeoJSON = boundaryData && boundaryData.slug === councilSlug ? boundaryData.geojson : null;

  // Update marker icons when hoveredId changes
  useEffect(() => {
    Object.entries(markerRefs.current).forEach(([idStr, marker]) => {
      const id = Number(idStr);
      const report = reportsRef.current.find((r) => r.id === id);
      const color = report?.category_color ?? DEFAULT_PIN_COLOR;
      marker.setIcon(id === hoveredId ? createHighlightIcon(color) : createNormalIcon(color));
    });
  }, [hoveredId]);

  const reportsWithCoords = reports.filter((r) => r.latitude != null && r.longitude != null);

  return (
    <MapContainer
      center={UK_CENTER}
      zoom={UK_ZOOM}
      className="cityops-map z-0 h-full w-full"
      scrollWheelZoom
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {fitBounds && <FitBounds reports={reports} boundaryGeoJSON={boundaryGeoJSON} />}

      {/* Council boundary polygon */}
      {boundaryGeoJSON && (
        <GeoJSON
          key={councilSlug}
          data={boundaryGeoJSON as GeoJSON.GeoJsonObject}
          style={{
            color: '#ffffff',
            weight: 2.5,
            fill: false,
            opacity: 0.9,
          }}
        />
      )}

      {reportsWithCoords.map((report) => {
        return (
          <Marker
            key={report.id}
            position={[report.latitude!, report.longitude!]}
            icon={createNormalIcon(report.category_color ?? DEFAULT_PIN_COLOR)}
            title={report.title}
            alt={report.title}
            ref={(el) => {
              if (el) markerRefs.current[report.id] = el;
              else delete markerRefs.current[report.id];
            }}
          >
            <Popup>
              <div className="min-w-[180px] max-w-[240px] text-foreground">
                <div
                  className="max-h-[min(30dvh,14rem)] overflow-y-auto overscroll-contain rounded-md pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                  tabIndex={0}
                  role="region"
                  aria-label="Report summary"
                >
                  <p className="mt-0! mb-3! break-words pr-6 text-sm font-semibold leading-6">{report.title}</p>
                  <StatusBadge status={report.status} />
                </div>
                <Link
                  href={`/reports/${report.id}`}
                  className="mt-4 flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-3 text-sm font-medium text-accent! transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  View details
                  <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </Link>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
