"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, FileCode, Calendar, Route, TrendingUp, ChevronRight, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "@/lib/api";

export default function AthleteActivitiesListPage() {
  const { id } = useParams(); 
  const router = useRouter();
  
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });

  const fetchActivities = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api(`/coaching/athletes/${id}/activities?page=${page}&limit=20`);
      if (res.ok) {
        const json = await res.json();
        setActivities(json.data);
        setMeta(json.meta);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des activités:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchActivities();
  }, [id]);

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4 pt-8 animate-fadeIn">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-all mb-4"
          >
            <ArrowLeft size={14} /> Retour au profil
          </button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <FileCode className="text-indigo-600" size={24} />
            Fichiers Uploadés ({meta.total})
          </h1>
          <p className="text-sm text-slate-500 mt-1">Historique des données brutes (.FIT) de l'athlète.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 w-full items-center justify-center bg-white rounded-3xl border border-slate-100 shadow-sm">
          <Loader2 className="animate-spin text-indigo-500" size={32} />
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col h-64 w-full items-center justify-center bg-white rounded-3xl border border-slate-100 shadow-sm text-slate-400">
          <FileCode size={48} className="mb-4 opacity-20" />
          <p className="font-bold">Aucune activité trouvée</p>
          <p className="text-sm">L'athlète n'a pas encore de fichiers uploadés.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div 
              key={activity.id}
              onClick={() => router.push(`/athletes/${id}/activities/${activity.id}`)}
              className="group bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 transition-colors">
                  <FileCode size={20} className="text-indigo-600 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {activity.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-1">
                    <Calendar size={12} />
                    {format(new Date(activity.startDate), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 sm:mr-4">
                <div className="flex flex-col items-end sm:items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 mb-1">
                    <Route size={10} /> Distance
                  </span>
                  <span className="text-sm font-bold text-slate-700">{activity.distance.toFixed(1)} km</span>
                </div>
                
                <div className="flex flex-col items-end sm:items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 mb-1">
                    <TrendingUp size={10} /> Dénivelé
                  </span>
                  <span className="text-sm font-bold text-slate-700">{activity.elevation.toFixed(0)} m</span>
                </div>

                <div className="hidden sm:flex text-slate-300 group-hover:text-indigo-600 transition-colors ml-4">
                  <ChevronRight size={20} />
                </div>
              </div>
            </div>
          ))}

          {meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8 pt-4">
              <button 
                onClick={() => fetchActivities(meta.page - 1)}
                disabled={meta.page === 1}
                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-bold text-slate-700">
                Page {meta.page} sur {meta.totalPages}
              </span>
              <button 
                onClick={() => fetchActivities(meta.page + 1)}
                disabled={meta.page === meta.totalPages}
                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}