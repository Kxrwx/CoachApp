"use client";
import { useEffect, useState } from "react";
import axios from "axios";

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await axios.get("/api/me/strava/get/allStats");
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.error || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center text-zinc-500 italic">Chargement du peloton...</div>;
  if (error) return <div className="p-10 text-center text-red-500 font-bold">❌ {error}</div>;

  // Extraction des données pour plus de clarté
  const at = data?.allTimeStats;
  const currentYear = data?.yearlyStats?.[0]; // Le plus récent grâce au orderBy
  const currentMonth = data?.monthlyStats?.[0];

  return (
    <div className="min-h-screen bg-zinc-50 p-4 dark:bg-black sm:p-8">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
            STRAVA <span className="text-orange-600">DASHBOARD</span>
          </h1>
          <p className="text-zinc-500">Statistiques de cyclisme synchronisées</p>
        </div>
        <div className="h-2 w-2 animate-pulse rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
      </header>

      {/* GRILLE DES SCORES ALL-TIME */}
      <section className="mb-12">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-zinc-400">Palmarès Global</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Distance Totale" value={at?.totalDistance} unit="km" color="text-orange-600" />
          <StatCard title="Dénivelé" value={at?.totalElevation} unit="m" />
          <StatCard title="Sorties" value={at?.totalCount} unit="rides" />
          <StatCard title="Temps Selle" value={Math.round((at?.totalTime || 0) / 3600)} unit="heures" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* STATS ANNUELLES */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-bold">Objectif Annuel ({currentYear?.year})</h3>
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-600 dark:bg-orange-900/30">En cours</span>
          </div>
          <div className="space-y-6">
            <ProgressStat label="Distance" current={currentYear?.distance} target={10000} unit="km" />
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
                <p className="text-xs text-zinc-400">Dénivelé</p>
                <p className="text-lg font-bold">{currentYear?.elevation.toLocaleString()} m</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
                <p className="text-xs text-zinc-400">Nombre de rides</p>
                <p className="text-lg font-bold">{currentYear?.count}</p>
              </div>
            </div>
          </div>
        </div>

        {/* STATS MENSUELLES */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-bold text-blue-500">Ce mois-ci</h3>
            <span className="text-sm text-zinc-400">Mois {currentMonth?.month}</span>
          </div>
          <div className="flex flex-col items-center justify-center py-4">
             <div className="text-6xl font-black text-zinc-900 dark:text-white">
                {Math.round(currentMonth?.distance || 0)}
             </div>
             <div className="text-sm font-bold uppercase tracking-tighter text-zinc-400">Kilomètres parcourus</div>
             <div className="mt-6 h-1 w-full max-w-[200px] rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div 
                  className="h-1 rounded-full bg-blue-500 transition-all duration-1000" 
                  style={{ width: `${Math.min((currentMonth?.distance / 500) * 100, 100)}%` }}
                ></div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sous-composant pour les petites cartes
function StatCard({ title, value, unit, color = "text-zinc-900 dark:text-white" }: any) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-1 text-xs font-medium text-zinc-400 uppercase">{title}</p>
      <p className={`text-2xl font-black ${color}`}>
        {value?.toLocaleString()} <span className="text-sm font-normal text-zinc-400">{unit}</span>
      </p>
    </div>
  );
}

// Sous-composant pour les barres de progression
function ProgressStat({ label, current, target, unit }: any) {
  const percent = Math.min(Math.round((current / target) * 100), 100);
  return (
    <div className="w-full">
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-bold text-zinc-600 dark:text-zinc-300">{label}</span>
        <span className="text-zinc-400">{current?.toLocaleString()} / {target} {unit}</span>
      </div>
      <div className="h-3 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div 
          className="h-3 rounded-full bg-orange-500 transition-all duration-1000" 
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  );
}