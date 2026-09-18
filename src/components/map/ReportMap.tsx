'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-markercluster/styles';
import './map-chrome.css';
import type { MapReport } from '@/db/queries/reports';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ArrowUpRight, GripHorizontal, MapPin } from 'lucide-react';
import Link from 'next/link';

import { useMemo, useRef, useCallback, useState, useEffect } from 'react';

const UK_CENTER: [number, number] = [54.5, -3.5];
const UK_ZOOM = 6;
const DEFAULT_PIN_COLOR = '#6B7280';

function createCategoryIcon(categoryColor: string | null): L.DivIcon {
  const color = categoryColor || DEFAULT_PIN_COLOR;
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

function createClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount();
  let size: 'small' | 'medium' | 'large';
  if (count < 10) size = 'small';
  else if (count < 100) size = 'medium';
  else size = 'large';

  const sizeMap = { small: 36, medium: 44, large: 52 };
  const px = sizeMap[size];

  return L.divIcon({
    html: `<div class="cluster-icon cluster-icon--${size}"><span>${count}</span></div>`,
    className: '',
    iconSize: L.point(px, px),
  });
}

interface FocusLocation {
  lat: number;
  lng: number;
  zoom: number;
}

function FlyToLocation({ location }: { location: FocusLocation }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([location.lat, location.lng], location.zoom, { duration: 1.5 });
  }, [map, location]);
  return null;
}

interface ReportMapProps {
  reports: MapReport[];
  focusLocation?: FocusLocation;
}

export default function ReportMap({ reports, focusLocation }: ReportMapProps) {
  const categories = useMemo(() => {
    const seen = new Map<string, { name: string; color: string }>();
    for (const report of reports) {
      if (!seen.has(report.category_slug)) {
        seen.set(report.category_slug, {
          name: report.category_name,
          color: report.category_color || DEFAULT_PIN_COLOR,
        });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [reports]);

  const legendRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    const rect = legendRef.current!.getBoundingClientRect();
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !legendRef.current) return;
    const parent = legendRef.current.parentElement!;
    const parentRect = parent.getBoundingClientRect();
    const elRect = legendRef.current.getBoundingClientRect();

    let x = e.clientX - parentRect.left - offset.current.x;
    let y = e.clientY - parentRect.top - offset.current.y;

    x = Math.max(0, Math.min(x, parentRect.width - elRect.width));
    y = Math.max(0, Math.min(y, parentRect.height - elRect.height));

    setPos({ x, y });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div className="relative h-full w-full bg-muted">
      <MapContainer center={UK_CENTER} zoom={UK_ZOOM} className="cityops-map z-0 h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {focusLocation && <FlyToLocation location={focusLocation} />}
        <MarkerClusterGroup
          showCoverageOnHover={false}
          zoomToBoundsOnClick
          spiderfyOnMaxZoom
          maxClusterRadius={1}
          disableClusteringAtZoom={8}
          iconCreateFunction={createClusterIcon}
          chunkedLoading
        >
          {reports.map((report) => {
            return (
              <Marker
                key={report.id}
                position={[report.latitude, report.longitude]}
                icon={createCategoryIcon(report.category_color)}
                title={report.title}
                alt={report.title}
              >
                <Popup>
                  <div className="report-popup min-w-[200px] max-w-[260px] text-foreground">
                    <div
                      className="max-h-[min(30dvh,14rem)] overflow-y-auto overscroll-contain rounded-md pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                      tabIndex={0}
                      role="region"
                      aria-label="Report summary"
                    >
                      <h2 className="mb-3 break-words pr-6 text-sm font-semibold leading-6">{report.title}</h2>
                      <StatusBadge status={report.status} />
                      <div className="mt-3 space-y-1.5 text-xs leading-5 text-muted-foreground">
                        <p className="m-0! flex items-start gap-2">
                          {report.category_color && (
                            <span
                              className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: report.category_color }}
                              aria-hidden="true"
                            />
                          )}
                          <span className="min-w-0 break-words">{report.category_name}</span>
                        </p>
                        <p className="m-0! break-words">{report.tenant_name}</p>
                        {report.location_text && <p className="m-0! break-words">{report.location_text}</p>}
                      </div>
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
        </MarkerClusterGroup>
      </MapContainer>

      {categories.length > 0 && (
        <div
          ref={legendRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={pos ? { left: pos.x, top: pos.y, bottom: 'auto', right: 'auto' } : undefined}
          className={`absolute z-10 max-h-[40vh] max-w-[calc(100%_-_2rem)] cursor-grab touch-none select-none overflow-y-auto rounded-xl border border-border bg-surface/95 p-4 shadow-raised backdrop-blur-sm active:cursor-grabbing ${
            pos ? '' : 'right-4 bottom-8'
          }`}
        >
          <h2 className="mb-3 flex items-center justify-between gap-4 text-sm font-semibold text-foreground">
            Categories
            <GripHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </h2>
          <ul className="space-y-2">
            {categories.map((cat) => (
              <li key={cat.name} className="flex items-start gap-2.5">
                <span
                  className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full border border-surface ring-1 ring-border"
                  style={{ backgroundColor: cat.color }}
                  aria-hidden="true"
                />
                <span className="min-w-0 break-words text-xs leading-5 text-muted-foreground sm:text-sm">
                  {cat.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reports.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
          <div className="pointer-events-auto max-w-sm rounded-2xl border border-border bg-surface/95 px-6 py-8 text-center shadow-raised backdrop-blur-sm">
            <MapPin className="mx-auto mb-4 h-7 w-7 text-accent" aria-hidden="true" />
            <p className="font-semibold text-foreground">No reports yet</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Reports will appear as pins on the map</p>
          </div>
        </div>
      )}
    </div>
  );
}
