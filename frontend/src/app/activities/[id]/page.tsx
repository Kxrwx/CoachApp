"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  FileCode, 
  Trash2, 
  Loader2, 
  ArrowLeft, 
  MapPin, 
  Gauge, 
  Heart, 
  Zap, 
  Calendar, 
  Clock, 
  TrendingUp,
  Thermometer,
  Flame,
  Activity,
  Cpu
} from "lucide-react";
import { faStrava } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import dynamic from "next/dynamic";

const ActivityMap = dynamic<{ polylineData: string }>(
  () => import("@/app/components/ActivityMap"), 
  { 
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-slate-900 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-500">
        Chargement du tracé GPS...
      </div>
    )
  }
);

// --- HELPERS DE FORMATTAGE NETTOYÉS ---
const formatDistance = (meters: number) => (meters ? (meters / 1000).toFixed(2) : "0.00");

const formatDuration = (seconds: number) => {
  if (!seconds) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
};

// Pas de multiplication par 3.6 pour le FIT car le Back renvoie déjà des km/h !
const formatStravaSpeed = (mps: number) => (mps ? (mps * 3.6).toFixed(1) : "--");
const formatFitSpeed = (
  kmh: number | null | undefined,
) =>
  kmh !== null &&
  kmh !== undefined
    ? kmh.toFixed(1)
    : "--";

