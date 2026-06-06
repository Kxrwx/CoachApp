"use client";

import React, { useState } from 'react';
import { BarChart3, Activity, Route, Timer, Flame, ChevronDown } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function AthleteDataPage() {
  const { id } = useParams();
  const [timeframe, setTimeframe] = useState('7d');

  // Exemple de statistiques fictives pour l'UI
  const stats = [
    { label: "Distance Totale", value: "142.5", unit: "km", icon: Route, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Temps Actif", value: "5h 24", unit: "m", icon: Timer, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "TSS (Charge)", value: "312", unit: "pts", icon: Activity, color: "text-indigo-500", bg: "bg-indigo-50" },
    { label: "Dénivelé", value: "1240", unit: "m+", icon: Flame, color: "text-amber-500", bg: "bg-amber-50" },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="text-indigo-600" size={20} />
          Analyse des Données
        </h2>
        
        {/* Sélecteur de période */}
        <div className="relative">
          <select 
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl pl-4 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm"
          >
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="year">Cette année</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Cartes de KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={stat.color} size={16} />
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</span>
              <span className="text-xs font-bold text-slate-500">{stat.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Zone Graphique Principal */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-6">Charge d'entraînement (Fitness / Fatigue)</h3>
        {/* Placeholder pour un vrai graphique (ex: Recharts, Chart.js) */}
        <div className="h-64 w-full bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
          <Activity size={32} className="text-slate-300" />
          <p className="text-sm font-medium text-slate-500">Graphique d'évolution à intégrer ici</p>
          <p className="text-xs text-slate-400">Nécessite la récupération de l'historique complet.</p>
        </div>
      </div>
      
    </div>
  );
}