'use client';

import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@/components/map/map-chrome.css';

const PIN_ICON = L.divIcon({
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  html: `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2C8.48 2 4 6.48 4 12c0 7.5 10 14 10 14s10-6.5 10-14c0-5.52-4.48-10-10-10z"
              fill="var(--color-accent)" stroke="var(--color-surface)" stroke-width="1.5"/>
            <circle cx="14" cy="12" r="4" fill="var(--color-surface)" opacity="0.9"/>
  </svg>`,
});

interface ReportLocationMapProps {
  latitude: number;
  longitude: number;
}

export default function ReportLocationMap({ latitude, longitude }: ReportLocationMapProps) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={15}
      className="cityops-map z-0 h-full w-full"
      scrollWheelZoom
      dragging
      zoomControl
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[latitude, longitude]} icon={PIN_ICON} title="Report location" alt="Report location" />
    </MapContainer>
  );
}
