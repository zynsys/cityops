"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const PIN_ICON = L.divIcon({
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  html: `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2C8.48 2 4 6.48 4 12c0 7.5 10 14 10 14s10-6.5 10-14c0-5.52-4.48-10-10-10z"
          fill="#3B82F6" stroke="#fff" stroke-width="1.5"/>
    <circle cx="14" cy="12" r="4" fill="#fff" opacity="0.9"/>
  </svg>`,
});

interface ReportLocationMapProps {
  latitude: number;
  longitude: number;
}

export default function ReportLocationMap({
  latitude,
  longitude,
}: ReportLocationMapProps) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={15}
      className="h-full w-full z-0"
      scrollWheelZoom
      dragging
      zoomControl
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[latitude, longitude]} icon={PIN_ICON} />
    </MapContainer>
  );
}
