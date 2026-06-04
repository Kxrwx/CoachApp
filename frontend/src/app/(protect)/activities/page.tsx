"use client";

import { useState, useEffect } from "react";
import { Activity as ActivityIcon, ArrowUpRight, FileCode, Loader2, Plus } from "lucide-react";
import { faStrava } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await api("/activities");
        if (res.ok) {
          const data = await res.json();
          setActivities(data);
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des activités :", err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4">
      {/* HEADER */}
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">
            Activités
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Historique de vos performances multi-sources.
          </p>
        </div>
        <Link
          href="/upload"
          className="flex items-center gap-2 bg-slate-900 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shrink-0"
        >
          <Plus size={16} /> Importer
        </Link>
      </div>

      {/* LISTE DES ACTIVITÉS */}
      <div className="grid gap-4">
        {activities.map((activity) => {
          // 1. Déterminer le nom de l'activité
          const activityName =
            activity.stravaDetail?.name ||
            activity.uploadDetail?.name ||
            "Activité manuelle";

          // 2. Calcul de la distance spécifique par source
          const stravaDist = activity.stravaDetail?.distance;
          const uploadDist = activity.uploadDetail?.distance;
          
          let formattedDistance = null;

          if (stravaDist) {
            // Strava est en mètres -> conversion en km
            formattedDistance = (stravaDist / 1000).toFixed(2) + " km";
          } else if (uploadDist) {
            // Upload est déjà en km -> affichage direct
            formattedDistance = Number(uploadDist).toFixed(2) + " km";
          }

          return (
            <Link
              key={activity.id}
              href={`/activities/${activity.id}`}
              className="group relative bg-white border border-slate-100 p-6 rounded-[2rem] hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              {/* GAUCHE : Icône + Date + Titre */}
              <div className="flex items-start gap-5 flex-1">
                <div className="p-4 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">
                  <ActivityIcon size={24} />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">
                      {format(new Date(activity.startDate), "HH:mm")}
                    </span>
                    <p className="text-xs font-bold text-slate-400 uppercase">
                      {format(new Date(activity.startDate), "EEEE dd MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  {/* Titre entier sans line-clamp */}
                  <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-snug break-words">
                    {activityName}
                  </h3>
                </div>
              </div>

              {/* DROITE : Stats + Sources + Bouton Fleche */}
              <div className="flex items-center justify-between md:justify-end gap-8 shrink-0 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-50">
                <div className="flex items-center gap-6">
                  
                  {/* Affichage dynamique de la distance si elle existe */}
                  {formattedDistance && (
                    <div className="text-left">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-wider">
                        Distance
                      </p>
                      <p className="text-sm font-bold text-slate-700">
                        {formattedDistance}
                      </p>
                    </div>
                  )}

                  {/* Badges de provenance */}
                  <div className="flex items-center gap-3 border-l border-slate-100 pl-6 h-8">
                    {activity.idStrava && (
                      <FontAwesomeIcon 
                        icon={faStrava} 
                        className="text-orange-500 text-lg" 
                        title="Strava" 
                      />
                    )}
                    {activity.idUpload && (
                      <span title="Fichier FIT" className="flex items-center">
                        <FileCode className="text-indigo-500" size={18} />
                      </span>
                    )}
                  </div>
                </div>

                {/* Bouton d'action */}
                <div className="p-2 bg-slate-50 rounded-full text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all">
                  <ArrowUpRight size={20} />
                </div>
              </div>
            </Link>
          );
        })}

        {/* État vide si aucune activité */}
        {!loading && activities.length === 0 && (
          <div className="text-center py-16 bg-white border border-slate-100 rounded-[2rem]">
            <p className="text-slate-500 font-medium">Aucune activité trouvée dans votre historique.</p>
            <Link 
              href="/upload" 
              className="text-indigo-500 font-bold text-sm hover:underline mt-2 inline-block bg-indigo-50 px-4 py-2 rounded-xl"
            >
              Importez votre première activité
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}