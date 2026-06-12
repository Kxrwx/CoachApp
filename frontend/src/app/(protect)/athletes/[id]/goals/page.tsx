"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Target, Plus, Loader2, AlertCircle, Calendar, Flag, Activity, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api } from '@/lib/api';

// Typages mis à jour avec les données enrichies du backend
interface Metric {
  id: string;
  key: string;
  name: string;
  unit: string;
}

interface GoalTarget {
  id: string;
  targetValue: number;
  currentValue: number | null;
  progressPercent: number | null;
  recordValue: number | null;
  metric: Metric;
}

interface Goal {
  id: string;
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  status?: string;
  targets: GoalTarget[];
}

export default function AthleteGoalsPage() {
  const { id: athleteId } = useParams();
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchObjectives = async () => {
      try {
        const res = await api(`/coaching/athletes/${athleteId}/objectives`);
        
        // Gestion de l'erreur 403 (Permission refusée)
        if (res.status === 403) {
          setError("L'athlète n'a pas autorisé le partage de ses objectifs.");
          return;
        }

        if (!res.ok) throw new Error("Erreur lors de la récupération des objectifs.");
        
        const data = await res.json();
        setGoals(data);
      } catch (err) {
        console.error(err);
        setError("Une erreur est survenue lors du chargement des objectifs.");
      } finally {
        setLoading(false);
      }
    };

    if (athleteId) {
      fetchObjectives();
    }
  }, [athleteId]);

  /*
  |--------------------------------------------------------------------------
  | RENDER : CHARGEMENT & ERREURS
  |--------------------------------------------------------------------------
  */
  if (loading) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-12 shadow-sm flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={32} />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Chargement des objectifs...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
        <div className="flex flex-col items-center justify-center text-center py-12">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
            <AlertCircle className="text-red-500" size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-2">Accès restreint</h3>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | RENDER : LISTE DES OBJECTIFS
  |--------------------------------------------------------------------------
  */
  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight italic">
            <Target className="text-indigo-600" size={28} />
            Objectifs de la saison
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">
            Vue Coach - Planification et Suivi de Progression
          </p>
        </div>
        
        <button className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-black py-3 px-5 rounded-xl text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 border border-slate-200 shadow-sm">
          <Plus size={14} /> Ajouter
        </button>
      </div>
      
      {/* CONTENT */}
      {goals.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
          <Flag className="text-slate-300 mx-auto mb-3" size={32} />
          <p className="text-sm font-bold text-slate-500">Aucun objectif défini pour le moment.</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">
            L'athlète n'a pas encore de cibles pour cette saison.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {goals.map((goal) => (
            <div key={goal.id} className="border border-slate-100 rounded-3xl p-6 hover:shadow-md transition-shadow bg-slate-50/30 flex flex-col justify-between">
              
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-black text-slate-900 diagonal-fractions tracking-tight">
                    {goal.name}
                  </h3>
                  {goal.status && (
                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-600 shadow-sm">
                      {goal.status}
                    </span>
                  )}
                </div>

                {goal.description && (
                  <p className="text-sm text-slate-600 mb-6">
                    {goal.description}
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-6 bg-white p-3 rounded-xl border border-slate-100 w-fit shadow-sm">
                  <Calendar size={14} className="text-indigo-400" />
                  <span>
                    {format(new Date(goal.startDate), "dd MMM yyyy", { locale: fr })}
                  </span>
                  <span className="text-slate-300 mx-1">→</span>
                  <span>
                    {format(new Date(goal.endDate), "dd MMM yyyy", { locale: fr })}
                  </span>
                </div>
              </div>

              {/* TARGETS / METRIQUES AVEC PROGRESSION ENRICHIE */}
              {goal.targets && goal.targets.length > 0 && (
                <div className="border-t border-slate-200/60 pt-4 mt-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                    <Activity size={12} /> Suivi des métriques ({format(new Date(), "MMMM", { locale: fr })})
                  </p>
                  
                  <div className="space-y-4">
                    {goal.targets.map((target) => {
                      const hasProgress = target.progressPercent !== null;
                      const clampedProgress = Math.min(target.progressPercent ?? 0, 100);

                      return (
                        <div key={target.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                          {/* Label & Valeurs globales */}
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
                              {target.metric.name}
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              Cible: <strong className="text-slate-900 font-black">{target.targetValue} {target.metric.unit}</strong>
                            </span>
                          </div>

                          {/* Barre de Progression Visuelle */}
                          {hasProgress ? (
                            <div className="space-y-1.5">
                              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/30">
                                <div 
                                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${clampedProgress}%` }}
                                />
                              </div>
                              <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-indigo-600">
                                  Actuel: {target.currentValue} {target.metric.unit}
                                </span>
                                <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                  {target.progressPercent}%
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">
                              Aucune donnée synchronisée ce mois-ci
                            </p>
                          )}

                          {/* Record Personnel Historique (Exclut Strava d'office via le backend) */}
                          {target.recordValue !== null && (
                            <div className="mt-2.5 pt-2 border-t border-dashed border-slate-100 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-amber-600">
                              <Trophy size={11} className="text-amber-500 shrink-0" />
                              <span>Meilleur Record Fichier/Manuel : {target.recordValue} {target.metric.unit}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
            </div>
          ))}
        </div>
      )}
    </div>
  );
}