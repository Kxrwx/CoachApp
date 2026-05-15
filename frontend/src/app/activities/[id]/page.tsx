"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  FileCode, 
  Trash2, 
  Loader2, 
  ArrowLeft, 
  Download, 
  MapPin, 
  Gauge, 
  Heart, 
  Zap, 
  Calendar, 
  Clock, 
  TrendingUp 
} from "lucide-react";
import { faStrava } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Import dynamique de la Map pour éviter les crashs SSR de Leaflet
import dynamic from "next/dynamic";
const ActivityMap = dynamic< { polylineData: string } >(
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

// Helpers de conversion pour l'affichage des données brutes de Strava
const formatDistance = (meters: number) => (meters / 1000).toFixed(2);

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m} min`;
};

const formatPace = (metersPerSecond: number) => {
  if (!metersPerSecond || metersPerSecond === 0) return "--";
  // Conversion m/s en min/km
  const minPerKm = 16.6667 / metersPerSecond;
  const mins = Math.floor(minPerKm);
  const secs = Math.floor((minPerKm - mins) * 60);
  return `${mins}'${secs.toString().padStart(2, "0")}`;
};

const formatSpeed = (metersPerSecond: number) => {
  if (!metersPerSecond) return "--";
  return (metersPerSecond * 3.6).toFixed(1);
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
          // Aligne le mode d'affichage par défaut selon la data dispo
          setViewMode(data.idStrava ? "strava" : "upload");
        } else {
          console.error("Erreur lors de la récupération de l'activité");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivityDetail();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette activité ainsi que ses fichiers associés ?")) return;
    setDeleting(true);
    try {
      const res = await api(`/activities/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/activities");
      }
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
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Erreur 404</p>
        <h1 className="text-xl font-black italic uppercase">Activité introuvable</h1>
        <button onClick={() => router.push("/activities")} className="text-xs font-bold text-indigo-400 underline">
          Retourner aux activités
        </button>
      </div>
    );
  }

  const isRide = activity.stravaDetail?.type === "Ride";

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 pt-8 text-slate-900">
      
      {/* HEADER CONTROL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <button 
          onClick={() => router.push("/activities")} 
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-colors"
        >
          <ArrowLeft size={14} /> Retour à la liste
        </button>
        
        {/* Toggle Onglet de données source */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start sm:self-auto">
          <button 
            onClick={() => setViewMode("strava")} 
            disabled={!activity.idStrava}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === "strava" ? "bg-white text-orange-600 shadow-sm" : "text-slate-400 opacity-40 cursor-not-allowed"
            }`}
          >
            <FontAwesomeIcon icon={faStrava} /> Données Strava
          </button>
          <button 
            onClick={() => setViewMode("upload")} 
            disabled={!activity.idUpload}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === "upload" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 opacity-40 cursor-not-allowed"
            }`}
          >
            <FileCode size={14} /> Analyse Fichier .FIT
          </button>
        </div>
      </div>

      {/* DASHBOARD CORPS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLONNE GAUCHE & CENTRALE (CARTE + STATS) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Bloc de la Carte GPS */}
          <div className="h-[480px] bg-slate-900 rounded-[2.5rem] overflow-hidden relative shadow-xl shadow-slate-100 border border-slate-100">
            {activity.stravaPolylineContent ? (
              <ActivityMap polylineData={activity.stravaPolylineContent} />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-slate-500 bg-slate-950">
                <MapPin size={24} className="text-slate-700" />
                <p className="text-[10px] font-black uppercase tracking-widest">Aucun tracé GPS synchronisé dans R2</p>
              </div>
            )}
            <div className="absolute top-6 left-6 z-[400]">
              <div className="bg-slate-900/90 backdrop-blur-md text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/10">
                {activity.stravaDetail?.type || "Workout"} Trace
              </div>
            </div>
          </div>

          {/* Grille des Métriques d'Analyse */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {viewMode === "strava" ? (
              <>
                <StatCard 
                  icon={<MapPin size={16} />} 
                  label="Distance totale" 
                  value={activity.stravaDetail ? formatDistance(activity.stravaDetail.distance) : "--"} 
                  unit="km" 
                  color="text-orange-600" 
                />
                <StatCard 
                  icon={<Clock size={16} />} 
                  label="Durée d'effort" 
                  value={activity.stravaDetail ? formatDuration(activity.stravaDetail.movingTime) : "--"} 
                  unit="" 
                />
                <StatCard 
                  icon={<Gauge size={16} />} 
                  label={isRide ? "Vitesse moyenne" : "Allure moyenne"} 
                  value={activity.stravaDetail ? (isRide ? formatSpeed(activity.stravaDetail.distance / activity.stravaDetail.movingTime) : formatPace(activity.stravaDetail.distance / activity.stravaDetail.movingTime)) : "--"} 
                  unit={isRide ? "km/h" : "/km"} 
                />
                <StatCard 
                  icon={<TrendingUp size={16} />} 
                  label="Dénivelé +" 
                  value={activity.stravaDetail?.totalElevationGain?.toFixed(0) || "0"} 
                  unit="m" 
                />
              </>
            ) : (
              <>
                <StatCard 
                  icon={<FileCode size={16} />} 
                  label="Format Source" 
                  value="FIT" 
                  unit="Binary" 
                  color="text-indigo-600" 
                />
                <StatCard 
                  icon={<Zap size={16} />} 
                  label="Watts Moyens (FIT)" 
                  value={activity.decodedFileData?.stats?.avg_power || "--"} 
                  unit="W" 
                />
                <StatCard 
                  icon={<Heart size={16} />} 
                  label="Fréquence Cardiaque" 
                  value={activity.decodedFileData?.stats?.avg_heart_rate || "--"} 
                  unit="bpm" 
                />
                <StatCard 
                  icon={<Download size={16} />} 
                  label="Statut Fichier" 
                  value="Analysé" 
                  unit="R2 Cloud" 
                />
              </>
            )}
          </div>
        </div>

        {/* COLONNE DROITE (INFO & COMPLEMENTS) */}
        <div className="space-y-6">
          
          {/* Card Sommaire Principal (Dark Theme) */}
          <div className="bg-slate-950 rounded-[2.5rem] p-8 text-white shadow-2xl">
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">
              {viewMode === "strava" ? "Rapport d'activité Strava" : "Analyse Extrapolée du FIT"}
            </p>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-tight mb-6">
              {activity.stravaDetail?.name || "Session sans titre"}
            </h1>
            
            <div className="space-y-4 mb-8 border-t border-b border-slate-800 py-6">
              <div className="flex items-center gap-3 text-slate-400">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white border border-white/5">
                  <Calendar size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Date de session</span>
                  <span className="text-xs font-bold text-slate-200">
                    {format(new Date(activity.startDate), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                  </span>
                </div>
              </div>

              {activity.stravaDetail?.avgWatts && (
                <div className="flex items-center gap-3 text-slate-400">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white border border-white/5">
                    <Zap size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Puissance Moyenne Strava</span>
                    <span className="text-xs font-bold text-slate-200">{activity.stravaDetail.avgWatts} Watts</span>
                  </div>
                </div>
              )}
            </div>

            <button className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-lg shadow-indigo-600/20">
              Générer l'audit Export
            </button>
          </div>

          {/* Card Métadonnées Techniques */}
          <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Metadata System</p>
            <div className="space-y-3">
              <MetaRow label="UUID Activité" value={activity.id.substring(0, 13) + "..."} />
              <MetaRow label="Liaison Strava" value={activity.idStrava ? `ID: ${activity.idStrava}` : "Non liée"} />
              <MetaRow label="Liaison Fichier" value={activity.idUpload ? "Lié (.FIT)" : "Non liée"} />
              <MetaRow 
                label="Fichiers R2" 
                value={`${activity.storage?.length || 0} fichier(s)`} 
                color="text-indigo-600 font-bold" 
              />
            </div>
            
            <button 
              onClick={handleDelete}
              disabled={deleting}
              className="w-full mt-8 flex items-center justify-center gap-2 text-red-500 hover:bg-red-50/50 border border-red-100 hover:border-red-200 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <>
                  <Trash2 size={14} /> Supprimer la session
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- SOUS COMPOSANTS UTILITAIRES ---

function StatCard({ icon, label, value, unit, color = "text-slate-900" }: any) {
  return (
    <div className="bg-white border border-slate-200/60 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
      <div className="text-slate-400 mb-4">{icon}</div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-black italic tracking-tighter uppercase ${color}`}>
            {value}
          </span>
          {unit && <span className="text-[10px] font-black text-slate-400 uppercase">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value, color = "text-slate-800" }: any) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
      <span className={`text-[10px] font-mono uppercase ${color}`}>{value}</span>
    </div>
  );
}