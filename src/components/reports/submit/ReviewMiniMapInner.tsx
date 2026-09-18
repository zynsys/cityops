'use client';

import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@/components/map/map-chrome.css';

const PIN_ICON = L.divIcon({
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  html: `<svg width="28" height="28" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M16 2C9.37 2 4 7.37 4 14c0 8.75 12 16 12 16s12-7.25 12-16c0-6.63-5.37-12-12-12z"
          fill="var(--color-accent)" stroke="var(--color-surface)" stroke-width="1.5"/>
    <circle cx="16" cy="14" r="5" fill="var(--color-accent-foreground)" opacity="0.95"/>
  </svg>`,
});

export interface ReviewMiniMapInnerProps {
  lat: number;
  lng: number;
}

export default function ReviewMiniMapInner({ lat, lng }: ReviewMiniMapInnerProps) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      className="cityops-map h-full w-full z-0"
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      keyboard={false}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[lat, lng]} icon={PIN_ICON} title="Report location" alt="Report location" />
    </MapContainer>
  );
}
