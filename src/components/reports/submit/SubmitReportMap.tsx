"use client";

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useState, useEffect } from "react";

const UK_CENTER: [number, number] = [54.5, -3.5];
const UK_ZOOM = 6;

const PIN_ICON = L.divIcon({
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  html: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 2C9.37 2 4 7.37 4 14c0 8.75 12 16 12 16s12-7.25 12-16c0-6.63-5.37-12-12-12z"
          fill="oklch(74.5% 0.183 62.8)" stroke="#fff" stroke-width="1.5"/>
    <circle cx="16" cy="14" r="5" fill="#fff" opacity="0.95"/>
  </svg>`,
});

interface PinPlacerProps {
  onPin: (lat: number, lng: number) => void;
}

function PinPlacer({ onPin }: PinPlacerProps) {
  useMapEvents({
    click(e) {
      onPin(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface FlyToPos {
  lat: number;
  lng: number;
  zoom: number;
}

function MapFlyTo({ pos }: { pos: FlyToPos | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo([pos.lat, pos.lng], pos.zoom, { animate: true, duration: 1 });
  }, [map, pos]);
  return null;
}

export interface SubmitReportMapProps {
  onPinChange: (lat: number, lng: number) => void;
  pinLat: number | null;
  pinLng: number | null;
  flyToPos?: FlyToPos | null;
}

export default function SubmitReportMap({
  onPinChange,
  pinLat,
  pinLng,
  flyToPos,
}: SubmitReportMapProps) {
  const [dragging, setDragging] = useState(false);

  // Suppress "missing icon" Leaflet default in Next.js
  useEffect(() => {
    // already handled via custom divIcon — no default icon fix needed
  }, []);

  return (
    <MapContainer
      center={UK_CENTER}
      zoom={UK_ZOOM}
      className="h-full w-full z-0"
      scrollWheelZoom
      dragging
      zoomControl
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <MapFlyTo pos={flyToPos} />
      <PinPlacer onPin={onPinChange} />
      {pinLat !== null && pinLng !== null && (
        <Marker
          position={[pinLat, pinLng]}
          icon={PIN_ICON}
          draggable
          eventHandlers={{
            dragstart: () => setDragging(true),
            dragend: (e) => {
              setDragging(false);
              const { lat, lng } = (e.target as L.Marker).getLatLng();
              onPinChange(lat, lng);
            },
          }}
        />
      )}
      {/* Suppress unused dragging state warning */}
      {dragging && null}
    </MapContainer>
  );
}
