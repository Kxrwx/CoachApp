"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { 
  Activity, Heart, Flame, Scale, TrendingUp, 
  AlertCircle, BatteryWarning, CheckCircle2, ActivitySquare,
  ArrowUpRight, ChevronRight, Calendar, Target, Loader2, Clock, MapPin
} from 'lucide-react';

interface PhysioData {
  state: 'NORMAL' | 'FATIGUED' | 'PAIN' | 'INJURED';
  stateMessage?: string | null;
  ftp: number | null;
  restingHr: number | null;
  maxHr: number | null;
  weight: number | null;
}

// Nouvelle structure correspondant à getAthleteOverview
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
    duration: number; // En secondes, on le formatera
    count: number;
  };
  recentActivities: {
    id: string;
    title: string;
    date: string;
    distance: number;
    duration: number;
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

// Fonction utilitaire pour formater les secondes en HH:MM
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
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-slate-500">
        Impossible de charger les données de l'athlète.
      </div>
    );
  }

  const { weeklyStats, permissions, physio, recentActivities, upcomingPlanning, objectives } = data;
  const lastActivity = recentActivities && recentActivities.length > 0 ? recentActivities[0] : null;
  const nextObjective = objectives && objectives.length > 0 ? objectives[0] : null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-300">
      
      {/* ================= COLONNE PRINCIPALE (GAUCHE & MILIEU) ================= */}
      <div className="xl:col-span-2 space-y-6">
        
        {/* Carte État de Forme Général */}
        {permissions.sharePhysiology && physio?.state && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">État de forme actuel</h2>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100/60">
              <div className="flex items-center gap-3">
                {physio.state === 'NORMAL' && (
                  <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={22} />
                  </div>
                )}
                {physio.state === 'FATIGUED' && (
                  <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <BatteryWarning size={22} />
                  </div>
                )}
                {physio.state === 'PAIN' && (
                  <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <ActivitySquare size={22} />
                  </div>
                )}
                {physio.state === 'INJURED' && (
                  <div className="h-10 w-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertCircle size={22} />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-900">
                    {physio.state === 'NORMAL' && "Tout est au vert"}
                    {physio.state === 'FATIGUED' && "Fatigue signalée"}
                    {physio.state === 'PAIN' && "Point de douleur / Gêne"}
                    {physio.state === 'INJURED' && "Blessure / Arrêt obligatoire"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {physio.stateMessage || "Aucune note ou commentaire particulier de l'athlète."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Résumé de la semaine d'entraînement */}
        {permissions.shareActivities && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Volume de la semaine</h2>
              <button 
                onClick={() => router.push(`/athletes/${id}/data`)}
                className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline"
              >
                Analyses détaillées <ArrowUpRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                <p className="text-xs font-semibold text-slate-400">Distance hebdo</p>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {weeklyStats?.distance ?? 0} <span className="text-xs font-bold text-slate-400">km</span>
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                <p className="text-xs font-semibold text-slate-400">Temps total</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{formatDuration(weeklyStats?.duration || 0)}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                <p className="text-xs font-semibold text-slate-400">Séances réalisées</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{weeklyStats?.count || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* Dernière Activité Enregistrée */}
        {permissions.shareActivities && lastActivity && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Dernière activité synchronisée</h2>
            
            <div className="border border-slate-100 rounded-xl p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-9 w-9 bg-orange-50 text-orange-600 border border-orange-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <Activity size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 text-sm truncate">
                    {lastActivity.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock size={12}/>
                    {new Date(lastActivity.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-50 shrink-0">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Distance</p>
                  <p className="text-sm font-bold text-slate-800">{lastActivity.distance.toFixed(1)} km</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Durée</p>
                  <p className="text-sm font-bold text-slate-800">{formatDuration(lastActivity.duration)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= COLONNE SECONDAIRE (DROITE) ================= */}
      <div className="space-y-6">
        
        {/* Profil Physiologique complet */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5">Profil Physiologique</h2>
          
          {permissions.sharePhysiology && physio ? (
            <div className="space-y-3">
              {/* FTP */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-100/50">
                <div className="flex items-center gap-2.5">
                  <Flame size={16} className="text-amber-500" />
                  <span className="text-xs font-bold text-slate-600">Seuil (FTP)</span>
                </div>
                <span className="text-sm font-black text-slate-900">{physio.ftp ? `${physio.ftp} W` : '--'}</span>
              </div>

              {/* FC Repos */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-100/50">
                <div className="flex items-center gap-2.5">
                  <Heart size={16} className="text-rose-500" />
                  <span className="text-xs font-bold text-slate-600">FC au Repos</span>
                </div>
                <span className="text-sm font-black text-slate-900">{physio.restingHr ? `${physio.restingHr} bpm` : '--'}</span>
              </div>

              {/* FC Max */}
              {physio.maxHr && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-100/50">
                  <div className="flex items-center gap-2.5">
                    <TrendingUp size={16} className="text-indigo-500" />
                    <span className="text-xs font-bold text-slate-600">FC Max</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">{physio.maxHr} bpm</span>
                </div>
              )}

              {/* Poids */}
              {physio.weight && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-100/50">
                  <div className="flex items-center gap-2.5">
                    <Scale size={16} className="text-emerald-500" />
                    <span className="text-xs font-bold text-slate-600">Poids de forme</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">{physio.weight} kg</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
              <AlertCircle size={20} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400 max-w-[180px] mx-auto leading-relaxed">
                Données physiologiques masquées ou non partagées.
              </p>
            </div>
          )}
        </div>

        {/* Prochain Objectif */}
        {permissions.shareObjectives && nextObjective && (
          <div className="bg-indigo-600 rounded-2xl border border-indigo-500 p-6 shadow-sm text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Target size={64} />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-indigo-200 mb-4 relative z-10">Prochain Objectif</h2>
            <div className="relative z-10">
               <h3 className="text-lg font-bold truncate">{nextObjective.name}</h3>
               <p className="text-sm text-indigo-100 mt-1 flex items-center gap-1.5">
                 <Calendar size={14} /> 
                 {new Date(nextObjective.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
               </p>
            </div>
          </div>
        )}

        {/* Menu de navigation rapide interne */}
        <div className="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm space-y-1">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1 mb-1">Raccourcis</h3>
          
          {permissions.shareActivities && (
            <button 
              onClick={() => router.push(`/athletes/${id}/planning`)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors group"
            >
              <span className="flex items-center gap-2.5"><Calendar size={14} className="text-slate-400" /> Éditer le Planning</span>
              <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {permissions.shareObjectives && (
            <button 
              onClick={() => router.push(`/athletes/${id}/goals`)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors group"
            >
              <span className="flex items-center gap-2.5"><Target size={14} className="text-slate-400" /> Suivre les Objectifs</span>
              <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>

      </div>

    </div>
  );
}