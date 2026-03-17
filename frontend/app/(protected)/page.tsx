"use client";
import { useEffect, useState } from "react";
import axios from "axios";
// Icônes
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStrava } from "@fortawesome/free-brands-svg-icons";
import { 
  Bike, 
  Mountain, 
  Calendar, 
  Timer, 
  Zap, 
  TrendingUp, 
  Activity,
  ChevronRight
} from "lucide-react";


import PerformanceChart from "./components/charts/PerformanceCharts"; 

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

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black">
      <FontAwesomeIcon icon={faStrava} className="mb-4 h-10 w-10 animate-pulse text-orange-600" />
      <p className="text-[10px] font-black tracking-[0.3em] text-zinc-400 uppercase">Analyse des segments...</p>
    </div>
  );

  const at = data?.allTimeStats;
  const currentYear = data?.yearlyStats?.[0];
  const currentMonth = data?.monthlyStats?.[0];

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-4 dark:bg-[#050505] sm:p-8">
      
      {/* HEADER SECTION */}
      <header className="mx-auto max-w-7xl mb-12 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-600 shadow-xl shadow-orange-600/20">
            <FontAwesomeIcon icon={faStrava} className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-zinc-900 dark:text-white uppercase">
              RIDE <span className="text-orange-600 text-stroke-orange">LOG</span>
            </h1>
            <div className="flex items-center gap-2 text-zinc-500">
                <Activity size={14} className="text-green-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Live API Sync</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8">
        
        {/* TOP STATS : GRID 4 COLUMNS */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Distance Totale" value={at?.totalDistance} unit="km" icon={<Bike size={20} />} highlight />
          <StatCard title="Dénivelé Total" value={at?.totalElevation} unit="m" icon={<Mountain size={20} />} />
          <StatCard title="Sorties" value={at?.totalCount} unit="sessions" icon={<Calendar size={20} />} />
          <StatCard title="Temps de Selle" value={Math.round((at?.totalTime || 0) / 3600)} unit="hrs" icon={<Timer size={20} />} />
        </section>

        {/* MIDDLE SECTION : CHART + CURRENT MONTH */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          {/* LE GRAPHIQUE RECHARTS (PREND 2 COLONNES) */}
          <div className="lg:col-span-2">
            <PerformanceChart data={data?.monthlyStats || []} />
          </div>

          {/* FOCUS MOIS ACTUEL */}
          <div className="flex flex-col justify-between overflow-hidden rounded-[2.5rem] bg-zinc-900 p-8 text-white dark:bg-zinc-900 border border-zinc-800">
            <div>
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">Focus Mensuel</span>
                    <TrendingUp size={18} className="text-orange-500" />
                </div>
                <h3 className="text-3xl font-black">Performance <br/>de Mars</h3>
            </div>

            <div className="py-10 text-center">
                <span className="text-8xl font-black tracking-tighter text-white">
                    {Math.round(currentMonth?.distance || 0)}
                </span>
                <p className="mt-2 text-xs font-bold uppercase tracking-widest text-zinc-500">Kilomètres</p>
            </div>

            <button className="flex items-center justify-center gap-2 rounded-2xl bg-orange-600 py-4 text-sm font-black uppercase transition-transform hover:scale-[1.02] active:scale-[0.98]">
                Voir les détails <ChevronRight size={16} />
            </button>
          </div>
        </section>

        {/* BOTTOM SECTION : YEARLY PROGRESS */}
        <section className="rounded-[2.5rem] border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-8 flex items-center gap-3">
                <Zap size={24} className="text-orange-500" />
                <h3 className="text-2xl font-black tracking-tight uppercase">Progression Annuelle {currentYear?.year}</h3>
            </div>
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
                <ProgressStat label="Objectif Distance" current={currentYear?.distance} target={10000} unit="km" />
                <div className="flex items-center justify-around rounded-3xl bg-zinc-50 p-6 dark:bg-zinc-900">
                    <div className="text-center">
                        <p className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Dénivelé YTD</p>
                        <p className="text-2xl font-black text-orange-600">+{currentYear?.elevation.toLocaleString()} m</p>
                    </div>
                    <div className="h-10 w-[1px] bg-zinc-200 dark:bg-zinc-800"></div>
                    <div className="text-center">
                        <p className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Nombre de rides</p>
                        <p className="text-2xl font-black">{currentYear?.count}</p>
                    </div>
                </div>
            </div>
        </section>
      </main>

      {/* FOOTER COMPLIANCE */}
      <footer className="mt-20 flex flex-col items-center justify-center py-10 border-t border-zinc-200 dark:border-zinc-900">
          <div className="flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Powered by</span>
              <FontAwesomeIcon icon={faStrava} className="h-5 w-5 text-orange-600" />
              <span className="text-lg font-black italic tracking-tighter text-zinc-900 dark:text-white uppercase">Strava</span>
          </div>
      </footer>
    </div>
  );
}

// COMPOSANTS UI
function StatCard({ title, value, unit, icon, highlight = false }: any) {
  return (
    <div className={`group rounded-[2rem] border p-6 transition-all duration-300 hover:-translate-y-1 ${
        highlight 
        ? "border-orange-500/20 bg-white shadow-xl shadow-orange-500/5 dark:bg-zinc-900" 
        : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
    }`}>
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
          highlight ? "bg-orange-600 text-white" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
      }`}>
        {icon}
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{title}</p>
      <p className={`text-3xl font-black tracking-tighter ${highlight ? "text-orange-600" : "text-zinc-900 dark:text-white"}`}>
        {value?.toLocaleString()} <span className="text-sm font-normal text-zinc-400">{unit}</span>
      </p>
    </div>
  );
}

function ProgressStat({ label, current, target, unit }: any) {
  const percent = Math.min(Math.round((current / target) * 100), 100);
  return (
    <div className="flex flex-col justify-center">
      <div className="mb-4 flex justify-between items-end text-sm">
        <span className="font-black uppercase tracking-widest text-zinc-400">{label}</span>
        <span className="text-2xl font-black italic">
            {current?.toLocaleString()} <span className="text-sm font-normal text-zinc-400 italic">/ {target} {unit}</span>
        </span>
      </div>
      <div className="h-6 w-full rounded-full bg-zinc-100 dark:bg-zinc-900 p-1.5 shadow-inner">
        <div 
          className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-1000" 
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  );
}