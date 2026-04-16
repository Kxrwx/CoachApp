import React from 'react';
import { TrendingUp, Users, Zap, ArrowUpRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome Message */}
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">
            Dashboard <span className="text-indigo-600">Coach</span>
          </h2>
          <p className="text-slate-500 font-medium mt-1">
            Analyse de performance en temps réel • <span className="text-indigo-500">Avril 2026</span>
          </p>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Athlètes Actifs', value: '24', trend: '+2', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Séances (7j)', value: '142', trend: '+12%', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Score de Forme', value: '82%', trend: '+4%', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={22} />
              </div>
              <span className={`flex items-center gap-1 text-xs font-black ${stat.color}`}>
                {stat.trend} <ArrowUpRight size={14} />
              </span>
            </div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Middle Section: Chart + Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activités Récentes */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-600 rounded-full"></span> Activités Récentes
            </h3>
            <button className="text-xs font-bold text-indigo-600 hover:underline">Voir tout</button>
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3, 4].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-slate-50 hover:bg-slate-50/50 transition-colors group">
                <div className="h-12 w-12 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center font-black text-slate-400">
                  JD
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">Jean Dupont a complété "VMA Longue"</p>
                  <p className="text-xs text-slate-400 font-medium">Il y a 14 minutes • <span className="text-indigo-500 italic">Course à pied</span></p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">48:20</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Durée</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Focus Athlète du jour */}
        <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          </div>
          <h3 className="font-black uppercase italic text-indigo-200 text-sm tracking-widest mb-6">Focus Performance</h3>
          
          <div className="flex items-center gap-4 mb-8">
            <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Marc" alt="avatar" className="h-12 w-12" />
            </div>
            <div>
              <p className="text-xl font-black italic">Marc LEROY</p>
              <p className="text-xs font-bold text-indigo-200">Cyclisme • Elite</p>
            </div>
          </div>

          <div className="space-y-4 relative z-10">
            <div className="bg-white/10 rounded-xl p-3 border border-white/10">
               <p className="text-[10px] font-bold uppercase opacity-60">Charge Entraînement</p>
               <div className="flex items-center justify-between mt-1">
                  <span className="font-black text-lg">742</span>
                  <span className="text-xs font-bold text-emerald-300">Optimale</span>
               </div>
            </div>
            <button className="w-full py-3 bg-white text-indigo-600 rounded-xl font-black text-sm uppercase tracking-tight shadow-lg">
              Voir le profil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}