"use client";



import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { 
  BarChart3, Route, Flame, Trophy, Calendar, 
  ChevronDown, Loader2, AlertCircle, EyeOff, Activity
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

interface AnalyticsData {
  totals: {
    distance: number;
    elevation: number;
    count: number;
  };
  monthly: { label: string; distance: number; elevation: number; count: number }[];
  weekly: { label: string; distance: number; elevation: number; count: number }[];
}

interface PersonalRecord {
  id: string;
  name: string;
  value: number | null;
  achievedAt: string;
  metric: {
    name: string;
    unit: string;
  };
}

export default function AthleteDataPage() {
  const { id } = useParams();
  const router = useRouter();

  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('weekly');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [records, setRecords] = useState<PersonalRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<{ analyticsForbidden?: boolean; recordsForbidden?: boolean }>({});

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [analyticsRes, recordsRes] = await Promise.all([
          api(`/coaching/athletes/${id}/analytics`),
          api(`/coaching/athletes/${id}/records`)
        ]);

        if (analyticsRes.status === 403) {
          setErrorStatus(prev => ({ ...prev, analyticsForbidden: true }));
        } else if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData);
        }

        if (recordsRes.status === 403) {
          setErrorStatus(prev => ({ ...prev, recordsForbidden: true }));
        } else if (recordsRes.ok) {
          const recordsData = await recordsRes.json();
          setRecords(recordsData);
        }

      } catch (err) {
        console.error("Erreur globale lors du chargement des analyses", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchAllData();
  }, [id]);

  if (loading) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-12 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={32} />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Génération des statistiques...
        </p>
      </div>
    );
  }

  const activeChartData = timeframe === 'weekly' ? analytics?.weekly : analytics?.monthly;
  
  const validRecords = records?.filter(record => record.value != null && record.value !== 0) || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
          <BarChart3 className="text-indigo-600" size={18} />
          Analyse des Volumes (Fichiers locaux)
        </h2>
      </div>

      {errorStatus.analyticsForbidden ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-[2.5rem] p-8 text-center text-slate-500">
          <EyeOff className="text-slate-300 mx-auto mb-3" size={28} />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Accès restreint</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">L'athlète n'a pas partagé l'accès à ses analyses poussées.</p>
        </div>
      ) : (
        analytics && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-[2.5rem] border border-slate-100 p-5 shadow-sm">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center mb-3 border border-blue-100">
                  <Route size={16} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Distance cumulée (12m)</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900 tracking-tight">{analytics.totals.distance}</span>
                  <span className="text-xs font-bold text-slate-400 font-sans">km</span>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-slate-100 p-5 shadow-sm">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mb-3 border border-amber-100">
                  <Flame size={16} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dénivelé total (12m)</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900 tracking-tight">{analytics.totals.elevation}</span>
                  <span className="text-xs font-bold text-slate-400 font-sans">m+</span>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-slate-100 p-5 shadow-sm">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-3 border border-indigo-100">
                  <Activity size={16} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre total de séances</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900 tracking-tight">{analytics.totals.count}</span>
                  <span className="text-xs font-bold text-slate-400 font-sans">activités</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Évolution des volumes kilométriques
                </h3>
                
                <div className="relative">
                  <select 
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value as 'weekly' | 'monthly')}
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-800 text-[10px] font-black uppercase tracking-widest rounded-xl pl-4 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-all"
                  >
                    <option value="weekly">4 dernières semaines</option>
                    <option value="monthly">12 derniers mois</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} 
                    />
                    
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl shadow-xl">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                {data.label}
                              </p>
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-white flex items-center gap-2">
                                  <Route size={12} className="text-indigo-400" />
                                  {data.distance} km
                                </p>
                                <p className="text-xs font-bold text-white flex items-center gap-2">
                                  <Flame size={12} className="text-amber-400" />
                                  {data.elevation} m+
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="distance" 
                      fill="#4f46e5" 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={48}
                      animationDuration={1000}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )
      )}

      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2">
          <Trophy className="text-amber-500" size={16} />
          Records Personnels Majeurs
        </h3>

        {errorStatus.recordsForbidden ? (
          <div className="text-center py-6 border border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
            <EyeOff className="text-slate-300 mx-auto mb-2" size={20} />
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Accès restreint par l'athlète</p>
          </div>
        ) : validRecords.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {validRecords.map((record) => (
              <div 
                key={record.id} 
                className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100/60 hover:border-slate-200 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                    <Trophy size={16} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black uppercase tracking-tight text-slate-800 truncate">
                      {record.name}
                    </h4>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5 flex items-center gap-1">
                      <Calendar size={10} />
                      {new Date(record.achievedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-xl group-hover:border-indigo-200 transition-colors">
                  <span className="text-sm font-black text-slate-900 tracking-tight">{record.value}</span>
                  <span className="text-[10px] font-bold text-slate-400 ml-0.5 font-sans">{record.metric?.unit}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-[2rem] bg-slate-50/30 text-slate-400">
            <AlertCircle size={20} className="mx-auto mb-2 text-slate-300" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Aucun record valide enregistré
            </p>
          </div>
        )}
      </div>

    </div>
  );
}