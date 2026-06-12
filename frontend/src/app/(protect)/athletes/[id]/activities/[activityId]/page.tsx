"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileCode, Loader2, ArrowLeft, MapPin, Calendar, Thermometer, Flame, Cpu, Activity } from "lucide-react";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Imports locaux
import UploadView from "@/app/components/page/activities/UploadView";
import { MetaRow } from "@/app/components/UICores";

export default function CoachActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  const athleteId = params.id as string;
  const activityId = params.activityId as string;

  const [activity, setActivity] = useState<any>(null);
  const [physioData, setPhysioData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllCoachData = async () => {
      try {
        // Chargement parallèle des deux routes sécurisées côté Coach
        const [resAct, resPhysio] = await Promise.all([
          api(`/coaching/athletes/${athleteId}/activities/${activityId}`),
          api(`/coaching/athletes/${athleteId}/physio`)
        ]);

        if (resAct.ok) {
          const actData = await resAct.json();
          setActivity(actData);
        }

        if (resPhysio.ok) {
          const physioJson = await resPhysio.json();
          setPhysioData(physioJson);
        }
      } catch (err) {
        console.error("Erreur globale lors de la récupération des données Coach:", err);
      } finally {
        setLoading(false);
      }
    };

    if (athleteId && activityId) {
      fetchAllCoachData();
    }
  }, [athleteId, activityId]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-indigo-600" size={36} />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analyse du fichier binaire...</p>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white border border-slate-200 rounded-3xl max-w-sm shadow-sm">
          <p className="text-slate-800 font-black uppercase text-xs tracking-wider mb-2">Dossier indisponible</p>
          <p className="text-xs text-slate-400 mb-4">L'activité demandée n'existe pas ou le partage de données a été révoqué.</p>
          <button onClick={() => router.back()} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 justify-center mx-auto">
            <ArrowLeft size={12} /> Retour au profil
          </button>
        </div>
      </div>
    );
  }

  const fitStats = activity.decodedFileData?.stats || {};
  const charts = activity.decodedFileData?.charts || {};
  const records = activity.decodedFileData?.records || [];
  
  const physio = physioData?.physio || {};

  const enrichedActivity = {
    ...activity,
    athletePhysio: physio,
    userPhysiology: physio,
    physio: physio
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 pt-8 text-slate-900 animate-fadeIn">
      
      {/* CONTROL BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-all"
        >
          <ArrowLeft size={14} /> Retour à l'historique
        </button>
        
        <div className="flex bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest items-center gap-2 border border-indigo-100">
          <FileCode size={14} />
          Supervision technique (FIT Engine)
        </div>
      </div>

      {/* DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* MAIN PANEL CONTENT (LEFT) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* GPS Map Visualizer PlaceHolder */}
          <div className="h-[240px] sm:h-[300px] bg-slate-950 rounded-[2.5rem] overflow-hidden relative border border-slate-900 shadow-xl flex flex-col items-center justify-center gap-2 text-slate-500">
            <MapPin size={32} className="text-slate-800 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center px-6 leading-relaxed">
              Tracé cartographique non disponible <br/>
              <span className="text-[8px] font-medium text-slate-600 normal-case block mt-1">(Flux API Strava tiers exclus de l'espace d'encadrement)</span>
            </p>
            <div className="absolute top-6 left-6 z-[400]">
              <span className="bg-slate-900/90 backdrop-blur-md text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/5">
                {fitStats.sport || activity.displayInfo?.type || "Workout"} Engine
              </span>
            </div>
          </div>

          {/* Rendu dynamique des charts et data FIT de l'athlète */}
          <UploadView 
            fitStats={fitStats} 
            charts={charts} 
            records={records} 
            activity={enrichedActivity} 
          />
        </div>

        {/* SIDEBAR D'INFORMATIONS ACTIONS (RIGHT) */}
        <div className="space-y-6">
          
          {/* Main Summary Card */}
          <div className="bg-slate-950 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
            
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">
              Métriques de Session
            </p>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-tight mb-6 break-words">
              {activity.displayInfo?.name || "Session d'Entraînement"}
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
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Appareil Matériel</span>
                  <span className="text-xs font-bold text-slate-200 truncate max-w-[180px]">
                    {activity.decodedFileData?.file_ids?.[0]?.product_name || "Compteur / Montre GPS"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                <Flame size={16} className="text-orange-500 mx-auto mb-1" />
                <span className="text-[9px] block text-slate-500 font-black uppercase tracking-wider">Energie</span>
                <span className="text-sm font-black italic">
                  {fitStats.total_calories || "--"}{" "}
                  <span className="text-[9px] font-normal not-italic text-slate-400">kcal</span>
                </span>
              </div>
              <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                <Thermometer size={16} className="text-blue-400 mx-auto mb-1" />
                <span className="text-[9px] block text-slate-500 font-black uppercase tracking-wider">Temp. Moy.</span>
                <span className="text-sm font-black italic">{fitStats.avg_temperature || "--"}<span className="text-[9px] font-normal not-italic text-slate-400">°C</span></span>
              </div>
            </div>
          </div>

          {/* Profil Physiologique de l'athlète à la date de l'analyse */}
          {physio.ftp && (
            <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <Activity size={12} className="text-indigo-600" /> Profil Physiologique Courant
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[9px] uppercase font-black text-slate-400 block mb-0.5">Seuil FTP</span>
                  <span className="text-sm font-black text-slate-800">{physio.ftp} <span className="text-[10px] font-medium text-slate-400">W</span></span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[9px] uppercase font-black text-slate-400 block mb-0.5">Masse</span>
                  <span className="text-sm font-black text-slate-800">{physio.weight || "--"} <span className="text-[10px] font-medium text-slate-400">kg</span></span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[9px] uppercase font-black text-slate-400 block mb-0.5">FC Max</span>
                  <span className="text-sm font-black text-slate-800">{physio.maxHr || "--"} <span className="text-[10px] font-medium text-slate-400">bpm</span></span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[9px] uppercase font-black text-slate-400 block mb-0.5">Rapport Poids/Puissance</span>
                  <span className="text-sm font-black text-indigo-600">
                    {physio.ftp && physio.weight ? (physio.ftp / physio.weight).toFixed(2) : "--"} <span className="text-[10px] font-medium text-indigo-400">W/kg</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Meta Cloud Storage Info */}
          <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Fichiers Stockage Cloud</p>
            <div className="space-y-3">
              <MetaRow label="Activity Core ID" value={activity.id ? activity.id.substring(0, 18) + "..." : "N/A"} />
              <MetaRow label="Source" value="Fichier FIT (R2 Storage)" color="text-indigo-600 font-bold" />
              <MetaRow label="État Système" value={physio.state || "NORMAL"} color="text-slate-700 font-semibold" />
            </div>
          </div>

        </div>
        
      </div>
    </div>
  );
}