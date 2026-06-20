"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { 
  Activity, Heart, Flame, Scale, TrendingUp, 
  AlertCircle, BatteryWarning, CheckCircle2, ActivitySquare,
  ArrowUpRight, ChevronRight, Calendar, Target, Loader2, Clock, Navigation
} from 'lucide-react';

interface PhysioData {
  state: 'NORMAL' | 'FATIGUED' | 'PAIN' | 'INJURED';
  stateMessage?: string | null;
  ftp: number | null;
  restingHr: number | null;
  maxHr: number | null;
  weight: number | null;
}

interface AthleteOverviewData {
  athlete: {
    id: string;
    email: string;
  };
  permissions: {
    shareActivities: boolean;
    sharePhysiology: boolean;
    shareObjectives: boolean;
    shareAnalytics: boolean;
    shareRecords: boolean;
  };
  weeklyStats: {
    distance: number;
    duration: number; 
    count: number;
  };
  recentActivities: {
    id: string;
    title: string;
    date: string;
    distance: number;
    duration: number;
    elevation: number; // ✨ Ajouté depuis le nouveau mapping backend
  }[] | null;
  upcomingPlanning: {
    id: string;
    title: string;
    startDate: string;
    type: string;
  }[] | null;
  physio: PhysioData | null;
  objectives: {
    id: string;
    name: string;
    endDate: string;
    isActive: boolean;
  }[] | null;
}

