"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { 
  Zap, Heart, Timer, Mountain, Gauge, 
  Thermometer, ChevronLeft, Bike, Activity, Info
} from "lucide-react";

// Imports pour la Map
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import polyline from "polyline";

// Composant pour recentrer la carte dynamiquement sur le tracé
function RecenterMap({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [points, map]);
  return null;
}

export default function StravaActivityDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapPoints, setMapPoints] = useState<[number, number][]>([]);

  useEffect(() => {
    async function fetchActivity() {
      try {
        setLoading(true);
        const response = await axios.get(`/api/me/strava/get/activity/${id}`);
        setData(response.data);

        // Décodage de la polyline GPS
        if (response.data.details?.polyline) {
          const decoded = polyline.decode(response.data.details.polyline);
          setMapPoints(decoded as [number, number][]);
        }
      } catch (err: any) {
        console.error("Erreur:", err);
        setError("Impossible de charger les détails.");
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchActivity();
  }, [id]);

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-black italic">
        <Activity className="h-12 w-12 animate-spin text-orange-600 mb-4" />
        <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Loading Performance Data...</p>
    </div>
  );

  if (error || !data) return (
    <div className="flex h-screen flex-col items-center justify-center bg-black text-white p-6">
        <p className="text-red-500 mb-4 font-bold">{error || "Activité introuvable"}</p>
        <button onClick={() => router.back()} className="text-sm underline uppercase font-black">Retour</button>
    </div>
  );

  const details = data.details;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-10 font-sans">
      <div className="mx-auto max-w-6xl">
        
        {/* NAV */}
        <div className="mb-10 flex items-center justify-between">
          <button onClick={() => router.back()} className="group flex items-center gap-2 text-zinc-500 hover:text-white transition-all">
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
            <span className="text-xs font-black uppercase tracking-widest">Dashboard</span>
          </button>
        </div>

        {/* HEADER */}
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-orange-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                {data.type}
            </div>
            <span className="text-zinc-500 text-xs font-bold uppercase tracking-tighter">
                {new Date(data.startDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none mb-2">{data.name}</h1>
          <div className="flex items-center gap-2 text-zinc-400">
             <Bike size={14} />
             <span className="text-xs font-bold uppercase tracking-widest">{details?.device}</span>
          </div>
        </header>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="md:col-span-2 rounded-[2.5rem] bg-zinc-900 border border-zinc-800 p-8 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-orange-500 mb-8 font-black uppercase tracking-[0.2em] text-[10px]"><Zap size={20} fill="currentColor" /> Puissance</div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-zinc-500 text-[10px] font-bold uppercase">Moyenne</p>
                <p className="text-5xl font-black italic">{Math.round(details?.avgWatts || 0)}<span className="text-sm font-normal text-zinc-600 ml-1">W</span></p>
              </div>
              <div>
                <p className="text-zinc-500 text-[10px] font-bold uppercase">Max</p>
                <p className="text-5xl font-black italic text-orange-600">{details?.maxWatts || 0}<span className="text-sm font-normal text-zinc-600 ml-1">W</span></p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 rounded-[2.5rem] bg-white text-black p-8 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-red-600 font-black uppercase tracking-[0.2em] text-[10px]"><Heart size={20} fill="currentColor" /> Cardio</div>
            <div className="flex items-end gap-12 mt-6">
               <div><p className="text-zinc-400 text-[10px] font-bold uppercase">Moy.</p><p className="text-6xl font-black tracking-tighter">{Math.round(details?.avgHeartrate || 0)}</p></div>
               <div><p className="text-zinc-400 text-[10px] font-bold uppercase">Max</p><p className="text-3xl font-black text-red-600">{details?.maxHeartrate || 0}</p></div>
            </div>
          </div>

          <StatCard icon={<Timer />} label="Temps" value={formatTime(data.movingTime)} />
          <StatCard icon={<Mountain />} label="Dénivelé" value={`+${data.totalElevationGain}`} unit="m" />
          <StatCard icon={<Gauge />} label="Cadence" value={Math.round(details?.avgCadence || 0)} unit="rpm" />
          <StatCard icon={<Thermometer />} label="Temp." value={details?.avgTemp || "--"} unit="°C" />
        </div>

        {/* MAP SECTION */}
        <div className="rounded-[2.5rem] bg-zinc-900 border border-zinc-800 p-2 overflow-hidden relative">
            <div className="h-[450px] w-full rounded-[2rem] overflow-hidden z-0 grayscale-[0.8] hover:grayscale-0 transition-all duration-700">
                {mapPoints.length > 0 ? (
                    <MapContainer center={mapPoints[0]} zoom={13} scrollWheelZoom={false} className="h-full w-full">
                        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                        <Polyline positions={mapPoints} pathOptions={{ color: '#ea580c', weight: 4, opacity: 0.8 }} />
                        <RecenterMap points={mapPoints} />
                    </MapContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600 uppercase font-black text-[10px] tracking-widest">
                        <Bike size={48} className="mb-4 opacity-10" />
                        No GPS Data for this ride
                    </div>
                )}
            </div>

            {/* Altitudes Overlay */}
            <div className="absolute bottom-8 left-8 flex gap-4 z-[400]">
                <div className="bg-black/80 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl">
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Elevation High</p>
                    <p className="text-xl font-black italic">{details?.elevHigh}m</p>
                </div>
                <div className="bg-black/80 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl">
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Elevation Low</p>
                    <p className="text-xl font-black italic">{details?.elevLow}m</p>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ icon, label, value, unit }: any) {
    return (
        <div className="rounded-[2rem] bg-zinc-900 border border-zinc-800 p-6">
            <div className="text-orange-600 mb-4">{icon}</div>
            <p className="text-zinc-500 text-[10px] font-bold uppercase mb-1">{label}</p>
            <p className="text-2xl font-black italic">{value} <span className="text-[10px] font-normal text-zinc-600 uppercase">{unit}</span></p>
        </div>
    )
}

function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`;
}