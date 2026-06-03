"use client";

import React, { useState, useEffect } from "react"; 
import { api } from "@/lib/api";
import { 
  TrendingUp, TrendingDown, Minus, 
  Heart, Zap, Activity, Trophy, Scale, Calendar,
  Gauge, ChevronRight, BarChart2, Navigation, Flame
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area, Line, LineChart
} from "recharts";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStrava } from "@fortawesome/free-brands-svg-icons";

export default function DetailedDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [globalPhysio, setGlobalPhysio] = useState<any>(null);
  const [monthlyPhysio, setMonthlyPhysio] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const date = new Date();
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth() + 1;

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [resStats, resGlobalPhysio, resMonthlyPhysio, resRecords] = await Promise.all([
          api("/stats/dashboard"),
          api("/physiology/calculate"),
          api("/physiology/month", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ month: currentMonth, year: currentYear }),
          }),
          api("/record")
        ]);
        
        const safeJson = async (res: Response) => {
          if (!res || !res.ok) return null;
          const text = await res.text();
          return text ? JSON.parse(text) : null;
        };

        const dataStats = await safeJson(resStats);
        const dataGlobalPhysio = await safeJson(resGlobalPhysio);
        const dataMonthlyPhysio = await safeJson(resMonthlyPhysio);
        const dataRecords = await safeJson(resRecords);

        if (dataStats) setStats(dataStats);
        if (dataGlobalPhysio) setGlobalPhysio(dataGlobalPhysio);
        if (dataMonthlyPhysio) setMonthlyPhysio(dataMonthlyPhysio);
        if (dataRecords) setRecords(dataRecords.records || []);

      } catch (err) {
        console.error("Erreur lors de la récupération des données", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, [currentMonth, currentYear]);

  if (isLoading || !stats) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FC4C02]"></div>
      </div>
    );
  }

  const activeFtp = monthlyPhysio?.ftp ?? globalPhysio?.ftp;
  const activeWeight = monthlyPhysio?.weight ?? globalPhysio?.weight;
  const currentWkg = activeFtp && activeWeight ? (activeFtp / activeWeight) : 0;

  // --- CONTEXTES TEMPORELS ET COMPARAISONS HISTORIQUES ---
  const lastYear = currentYear - 1;
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const yearOfLastMonth = currentMonth === 1 ? currentYear - 1 : currentYear;

  const getStat = (arr: any[], key: string) => arr?.find((s) => s.periodType === key) || { distance: 0, elevation: 0, count: 0, avgWatts: 0 };
  
  const statCurrentYear = getStat(stats.yearly, `year_${currentYear}`);
  const statLastYear = getStat(stats.yearly, `year_${lastYear}`);
  const statCurrentMonth = getStat(stats.monthly, `month_${currentYear}_${currentMonth}`);
  const statLastMonth = getStat(stats.monthly, `month_${yearOfLastMonth}_${lastMonth}`);
  const statLastYearSameMonth = getStat(stats.monthly, `month_${lastYear}_${currentMonth}`);

  const isFormPositive = statCurrentMonth.distance >= statLastMonth.distance && (statCurrentMonth.avgWatts || 0) >= (statLastMonth.avgWatts || 0);

  // --- CONSTITUTION DES DONNÉES MENSUELLES POUR LES GRAPHES ---
  const monthlyData = stats.monthly
    ?.filter((m: any) => m.periodType.startsWith(`month_${currentYear}`))
    .sort((a: any, b: any) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime())
    .map((m: any) => ({
      name: new Date(m.periodStart).toLocaleDateString("fr-FR", { month: "short" }),
      distance: m.distance || 0,
      elevation: m.elevation || 0,
      avgWatts: m.avgWatts || 0,
      count: m.count || 0,
    })) || [];

  const averageDistance = monthlyData.length > 0 ? (monthlyData.reduce((acc: number, curr: any) => acc + curr.distance, 0) / monthlyData.length) : 0;
  const chartDataWithTrend = monthlyData.map((item: any) => ({ ...item, trend: parseFloat(averageDistance.toFixed(1)) }));

  // --- EXTRACTION ET CLASSIFICATION DES RECORDS PERSONNELS ---
  const findRecord = (key: string) => records.find(r => r?.metric?.key === key);

  const powerRecordKeys = [
    "power_max", "power_3s", "power_30s", "power_1min", "power_2min", 
    "power_5min", "power_10min", "power_20min", "power_1h", "power_2h", "power_4h", "ride_max_avg_watts"
  ];
  const cardioRecordKeys = ["hr_max", "cadence_max"];
  const enduranceRecordKeys = ["ride_max_distance_km", "ride_max_elevation_gain", "ride_max_duration_hours", "kj_total"];

  const renderRecordCard = (key: string) => {
    const record = findRecord(key);
    if (!record) return null;
    return (
      <div key={record.id} className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
        <div>
          <div className="flex justify-between items-center mb-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate max-w-[85%]">
              {record.metric?.name || record.metric?.key}
            </p>
            <FontAwesomeIcon icon={faStrava} style={{ color: "#FC4C02" }} className="text-[10px]" />
          </div>
          <p className="text-xl font-black text-slate-800">
            {record.value % 1 === 0 ? record.value : record.value.toFixed(1)}{" "}
            <span className="text-xs font-bold text-slate-500">{record.metric?.unit}</span>
          </p>
        </div>
        {record.achievedAt && (
          <p className="text-[9px] text-slate-400 font-medium mt-2 flex items-center gap-0.5">
            <ChevronRight size={10} /> {new Date(record.achievedAt).toLocaleDateString("fr-FR")}
          </p>
        )}
      </div>
    );
  };

  const TrendBadge = ({ value, label, variant = "slate" }: { value: number, label: string, variant?: "slate" | "indigo" }) => {
    if (value === 0) return <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5"><Minus size={12} /> Stable {label}</span>;
    const isPositive = value > 0;
    const colorClass = isPositive ? 'text-emerald-500' : 'text-rose-500';
    const bgClass = variant === "indigo" ? "bg-indigo-50/60 px-1.5 py-0.5 rounded" : "";
    return (
      <span className={`text-[10px] font-black flex items-center gap-0.5 ${colorClass} ${bgClass}`}>
        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {isPositive ? '+' : ''}{value.toFixed(0)}% <span className="text-slate-400 font-medium text-[9px] ml-0.5">{label}</span>
      </span>
    );
  };

  return (
    <div className="space-y-8 p-6 bg-slate-50 min-h-screen pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Tableau de Bord Performance</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1">
            Analyse synchronisée avec <FontAwesomeIcon icon={faStrava} style={{ color: "#FC4C02" }} className="mx-0.5" /> <span className="font-bold text-slate-500">Strava</span>
          </p>
        </div>
      </div>

      {/* ATHLETE HERO BANNER */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl border border-slate-900">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-500/30">
              Rapport Poids / Puissance Actuel
            </span>
            <div className="flex items-baseline gap-2">
              <h2 className="text-6xl font-black tracking-tighter text-white">
                {currentWkg > 0 ? currentWkg.toFixed(2) : "--"}
              </h2>
              <span className="text-xl font-bold text-indigo-300 tracking-tight">W/kg</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-sm lg:min-w-[50%]">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider"><Zap size={12} className="inline text-amber-400 mr-1" /> FTP</p>
              <p className="text-lg font-black text-white">{activeFtp ? `${activeFtp} W` : "--"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider"><Scale size={12} className="inline text-sky-400 mr-1" /> Poids</p>
              <p className="text-lg font-black text-white">{activeWeight ? `${activeWeight} kg` : "--"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider"><Heart size={12} className="inline text-rose-400 mr-1" /> FC Max / Repos</p>
              <p className="text-lg font-black text-white">{monthlyPhysio?.hrMax || "--"}<span className="text-xs text-slate-400 font-normal">/{monthlyPhysio?.hrRest || "--"}</span></p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider"><Gauge size={12} className="inline text-emerald-400 mr-1" /> État de Forme</p>
              <span className={`text-xs font-black inline-flex items-center px-2 py-0.5 rounded ${isFormPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {isFormPositive ? "En Forme" : "Régularité"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARAISONS MENSUELLES & ANNUELLES */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Calendar size={18} className="text-indigo-600" /> Analyse du Mois en Cours
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Évolutions cibles</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Distance</p>
              <p className="text-xl font-black text-slate-800">{statCurrentMonth.distance.toFixed(1)} <span className="text-xs font-normal text-slate-400">km</span></p>
              <div className="space-y-1 pt-1 border-t border-slate-200/60">
                <TrendBadge value={calcTrend(statCurrentMonth.distance, statLastMonth.distance)} label="vs M-1" />
                <TrendBadge value={calcTrend(statCurrentMonth.distance, statLastYearSameMonth.distance)} label="vs N-1 (Même mois)" variant="indigo" />
              </div>
            </div>
            <div className="space-y-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Dénivelé</p>
              <p className="text-xl font-black text-slate-800">{statCurrentMonth.elevation.toFixed(0)} <span className="text-xs font-normal text-slate-400">m</span></p>
              <div className="space-y-1 pt-1 border-t border-slate-200/60">
                <TrendBadge value={calcTrend(statCurrentMonth.elevation, statLastMonth.elevation)} label="vs M-1" />
                <TrendBadge value={calcTrend(statCurrentMonth.elevation, statLastYearSameMonth.elevation)} label="vs N-1 (Même mois)" variant="indigo" />
              </div>
            </div>
            <div className="space-y-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Sorties</p>
              <p className="text-xl font-black text-slate-800">{statCurrentMonth.count} <span className="text-xs font-normal text-slate-400">act.</span></p>
              <div className="space-y-1 pt-1 border-t border-slate-200/60">
                <TrendBadge value={calcTrend(statCurrentMonth.count, statLastMonth.count)} label="vs M-1" />
                <TrendBadge value={calcTrend(statCurrentMonth.count, statLastYearSameMonth.count)} label="vs N-1 (Même mois)" variant="indigo" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Navigation size={18} className="text-emerald-600" /> Volume Annuel Global
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Saison {currentYear}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Distance</p>
              <p className="text-xl font-black text-slate-800">{statCurrentYear.distance.toFixed(0)} <span className="text-xs font-normal text-slate-400">km</span></p>
              <TrendBadge value={calcTrend(statCurrentYear.distance, statLastYear.distance)} label="vs globale N-1" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Dénivelé</p>
              <p className="text-xl font-black text-slate-800">{statCurrentYear.elevation.toFixed(0)} <span className="text-xs font-normal text-slate-400">m</span></p>
              <TrendBadge value={calcTrend(statCurrentYear.elevation, statLastYear.elevation)} label="vs globale N-1" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Sorties</p>
              <p className="text-xl font-black text-slate-800">{statCurrentYear.count} <span className="text-xs font-normal text-slate-400">act.</span></p>
              <TrendBadge value={calcTrend(statCurrentYear.count, statLastYear.count)} label="vs globale N-1" />
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION DES RECORDS PERSONNELS ÉTENDUE --- */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <Trophy className="text-amber-500" size={22} />
          <h3 className="text-lg font-black text-slate-800 tracking-tight">Records Personnels Historiques</h3>
        </div>

        {/* 1. Records de Puissance */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-indigo-600 uppercase tracking-wider flex items-center gap-1">⚡ Courbe & Sommets de Puissance</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {powerRecordKeys.map(key => renderRecordCard(key))}
          </div>
        </div>

        {/* 2. Cardio & Cadence */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-rose-500 uppercase tracking-wider flex items-center gap-1">❤️ Capteurs & Fréquences</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {cardioRecordKeys.map(key => renderRecordCard(key))}
          </div>
        </div>

        {/* 3. Endurance & Volume */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1">🏔️ Volume Max & Endurance</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {enduranceRecordKeys.map(key => renderRecordCard(key))}
          </div>
        </div>
      </section>

      {/* --- SECTION DES 4 GRAPHIQUES --- */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* GRAPH 1: Distance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-black text-slate-800 mb-6 flex justify-between items-center">
            <span className="flex items-center gap-2">Progression Kilométrique</span>
            <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">Distance (km)</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartDataWithTrend}>
                <defs>
                  <linearGradient id="colorDist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={11} fontWeight="bold" stroke="#94a3b8" axisLine={false} tickLine={false} />
                <YAxis fontSize={11} fontWeight="bold" stroke="#94a3b8" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Area type="monotone" dataKey="distance" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorDist)" />
                <Line type="monotone" dataKey="trend" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" dot={false} activeDot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPH 2: Dénivelé */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-black text-slate-800 mb-6 flex justify-between items-center">
            <span className="flex items-center gap-2">Dénivelé Mensuel Accumulé</span>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full">Dénivelé (m)</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataWithTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={11} fontWeight="bold" stroke="#94a3b8" axisLine={false} tickLine={false} />
                <YAxis fontSize={11} fontWeight="bold" stroke="#94a3b8" axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="elevation" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPH 3: Intensité & Puissance Moyenne (AJOUTÉ) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-black text-slate-800 mb-6 flex justify-between items-center">
            <span className="flex items-center gap-2">Évolution de la Puissance Moyenne</span>
            <span className="text-xs font-bold bg-amber-50 text-amber-600 px-3 py-1 rounded-full">Puissance (W)</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartDataWithTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={11} fontWeight="bold" stroke="#94a3b8" axisLine={false} tickLine={false} />
                <YAxis fontSize={11} fontWeight="bold" stroke="#94a3b8" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Line type="monotone" dataKey="avgWatts" stroke="#f59e0b" strokeWidth={3} dot={{ stroke: '#f59e0b', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPH 4: Fréquence d'Entraînement (AJOUTÉ) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-black text-slate-800 mb-6 flex justify-between items-center">
            <span className="flex items-center gap-2">Volume et Régularité des Sorties</span>
            <span className="text-xs font-bold bg-rose-50 text-rose-600 px-3 py-1 rounded-full">Nombre de Sorties</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataWithTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={11} fontWeight="bold" stroke="#94a3b8" axisLine={false} tickLine={false} />
                <YAxis fontSize={11} fontWeight="bold" stroke="#94a3b8" axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="count" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </section>

      <div className="text-right text-[10px] font-bold text-slate-400 tracking-wide">
        Cumul global historique : {stats.allTime.distance.toFixed(0)} km en {stats.allTime.count} sorties.
      </div>
      
    </div>
  );
}

function calcTrend(current: number, previous: number) {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}