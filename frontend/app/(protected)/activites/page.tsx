"use client";
import { useEffect, useState } from "react";
import axios from "axios";

// Typage simple pour l'affichage
interface Activity {
  id: string;
  name: string;
  distance: number;
  movingTime: number;
  totalElevationGain: number;
  type: string;
  startDate: string;
}

export default function PageActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivities() {
      try {
        setLoading(true);
        const res = await axios.get("/api/me/strava/get/allActivities");
        // Selon ta structure de retour backend : res.data.recentActivities
        setActivities(res.data.recentActivities || []);
      } catch (err: any) {
        setError(err.response?.data?.error || "Impossible de charger les activités");
      } finally {
        setLoading(false);
      }
    }
    fetchActivities();
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center text-zinc-500 animate-pulse font-medium">Chargement du peloton...</div>;
  
  return (
    <div className="min-h-screen bg-zinc-50 p-4 dark:bg-black sm:p-8">
      <header className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
          MES <span className="text-orange-600">ACTIVITÉS</span>
        </h1>
        <p className="text-zinc-500">Tes 30 derniers jours sur la route</p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          ❌ {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))
        ) : (
          <p className="col-span-full py-20 text-center text-zinc-400 italic">
            Aucune activité enregistrée ce mois-ci. En selle ! 🚲
          </p>
        )}
      </div>
    </div>
  );
}

function ActivityCard({ activity }: { activity: Activity }) {
  // Calcul de la vitesse moyenne (km/h)
  const avgSpeed = (activity.distance / (activity.movingTime / 3600)).toFixed(1);
  
  // Formatage de la date
  const dateStr = new Date(activity.startDate).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Formatage du temps (H:MM)
  const hours = Math.floor(activity.movingTime / 3600);
  const minutes = Math.floor((activity.movingTime % 3600) / 60);

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 transition-all hover:border-orange-500/50 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-500/30">
      {/* Badge Type */}
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {activity.type === 'VirtualRide' ? '🚴‍♂️ Zwift / Virtuel' : '🚲 Sortie Route'}
        </span>
        <span className="text-xs text-zinc-400">{dateStr}</span>
      </div>

      {/* Titre */}
      <h3 className="mb-6 truncate text-xl font-bold text-zinc-900 group-hover:text-orange-600 dark:text-white transition-colors">
        {activity.name}
      </h3>

      {/* Stats Principales */}
      <div className="grid grid-cols-3 gap-4 border-t border-zinc-50 pt-6 dark:border-zinc-800">
        <div>
          <p className="text-[10px] font-bold uppercase text-zinc-400">Distance</p>
          <p className="text-lg font-black dark:text-white">
            {activity.distance.toFixed(1)} <span className="text-xs font-normal">km</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-zinc-400">Dénivelé</p>
          <p className="text-lg font-black dark:text-white">
            {activity.totalElevationGain} <span className="text-xs font-normal">m</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-zinc-400">Vitesse</p>
          <p className="text-lg font-black text-orange-600">
            {avgSpeed} <span className="text-xs font-normal">km/h</span>
          </p>
        </div>
      </div>

      {/* Footer Card */}
      <div className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{hours}h {minutes.toString().padStart(2, '0')} min</span>
      </div>
    </div>
  );
}