const formatStravaPace = (mps: number) => {
  if (!mps || mps === 0) return "--";
  const minPerKm = 16.6667 / mps;
  const mins = Math.floor(minPerKm);
  const secs = Math.floor((minPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function ActivityDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [activity, setActivity] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"strava" | "upload">("strava");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchActivityDetail = async () => {
      try {
        const res = await api(`/activities/${id}`);
        if (res.ok) {
          const data = await res.json();
          setActivity(data);
          setViewMode(data.idStrava ? "strava" : "upload");
        }
      } catch (err) {
        console.error("Erreur récupération activité:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivityDetail();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("Supprimer définitivement cette activité et toutes ses données Cloud R2 ?")) return;
    setDeleting(true);
    try {
      const res = await api(`/activities/${id}`, { method: "DELETE" });
      if (res.ok) router.push("/activities");
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-slate-950 text-white">
        <h1 className="text-xl font-black italic uppercase">Activité introuvable</h1>
        <button onClick={() => router.push("/activities")} className="text-xs font-bold text-indigo-400 underline">
          Retour
        </button>
      </div>
    );
  }

  // --- INTERACTION DIRECTE AVEC LE BACK-END ---
  const sd = activity.stravaDetail || {};
  
  const fitStats = activity.decodedFileData?.stats || {};

const isRide =
  ["Ride", "VirtualRide"].includes(sd.type) ||
  [
    "cycling",
    "bike",
    "biking",
    "road_biking",
  ].includes(fitStats.sport);

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 pt-8 text-slate-900 animate-fadeIn">
      
      {/* CONTROL BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <button 
          onClick={() => router.push("/activities")} 
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-all"
        >
          <ArrowLeft size={14} /> Retour au Dashboard
        </button>
        
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button 
            onClick={() => setViewMode("strava")} 
            disabled={!activity.idStrava}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === "strava" ? "bg-white text-orange-600 shadow-sm" : "text-slate-400 opacity-30 cursor-not-allowed"
            }`}
          >
            <FontAwesomeIcon icon={faStrava} /> Données Strava Cloud
          </button>
          <button 
            onClick={() => setViewMode("upload")} 
            disabled={!activity.idUpload}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === "upload" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 opacity-30 cursor-not-allowed"
            }`}
          >
            <FileCode size={14} /> Métriques Fichier .FIT
          </button>
        </div>
      </div>

      {/* DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* MAP & CORE STATS BOX */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* GPS Visualizer */}
          <div className="h-[460px] bg-slate-900 rounded-[2.5rem] overflow-hidden relative border border-slate-100 shadow-xl shadow-slate-100">
            {activity.stravaPolylineContent ? (
              <ActivityMap polylineData={activity.stravaPolylineContent} />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-slate-500 bg-slate-950">
                <MapPin size={24} className="text-slate-800" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Aucune coordonnée GPS brute dans R2</p>
              </div>
            )}
            <div className="absolute top-6 left-6 z-[400]">
              <span className="bg-slate-950/90 backdrop-blur-md text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/10">
                {sd.type || fitStats.sport || activity.displayInfo?.type || "Workout"} Engine
              </span>
            </div>
          </div>

          {/* DYNAMIC METRICS MATRIX */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {viewMode === "strava" ? (
              <>
                <StatCard icon={<MapPin />} label="Distance" value={formatDistance(sd.distance)} unit="km" color="text-orange-600" />
                <StatCard icon={<Clock />} label="Effort Actif" value={formatDuration(sd.movingTime)} unit="" />
                <StatCard icon={<Gauge />} label={isRide ? "Vitesse Moy." : "Allure Moy."} value={isRide ? formatStravaSpeed(sd.distance / sd.movingTime) : formatStravaPace(sd.distance / sd.movingTime)} unit={isRide ? "km/h" : "/km"} />
                <StatCard icon={<TrendingUp />} label="Dénivelé +" value={sd.totalElevationGain?.toFixed(0) || "0"} unit="m" />
              </>
            ) : (
              <>
                <StatCard icon={<MapPin />} label="Distance (.FIT)" value={formatDistance(fitStats.total_distance)} unit="km" color="text-indigo-600" />
                <StatCard icon={<Clock />} label="Temps Actif" value={formatDuration(fitStats.total_timer_time || fitStats.total_elapsed_time)} unit="" />
                <StatCard
  icon={<Gauge />}
  label="Vitesse Moy."
  value={formatFitSpeed(
    fitStats.avg_speed,
  )}
  unit="km/h"
/>
                <StatCard icon={<Zap />} label="Puissance Moy." value={fitStats.avg_power || "--"} unit="W" />
              </>
            )}
          </div>

          {/* EXTRA STATS BLOCK */}
          <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <Activity size={14} /> Toutes les données récoltées de la session
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {viewMode === "strava" ? (
                <>
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-orange-600 mb-2">Physiologique & Capteurs</h4>
                    <DataRow label="Puissance moyenne" value={sd.avgWatts ? `${sd.avgWatts} W` : "Pas de capteur"} />
                    <DataRow label="Fréquence Cardiaque Moy." value={sd.avgHeartrate ? `${sd.avgHeartrate} bpm` : "--"} />
                    <DataRow label="Fréquence Cardiaque Max." value={sd.maxHeartrate ? `${sd.maxHeartrate} bpm` : "--"} />
                    <DataRow label="Cadence moyenne" value={sd.avgCadence ? `${sd.avgCadence} rpm` : "--"} />
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Structure de Temps & Environnement</h4>
                    <DataRow label="Temps total écoulé" value={formatDuration(sd.elapsedTime)} />
                    <DataRow label="Ratio d'effort actif" value={sd.elapsedTime ? `${((sd.movingTime / sd.elapsedTime) * 100).toFixed(1)}%` : "--"} />
                    <DataRow label="Température moyenne" value={sd.avgTemp ? `${sd.avgTemp}°C` : "--"} />
                    <DataRow label="Calories dépensées" value={sd.calories ? `${sd.calories} kcal` : "--"} />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-600 mb-2">Données Capteurs (.FIT)</h4>
                    <DataRow label="Puissance Max" value={fitStats.max_power ? `${fitStats.max_power} W` : "--"} />
                    <DataRow label="Fréquence Cardiaque" value={fitStats.avg_heart_rate ? `${fitStats.avg_heart_rate} bpm` : "--"} />
                    <DataRow label="Fréquence Cardiaque Max" value={fitStats.max_heart_rate ? `${fitStats.max_heart_rate} bpm` : "--"} />
                    <DataRow label="Cadence Moyenne" value={fitStats.avg_cadence ? `${fitStats.avg_cadence} rpm` : "--"} />
                    <DataRow label="Cadence Max" value={fitStats.max_cadence ? `${fitStats.max_cadence} rpm` : "--"} />
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Totaux Géométriques & Fichier</h4>
                    <DataRow
  label="Vitesse Max"
  value={
    fitStats.max_speed !== null &&
    fitStats.max_speed !== undefined
      ? `${formatFitSpeed(
          fitStats.max_speed,
        )} km/h`
      : "--"
  }
/>
                    <DataRow label="Ascension Cumulée" value={fitStats.total_ascent ? `${fitStats.total_ascent.toFixed(0)} m` : "--"} />
                    <DataRow label="Descente Cumulée" value={fitStats.total_descent ? `${fitStats.total_descent.toFixed(0)} m` : "--"} />
                    <DataRow label="Temps Global" value={formatDuration(fitStats.total_elapsed_time)} />
                    <DataRow label="Nombre de Laps (Tours)" value={activity.decodedFileData?.laps?.length || "1"} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* CONTROLS & DEVICE METADATA SIDEBAR */}
        <div className="space-y-6">
          
          {/* Summary Dark Card */}
          <div className="bg-slate-950 rounded-[2.5rem] p-8 text-white shadow-2xl">
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">
              {viewMode === "strava" ? "Données Extrapolées Strava" : "Fichier Source Binaire"}
            </p>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-tight mb-6 break-words">
              {sd.name || activity.displayInfo?.name || "Session d'Entraînement"}
            </h1>
            
            <div className="space-y-4 mb-8 border-t border-b border-slate-900 py-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                  <Calendar size={14} className="text-slate-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Date d'enregistrement</span>
                  <span className="text-xs font-bold text-slate-200">
                    {format(new Date(activity.startDate), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                  <Cpu size={14} className="text-slate-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Appareil Hardware</span>
                  <span className="text-xs font-bold text-slate-200 truncate max-w-[180px]">
                    {
  sd.device ||
  activity.decodedFileData?.file_ids?.[0]
    ?.product_name ||
  "Compteur / Montre GPS"
}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                <Flame size={16} className="text-orange-500 mx-auto mb-1" />
                <span className="text-[9px] block text-slate-500 font-black uppercase tracking-wider">Energie</span>
                <span className="text-sm font-black italic">
                  {viewMode === "strava" ? (sd.calories || "--") : (fitStats.total_calories || "--")}{" "}
                  <span className="text-[9px] font-normal not-italic text-slate-400">kcal</span>
                </span>
              </div>
              <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                <Thermometer size={16} className="text-blue-400 mx-auto mb-1" />
                <span className="text-[9px] block text-slate-500 font-black uppercase tracking-wider">Temp. Moy.</span>
                <span className="text-sm font-black italic">{sd.avgTemp || "--"}<span className="text-[9px] font-normal not-italic text-slate-400">°C</span></span>
              </div>
            </div>
          </div>

          {/* Technical System Meta Card */}
          <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Fichiers Stockage Cloud</p>
            <div className="space-y-3">
              <MetaRow
  label="Activity Core ID"
  value={
    activity.id
      ? activity.id.substring(0, 18) + "..."
      : "N/A"
  }
/>
              <MetaRow label="Index Global Strava" value={activity.idStrava ? activity.idStrava : "Aucun"} />
              <MetaRow label="Référence S3 Key" value={activity.uploadDetail?.dataId ? "S3.FIT Object" : "Aucun"} />
              <MetaRow label="Objets R2 Liés" value={`${activity.storage?.length || 0} fichier(s)`} color="text-indigo-600 font-bold" />
            </div>
            
            <button 
              onClick={handleDelete}
              disabled={deleting}
              className="w-full mt-8 flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 border border-red-100 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {deleting ? <Loader2 className="animate-spin" size={14} /> : <><Trash2 size={14} /> Supprimer l'activité</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- SOUS COMPOSANTS UTILS REUTILISABLES ---

function StatCard({ icon, label, value, unit, color = "text-slate-900" }: any) {
  return (
    <div className="bg-white border border-slate-200/60 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
      <div className="text-slate-400 mb-4">{icon}</div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-black italic tracking-tighter uppercase ${color}`}>{value}</span>
          {unit && <span className="text-[10px] font-black text-slate-400 uppercase">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-xs">
      <span className="text-slate-500 font-medium">{label}</span>
      <span className="font-bold text-slate-900">{value}</span>
    </div>
  );
}

function MetaRow({ label, value, color = "text-slate-800" }: any) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
      <span className={`text-[10px] font-mono ${color}`}>{value}</span>
    </div>
  );
}