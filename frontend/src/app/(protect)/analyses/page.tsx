"use client";
//TODO : pousser l'affichage 
//TODO : ajouter les stats strava 
import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from "recharts";

export default function DetailedDashboardPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      const res = await api("/stats/dashboard");
      if (res.ok) setStats(await res.json());
    };
    fetchDashboard();
  }, []);

  if (!stats) return <div className="p-8 text-slate-500 font-bold">Chargement de vos analyses...</div>;

  // --- 1. CALCUL DES TENDANCES (DELTAS) ---
  const date = new Date();
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth() + 1;
  
  const lastYear = currentYear - 1;
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const yearOfLastMonth = currentMonth === 1 ? currentYear - 1 : currentYear;

  // Récupération sécurisée des stats (fallback à 0 si inexistant)
  const getStat = (arr: any[], key: string) => arr.find((s) => s.periodType === key) || { distance: 0, elevation: 0, count: 0 };
  
  const statCurrentYear = getStat(stats.yearly, `year_${currentYear}`);
  const statLastYear = getStat(stats.yearly, `year_${lastYear}`);
  const statCurrentMonth = getStat(stats.monthly, `month_${currentYear}_${currentMonth}`);
  const statLastMonth = getStat(stats.monthly, `month_${yearOfLastMonth}_${lastMonth}`);

  // Fonction mathématique pour le %
  const calcTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const trendMonthDist = calcTrend(statCurrentMonth.distance, statLastMonth.distance);
  const trendYearDist = calcTrend(statCurrentYear.distance, statLastYear.distance);

  // --- 2. COMPOSANT UI POUR LES BADGES DE TENDANCE ---
  const TrendBadge = ({ value, label }: { value: number, label: string }) => {
    const isPositive = value > 0;
    const isNeutral = value === 0;
    
    if (isNeutral) return <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mt-2"><Minus size={14} /> Stable {label}</span>;
    
    return (
      <span className={`text-xs font-black flex items-center gap-1 mt-2 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
        {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        {isPositive ? '+' : ''}{value.toFixed(1)}% <span className="text-slate-400 font-bold text-[10px] uppercase ml-1">{label}</span>
      </span>
    );
  };

  // --- 3. PRÉPARATION GRAPHIQUES ---
  const monthlyData = stats.monthly
    .filter((m: any) => m.periodType.startsWith(`month_${currentYear}`))
    .sort((a: any, b: any) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime())
    .map((m: any) => ({
      name: new Date(m.periodStart).toLocaleDateString("fr-FR", { month: "short" }),
      distance: m.distance,
      elevation: m.elevation,
      sorties: m.count,
    }));

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-black text-slate-800 tracking-tight">Analyses Data</h1>

      {/* KPIs GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI: Distance du mois */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ce mois-ci (Km)</p>
          <p className="text-3xl font-black text-indigo-600 mt-1">{statCurrentMonth.distance.toFixed(1)}</p>
          <TrendBadge value={trendMonthDist} label="vs mois dernier" />
        </div>

        {/* KPI: Distance de l'année */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cette année (Km)</p>
          <p className="text-3xl font-black text-slate-800 mt-1">{statCurrentYear.distance.toFixed(0)}</p>
          <TrendBadge value={trendYearDist} label="vs an dernier" />
        </div>

        {/* KPI: Dénivelé Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Dénivelé (All time)</p>
          <p className="text-3xl font-black text-slate-800 mt-1">{stats.allTime.elevation.toFixed(0)} m</p>
          <p className="text-xs text-slate-400 font-bold mt-2">Sur {stats.allTime.count} sorties</p>
        </div>

        {/* KPI: Distance Totale */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-indigo-600">
            <TrendingUp size={64} />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Distance</p>
          <p className="text-3xl font-black text-slate-800 mt-1 relative z-10">{stats.allTime.distance.toFixed(0)} km</p>
          <p className="text-xs text-indigo-600 font-bold mt-2 relative z-10">Moyenne: {(stats.allTime.distance / (stats.allTime.count || 1)).toFixed(1)} km/sortie</p>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-black text-slate-800 mb-6 flex justify-between items-center">
            Progression kilométrique ({currentYear})
            <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">Distance</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorDist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={11} fontWeight="bold" stroke="#94a3b8" axisLine={false} tickLine={false} />
                <YAxis fontSize={11} fontWeight="bold" stroke="#94a3b8" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="distance" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorDist)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-black text-slate-800 mb-6 flex justify-between items-center">
            Volume d'activités ({currentYear})
            <span className="text-xs font-bold bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full">Sorties</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={11} fontWeight="bold" stroke="#94a3b8" axisLine={false} tickLine={false} />
                <YAxis fontSize={11} fontWeight="bold" stroke="#94a3b8" axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="sorties" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}