const formatDuration = (seconds: number) => {
  if (!seconds) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}`;
  return `${m} min`;
};

export default function AthleteOverviewPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [data, setData] = useState<AthleteOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await api(`/coaching/athletes/${id}/overview`);
        if (res.ok) {
          const resData = await res.json();
          setData(resData);
        }
      } catch (err) {
        console.error("Erreur lors du chargement de la vue globale", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOverview();
  }, [id]);

  if (loading) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-12 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={32} />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Chargement de la vue d'ensemble...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-12 shadow-sm text-center text-slate-500">
        <AlertCircle className="text-slate-300 mx-auto mb-3" size={32} />
        <p className="text-sm font-bold">Impossible de charger les données de l'athlète.</p>
      </div>
    );
  }

  const { weeklyStats, permissions, physio, recentActivities, objectives } = data;
  const lastActivity = recentActivities && recentActivities.length > 0 ? recentActivities[0] : null;
  const nextObjective = objectives && objectives.length > 0 ? objectives[0] : null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-300">
      
      {/* ================= COLONNE PRINCIPALE (GAUCHE & MILIEU) ================= */}
      <div className="xl:col-span-2 space-y-6">
        
        {/* Carte État de Forme Général */}
        {permissions.sharePhysiology && physio?.state && (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">État de forme actuel</h2>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100/60">
              <div className="flex items-center gap-3">
                {physio.state === 'NORMAL' && (
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={22} />
                  </div>
                )}
                {physio.state === 'FATIGUED' && (
                  <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                    <BatteryWarning size={22} />
                  </div>
                )}
                {physio.state === 'PAIN' && (
                  <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shrink-0">
                    <ActivitySquare size={22} />
                  </div>
                )}
                {physio.state === 'INJURED' && (
                  <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                    <AlertCircle size={22} />
                  </div>
                )}
                <div>
                  <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight">
                    {physio.state === 'NORMAL' && "Tout est au vert"}
                    {physio.state === 'FATIGUED' && "Fatigue signalée"}
                    {physio.state === 'PAIN' && "Point de douleur / Gêne"}
                    {physio.state === 'INJURED' && "Blessure / Arrêt obligatoire"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {physio.stateMessage || "Aucune note ou commentaire particulier de l'athlète."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Résumé de la semaine d'entraînement */}
        {permissions.shareActivities && (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Volume de la semaine</h2>
              <button 
                onClick={() => router.push(`/athletes/${id}/data`)}
                className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:text-indigo-700 transition-colors"
              >
                Analyses détaillées <ArrowUpRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Distance hebdo</p>
                <p className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
                  {weeklyStats?.distance ?? 0} <span className="text-xs font-bold text-slate-400 font-sans">km</span>
                </p>
              </div>
              <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Temps total</p>
                <p className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
                  {weeklyStats?.duration ? formatDuration(weeklyStats.duration) : '0 min'}
                </p>
              </div>
              <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Séances réalisées</p>
                <p className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
                  {weeklyStats?.count || 0}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dernière Activité Enregistrée */}
        {permissions.shareActivities && lastActivity && (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Dernière activité synchronisée (Fichier)</h2>
            
            <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-9 w-9 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <Activity size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-slate-900 text-sm truncate uppercase tracking-tight">
                    {lastActivity.title}
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                    <Clock size={12} className="text-slate-300" />
                    {new Date(lastActivity.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Métriques enrichies avec le Dénivelé (D+) */}
              <div className="grid grid-cols-3 gap-4 sm:gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 shrink-0 text-center sm:text-left">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Distance</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">{lastActivity.distance.toFixed(1)} km</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Dénivelé</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5 flex items-center justify-center sm:justify-start gap-0.5">
                    {Math.round(lastActivity.elevation)} m
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Durée</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">{formatDuration(lastActivity.duration)}</p>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* ================= COLONNE SECONDAIRE (DROITE) ================= */}
      <div className="space-y-6">
        
        {/* Profil Physiologique complet */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5">Profil Physiologique</h2>
          
          {permissions.sharePhysiology && physio ? (
            <div className="space-y-2.5">
              {/* FTP */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-100/50">
                <div className="flex items-center gap-2.5">
                  <Flame size={16} className="text-amber-500" />
                  <span className="text-xs font-black text-slate-600 uppercase tracking-tight">Seuil (FTP)</span>
                </div>
                <span className="text-xs font-black text-slate-900 bg-white border border-slate-200 shadow-sm px-2.5 py-1 rounded-lg">{physio.ftp ? `${physio.ftp} W` : '--'}</span>
              </div>

              {/* FC Repos */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-100/50">
                <div className="flex items-center gap-2.5">
                  <Heart size={16} className="text-rose-500" />
                  <span className="text-xs font-black text-slate-600 uppercase tracking-tight">FC au Repos</span>
                </div>
                <span className="text-xs font-black text-slate-900 bg-white border border-slate-200 shadow-sm px-2.5 py-1 rounded-lg">{physio.restingHr ? `${physio.restingHr} bpm` : '--'}</span>
              </div>

              {/* FC Max */}
              {physio.maxHr && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-100/50">
                  <div className="flex items-center gap-2.5">
                    <TrendingUp size={16} className="text-indigo-500" />
                    <span className="text-xs font-black text-slate-600 uppercase tracking-tight">FC Max</span>
                  </div>
                  <span className="text-xs font-black text-slate-900 bg-white border border-slate-200 shadow-sm px-2.5 py-1 rounded-lg">{physio.maxHr} bpm</span>
                </div>
              )}

              {/* Poids */}
              {physio.weight && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-100/50">
                  <div className="flex items-center gap-2.5">
                    <Scale size={16} className="text-emerald-500" />
                    <span className="text-xs font-black text-slate-600 uppercase tracking-tight">Poids de forme</span>
                  </div>
                  <span className="text-xs font-black text-slate-900 bg-white border border-slate-200 shadow-sm px-2.5 py-1 rounded-lg">{physio.weight} kg</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
              <AlertCircle size={20} className="text-slate-300 mx-auto mb-2" />
              <p className="text-[10px] uppercase font-black tracking-wider text-slate-400 max-w-[180px] mx-auto leading-relaxed">
                Données masquées ou non partagées
              </p>
            </div>
          )}
        </div>

        {/* Prochain Objectif */}
        {permissions.shareObjectives && nextObjective && (
          <div className="bg-indigo-600 rounded-[2.5rem] border border-indigo-500 p-6 shadow-sm text-white relative overflow-hidden">
            <div className="absolute -top-2 -right-2 p-4 opacity-10 rotate-12">
              <Target size={80} />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-4 relative z-10">Prochain Objectif</h2>
            <div className="relative z-10">
               <h3 className="text-base font-black truncate uppercase tracking-tight italic">{nextObjective.name}</h3>
               <p className="text-xs text-indigo-100 font-bold mt-2 flex items-center gap-1.5">
                 <Calendar size={14} className="text-indigo-300" /> 
                 {new Date(nextObjective.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
               </p>
            </div>
          </div>
        )}

        {/* Menu de navigation rapide interne */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-3 shadow-sm space-y-1">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2 mb-1">Raccourcis</h3>
          
          {permissions.shareActivities && (
            <button 
              onClick={() => router.push(`/athletes/${id}/planning`)}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 text-slate-700 font-black text-xs transition-colors group"
            >
              <span className="flex items-center gap-2.5 uppercase tracking-tight"><Calendar size={14} className="text-slate-400" /> Éditer le Planning</span>
              <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {permissions.shareObjectives && (
            <button 
              onClick={() => router.push(`/athletes/${id}/goals`)}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 text-slate-700 font-black text-xs transition-colors group"
            >
              <span className="flex items-center gap-2.5 uppercase tracking-tight"><Target size={14} className="text-slate-400" /> Suivre les Objectifs</span>
              <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>

      </div>

    </div>
  );
}