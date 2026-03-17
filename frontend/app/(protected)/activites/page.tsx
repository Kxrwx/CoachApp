"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { 
  Bike, 
  MapPin, 
  Clock, 
  ArrowUpRight, 
  History, 
  Filter,
  ArrowRight
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStrava } from "@fortawesome/free-brands-svg-icons";
import Link from "next/link";

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
        setActivities(res.data.recentActivities || []);
      } catch (err: any) {
        setError(err.response?.data?.error || "Erreur de synchronisation");
      } finally {
        setLoading(false);
      }
    }
    fetchActivities();
  }, []);

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="relative">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-zinc-200 border-t-orange-600"></div>
        <FontAwesomeIcon icon={faStrava} className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-orange-600" />
      </div>
      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Lecture du flux...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-4 dark:bg-[#050505] sm:p-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <header className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-orange-600">
              <History size={18} />
              <span className="text-[10px] font-black uppercase tracking-[.2em]">Flux d'entraînement</span>
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-zinc-900 dark:text-white uppercase">
              DERNIERS <span className="text-orange-600">RIDES</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <Filter size={14} /> Filtrer
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600 dark:border-red-900/50 dark:bg-red-900/10">
            ⚠️ {error}
          </div>
        )}

        {/* GRID */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {activities.length > 0 ? (
            activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-400">
              <Bike size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-medium italic">Aucun segment détecté récemment.</p>
            </div>
          )}
        </div>

        {/* FOOTER LOGO */}
        <footer className="mt-16 flex justify-center opacity-30">
            <FontAwesomeIcon icon={faStrava} className="h-8 w-8" />
        </footer>
      </div>
    </div>
  );
}

function ActivityCard({ activity }: { activity: Activity }) {
  const avgSpeed = (activity.distance / (activity.movingTime / 3600)).toFixed(1);
  const isVirtual = activity.type === 'VirtualRide';
  
  const dateObj = new Date(activity.startDate);
  const day = dateObj.toLocaleDateString("fr-FR", { day: "2-digit" });
  const month = dateObj.toLocaleDateString("fr-FR", { month: "short" }).replace('.', '');

  const hours = Math.floor(activity.movingTime / 3600);
  const minutes = Math.floor((activity.movingTime % 3600) / 60);

  return (
    <Link href={`/activites/${activity.id}`} className="block">
      <div className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-zinc-200 bg-white p-2 transition-all hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/10 dark:border-zinc-800 dark:bg-zinc-950">
        
        {/* HEADER CARD */}
        <div className="flex items-start justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center rounded-2xl bg-zinc-100 px-3 py-2 dark:bg-zinc-900 transition-colors group-hover:bg-orange-50 dark:group-hover:bg-orange-950/20">
              <span className="text-xs font-black uppercase text-zinc-400 group-hover:text-orange-600/70">{month}</span>
              <span className="text-lg font-black text-zinc-900 dark:text-white group-hover:text-orange-600">{day}</span>
            </div>
            <div className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
              isVirtual ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30" : "bg-orange-100 text-orange-600 dark:bg-orange-900/30"
            }`}>
              {isVirtual ? "Virtual" : "Outdoor"}
            </div>
          </div>
          
          {/* Icône de flèche stylisée */}
          <div className="rounded-full bg-zinc-50 p-2 text-zinc-300 transition-all group-hover:bg-orange-600 group-hover:text-white dark:bg-zinc-900">
            <ArrowUpRight size={20} />
          </div>
        </div>

        {/* BODY */}
        <div className="px-5 pb-2">
          <h3 className="mb-6 line-clamp-1 text-xl font-black tracking-tight text-zinc-900 dark:text-white group-hover:text-orange-600 transition-colors">
            {activity.name}
          </h3>
          
          <div className="mb-6 grid grid-cols-3 gap-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase text-zinc-400">Distance</span>
              <span className="text-lg font-black italic">{activity.distance.toFixed(1)}<span className="ml-0.5 text-xs font-normal opacity-50">km</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase text-zinc-400">Dénivelé</span>
              <span className="text-lg font-black italic">+{activity.totalElevationGain}<span className="ml-0.5 text-xs font-normal opacity-50">m</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase text-zinc-400">Vitesse</span>
              <span className="text-lg font-black italic text-orange-600">{avgSpeed}<span className="ml-0.5 text-xs font-normal opacity-50 italic">km/h</span></span>
            </div>
          </div>
        </div>

        {/* FOOTER INFO */}
        <div className="mt-auto flex items-center justify-between rounded-[1.4rem] bg-zinc-50 p-4 dark:bg-zinc-900/50 transition-colors group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800/50">
          <div className="flex items-center gap-4 text-zinc-500">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Clock size={14} className="text-zinc-400 group-hover:text-orange-600" />
              <span>{hours}h{minutes.toString().padStart(2, '0')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Bike size={14} className="text-zinc-400 group-hover:text-orange-600" />
              <span className="capitalize">{activity.type.replace('Ride', '')}</span>
            </div>
          </div>
          
          {/* Label de clic dynamique */}
          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter text-orange-600 opacity-0 transition-all translate-x-2 group-hover:opacity-100 group-hover:translate-x-0">
            Détails <ArrowRight size={12} />
          </div>
        </div>
      </div>
    </Link>
  );
}
