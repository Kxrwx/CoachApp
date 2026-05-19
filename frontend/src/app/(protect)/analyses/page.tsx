"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area 
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

  if (!stats) return <div className="p-8">Chargement complet des données...</div>;

  // Préparation des données pour le graphique cumulé (Trend)
  const monthlyData = stats.monthly
    .filter((m: any) => m.periodType.startsWith(`month_${new Date().getFullYear()}`))
    .sort((a: any, b: any) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime())
    .map((m: any) => ({
      name: new Date(m.periodStart).toLocaleDateString("fr-FR", { month: "short" }),
      distance: m.distance,
      elevation: m.elevation,
      sorties: m.count,
    }));

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-black text-slate-800">Analyses Data</h1>

      {/* 1. KPIs Grid - Dense */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Distance", val: `${stats.allTime.distance.toFixed(0)} km`, sub: "All time" },
          { label: "Total Dénivelé", val: `${stats.allTime.elevation.toFixed(0)} m`, sub: "All time" },
          { label: "Volume Total", val: stats.allTime.count, sub: "Sorties enregistrées" },
          { label: "Moyenne / mois", val: (stats.allTime.distance / 12).toFixed(1), sub: "Distance estimée" },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{kpi.val}</p>
            <p className="text-xs text-slate-400 font-bold mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* 2. Double Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-black text-slate-800 mb-6">Distance & Dénivelé (Année)</h3>
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
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="distance" stroke="#4f46e5" fillOpacity={1} fill="url(#colorDist)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-black text-slate-800 mb-6">Volume d'activités (Sorties/mois)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="sorties" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Data Table (Dense) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 font-black text-slate-800">Historique Mensuel</div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px]">
            <tr>
              <th className="px-6 py-3">Période</th>
              <th className="px-6 py-3">Distance (km)</th>
              <th className="px-6 py-3">Dénivelé (m)</th>
              <th className="px-6 py-3">Nombre</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stats.monthly.slice(0, 5).map((m: any, i: number) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-700">{m.periodType}</td>
                <td className="px-6 py-4 font-black text-indigo-600">{m.distance.toFixed(1)}</td>
                <td className="px-6 py-4 text-slate-600">{m.elevation.toFixed(0)}</td>
                <td className="px-6 py-4 text-slate-600">{m.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}