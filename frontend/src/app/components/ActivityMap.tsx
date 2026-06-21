import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { decode } from "@googlemaps/polyline-codec"; 

function ChangeView({ bounds }: { bounds: any }) {
  const map = useMap();
  if (bounds.length > 0) map.fitBounds(bounds, { padding: [20, 20] });
  return null;
}

export default function ActivityMap({ polylineData }: { polylineData?: string }) {
  const [points, setPoints] = useState<[number, number][]>([]);

  useEffect(() => {
    if (polylineData) {
      try {
        const decoded = decode(polylineData);
        setPoints(decoded as [number, number][]);
      } catch (e) {
        console.error("Erreur décodage polyline", e);
      }
    }
  }, [polylineData]);

  return (
    <MapContainer 
      center={[48.8566, 2.3522]} 
      zoom={13} 
      style={{ height: "100%", width: "100%", zIndex: 1 }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {points.length > 0 && (
        <>
          <Polyline 
            positions={points} 
            pathOptions={{ color: '#4f46e5', weight: 4, opacity: 0.8 }} 
          />
          <ChangeView bounds={points} />
        </>
      )}
    </MapContainer>
  );
}