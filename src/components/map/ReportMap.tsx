"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "react-leaflet-markercluster/styles";
import type { MapReport } from "@/db/queries/reports";
import { getStatusConfig } from "@/lib/reportStatusConfig";
import Link from "next/link";

import { useMemo, useRef, useCallback, useState, useEffect } from "react";

const UK_CENTER: [number, number] = [54.5, -3.5];
const UK_ZOOM = 6;
const DEFAULT_PIN_COLOR = "#6B7280";

function createCategoryIcon(categoryColor: string | null): L.DivIcon {
  const color = categoryColor || DEFAULT_PIN_COLOR;
  return L.divIcon({
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    html: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="pin-shadow" x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#000" flood-opacity="0.45"/>
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
  let size: "small" | "medium" | "large";
  if (count < 10) size = "small";
  else if (count < 100) size = "medium";
  else size = "large";

  const sizeMap = { small: 36, medium: 44, large: 52 };
  const px = sizeMap[size];

  return L.divIcon({
    html: `<div class="cluster-icon cluster-icon--${size}"><span>${count}</span></div>`,
    className: "",
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
    return Array.from(seen.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
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
    <div className="relative h-full w-full">
      <MapContainer
        center={UK_CENTER}
        zoom={UK_ZOOM}
        className="h-full w-full z-0"
        scrollWheelZoom
      >
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
            const statusCfg = getStatusConfig(report.status);
            return (
              <Marker
                key={report.id}
                position={[report.latitude, report.longitude]}
                icon={createCategoryIcon(report.category_color)}
              >
                <Popup>
                  <div className="report-popup min-w-[200px] max-w-[260px]">
                    <h3 className="font-semibold text-sm leading-snug line-clamp-2 mb-1.5">
                      {report.title}
                    </h3>
                    <span
                      className="inline-block text-xs font-medium px-2 py-0.5 rounded-full text-white mb-2"
                      style={{ backgroundColor: statusCfg.color }}
                    >
                      {statusCfg.label}
                    </span>
                    <div className="text-xs space-y-1 text-gray-600">
                      <p className="flex items-center gap-1.5">
                        {report.category_color && (
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: report.category_color }}
                          />
                        )}
                        {report.category_name}
                      </p>
                      <p>{report.tenant_name}</p>
                      {report.location_text && (
                        <p className="truncate">{report.location_text}</p>
                      )}
                    </div>
                    <Link
                      href={`/reports/${report.id}`}
                      className="inline-block mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      View details &rarr;
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
          style={
            pos
              ? { left: pos.x, top: pos.y, bottom: "auto", right: "auto" }
              : undefined
          }
          className={`absolute z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2.5 max-h-[40vh] overflow-y-auto cursor-grab active:cursor-grabbing select-none touch-none ${
            pos ? "" : "bottom-5 right-3"
          }`}
        >
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1.5 uppercase tracking-wide">
            Categories
          </h4>
          <ul className="space-y-1">
            {categories.map((cat) => (
              <li key={cat.name} className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-full shrink-0 border border-white"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {cat.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reports.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-surface/90 backdrop-blur-sm rounded-lg px-6 py-4 text-center shadow-lg pointer-events-auto">
            <p className="text-foreground font-medium">
              No reports yet
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Reports will appear as pins on the map
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
