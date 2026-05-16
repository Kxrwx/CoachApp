// app/activities/[id]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileCode, Trash2, Loader2, ArrowLeft, MapPin, Calendar, Thermometer, Flame, Cpu } from "lucide-react";
import { faStrava } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import dynamic from "next/dynamic";

// Imports locaux
import StravaView from "../../components/page/activities/StravaView";
import UploadView from "../../components/page/activities/UploadView";
import { MetaRow } from "../../components/UICores";

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

  if (!activity) return null;

  const sd = activity.stravaDetail || {};
  const fitStats = activity.decodedFileData?.stats || {};
  const charts = activity.decodedFileData?.charts || {};
  const records = activity.decodedFileData?.records || [];
  const isRide = ["Ride", "VirtualRide"].includes(sd.type) || ["cycling", "bike", "biking", "road_biking"].includes(fitStats.sport);

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
            <FontAwesomeIcon icon={faStrava} /> Données Strava
          </button>
          <button 
            onClick={() => setViewMode("upload")} 
            disabled={!activity.idUpload}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === "upload" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 opacity-30 cursor-not-allowed"
            }`}
          >
            <FileCode size={14} /> Fichier .FIT
          </button>
        </div>
      </div>

      {/* DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* MAIN PANEL CONTENT (LEFT) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* GPS Map Visualizer */}
          <div className="h-[460px] bg-slate-900 rounded-[2.5rem] overflow-hidden relative border border-slate-100 shadow-xl shadow-slate-100">
            {activity.stravaPolylineContent ? (
              <ActivityMap polylineData={activity.stravaPolylineContent} />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-slate-500 bg-slate-950">
                <MapPin size={24} className="text-slate-800" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Aucun tracé GPS</p>
              </div>
            )}
            <div className="absolute top-6 left-6 z-[400]">
              <span className="bg-slate-950/90 backdrop-blur-md text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/10">
                {sd.type || fitStats.sport || activity.displayInfo?.type || "Workout"} Engine
              </span>
            </div>
          </div>

          {/* Conditional Views Layout */}
          {viewMode === "strava" ? (
            <StravaView sd={sd} isRide={isRide} />
          ) : (
            <UploadView fitStats={fitStats} charts={charts} records={records} activity={activity} />
          )}

        </div>

        {/* SIDEBAR D'INFORMATIONS ACTIONS (RIGHT) */}
        <div className="space-y-6">
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
                    {sd.device || activity.decodedFileData?.file_ids?.[0]?.product_name || "Compteur / Montre GPS"}
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

          <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Fichiers Stockage Cloud</p>
            <div className="space-y-3">
              <MetaRow label="Activity Core ID" value={activity.id ? activity.id.substring(0, 18) + "..." : "N/A"} />
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