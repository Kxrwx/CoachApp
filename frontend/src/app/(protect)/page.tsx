"use client";

import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { 
  TrendingUp, Zap, Target, Trophy, Calendar, 
  ChevronRight, Activity, Flame, Dumbbell, 
  Award, Star, BarChart3, Clock
} from 'lucide-react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStrava } from "@fortawesome/free-brands-svg-icons";

export default function HomePage() {
  const [stats, setStats] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [physio, setPhysio] = useState<any>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthStr = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [resStats, resGoals, resPhysio, resActivities, resPlanning] = await Promise.all([
          api("/stats/dashboard"),
          api("/goals"),
          api("/physiology/calculate"),
          api("/activities"),
          api("/planning/workouts")
        ]);

        const safeJson = async (res: Response) => {
          if (!res || !res.ok) return null;
          const text = await res.text();
          return text ? JSON.parse(text) : null;
        };

        const dataStats = await safeJson(resStats);
        const dataGoals = await safeJson(resGoals);
        const dataPhysio = await safeJson(resPhysio);
        const dataActivities = await safeJson(resActivities);
        const dataPlanning = await safeJson(resPlanning);

        if (dataStats) setStats(dataStats);
        if (dataGoals) setGoals(dataGoals);
        if (dataPhysio) setPhysio(dataPhysio);
        
        if (dataActivities && Array.isArray(dataActivities)) {
          setRecentActivities(dataActivities.slice(0, 4));
        }

        if (dataPlanning && dataPlanning.plannedWorkouts) {
          const futures = dataPlanning.plannedWorkouts
            .filter((workout: any) => new Date(workout.startDate) >= now && workout.status !== 'cancelled')
            .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
          
          setUpcomingSessions(futures.slice(0, 4));
        }

      } catch (err) {
        console.error("Erreur lors du chargement de la HomePage", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="relative flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
          <FontAwesomeIcon icon={faStrava} className="absolute text-xl text-[#FC4C02]" />
        </div>
      </div>
    );
  }

  const monthKey = `month_${currentYear}_${now.getMonth() + 1}`;
  const currentMonthStats = stats?.monthly?.find((m: any) => m.periodType === monthKey) || {
    distance: 0, elevation: 0, count: 0, avgWatts: 0, maxWatts: 0
  };

  const activeGoals = goals.filter((g: any) => g.isActive);
  const completedGoalsCount = goals.filter((g: any) => 
    g.targets?.every((t: any) => (t.recordValue ?? 0) >= (t.targetValue ?? 0))
  ).length;

  const ftp = physio?.ftp || 0;
  const weight = physio?.weight || 0;
  const wkg = ftp && weight ? (ftp / weight).toFixed(2) : "--";

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 lg:p-6">
      
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Performance Hub</h2>
          </div>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Suivi en temps réel de vos records personnels face à vos objectifs de saison.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold">
            <Calendar size={14} className="text-indigo-600" /> <span className="capitalize">{currentMonthStr}</span>
          </div>
          <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 text-[#FC4C02] text-xs font-bold">
            <FontAwesomeIcon icon={faStrava} className="text-sm" /> Strava Sync
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Activity size={20} /></div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{currentMonthStats.count} Sorties</span>
          </div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Volume Mensuel</p>
          <h4 className="text-2xl font-bold text-slate-900 mt-1">
            {currentMonthStats.distance ? currentMonthStats.distance.toFixed(1) : "0"} <span className="text-xs font-normal text-slate-400">km</span>
          </h4>
          <p className="text-xs text-slate-500 mt-1">+{currentMonthStats.elevation.toFixed(0)}m dénivelé</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-500"><Target size={20} /></div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{completedGoalsCount} Validé(s)</span>
          </div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Objectifs Actifs</p>
          <h4 className="text-2xl font-bold text-slate-900 mt-1">{activeGoals.length} <span className="text-xs font-normal text-slate-400">en cours</span></h4>
          <p className="text-xs text-slate-500 mt-1">Sur un total de {goals.length} fixés</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-500"><Zap size={20} /></div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{wkg} W/kg</span>
          </div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Seuil FTP Actuel</p>
          <h4 className="text-2xl font-bold text-slate-900 mt-1">{ftp > 0 ? `${ftp}` : "--"} <span className="text-xs font-normal text-slate-400">Watts</span></h4>
          <p className="text-xs text-slate-500 mt-1">Profil synchro ({weight || "--"} kg)</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 rounded-lg bg-rose-50 text-rose-500"><Flame size={20} /></div>
            <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">Mois Courant</span>
          </div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Puissance Moyenne</p>
          <h4 className="text-2xl font-bold text-slate-900 mt-1">{currentMonthStats.avgWatts ? currentMonthStats.avgWatts.toFixed(0) : "0"} <span className="text-xs font-normal text-slate-400">W</span></h4>
          <p className="text-xs text-slate-500 mt-1">Pic max : {currentMonthStats.maxWatts || "--"} W</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
              <Trophy size={18} className="text-amber-500" /> Progression de mes Records (PR)
            </h3>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">PR vs Objectif</span>
          </div>
          
          <div className="space-y-5">
            {activeGoals.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                <Target size={36} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">Aucun objectif actif.</p>
              </div>
            ) : (
              activeGoals.map((goal: any) => {
                const target = goal.targets?.[0];
                const recordVal = target?.recordValue ?? 0;
                const targetVal = target?.targetValue ?? 0;
                const progress = targetVal > 0 ? Math.round((recordVal / targetVal) * 100) : 0;
                const clampedProgress = Math.min(Math.max(progress, 0), 100);

                return (
                  <div key={goal.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded uppercase tracking-wider">{goal.type}</span>
                          <p className="text-sm font-bold text-slate-800">{goal.name}</p>
                        </div>
                        <p className="text-xs text-slate-400 font-medium mt-0.5 uppercase">
                          Métrique : <span className="text-slate-600">{target?.metric?.name || target?.metric?.key}</span>
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-medium text-slate-400 block uppercase">Échéance</span>
                        <span className="text-xs font-bold text-slate-700">
                          {new Date(goal.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-1 text-center">
                      <div className="bg-amber-50 p-3 rounded-lg border border-amber-200/60 flex flex-col justify-center items-center">
                        <span className="text-xs font-bold text-amber-800 uppercase flex items-center gap-1"><Trophy size={12} /> Mon Record</span>
                        <span className="text-base font-bold text-amber-950 mt-1">{recordVal} <span className="text-xs font-normal text-amber-800">{target?.metric?.unit}</span></span>
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200/60 flex flex-col justify-center items-center">
                        <span className="text-xs font-bold text-indigo-700 uppercase block">Valeur Cible</span>
                        <span className="text-base font-bold text-slate-900 mt-1">{targetVal} <span className="text-xs font-normal text-slate-500">{target?.metric?.unit}</span></span>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${clampedProgress}%` }}></div>
                      </div>
                      <div className="flex justify-between items-center text-xs font-medium uppercase tracking-wider">
                        <span className={progress >= 100 ? 'text-emerald-600' : 'text-slate-500'}>Défini à {progress}%</span>
                        {progress >= 100 ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded"><Award size={11} /> Cible Dépassée !</span>
                        ) : (
                          <span className="text-slate-400">Reste {Math.max(0, targetVal - recordVal)} {target?.metric?.unit}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 text-slate-900 shadow-sm flex flex-col justify-between border border-slate-200">
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold uppercase text-indigo-600 text-xs tracking-wider flex items-center gap-1.5"><BarChart3 size={14} /> Zones & Puissance</h3>
              <span className="text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded font-bold">PROFIL PHYSIO</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg"><Dumbbell size={18} /></div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Rapport Poids/Puissance</p>
                  <p className="text-lg font-bold text-slate-900">{wkg} <span className="text-xs font-normal text-slate-500">W/kg au seuil</span></p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center pt-2 border-t border-slate-200">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="block text-[11px] text-slate-500 font-medium uppercase tracking-wider">Poids</span>
                  <span className="text-sm font-bold text-slate-900">{weight ? `${weight} kg` : "--"}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="block text-[11px] text-slate-500 font-medium uppercase tracking-wider">FTP</span>
                  <span className="text-sm font-bold text-amber-600">{ftp ? `${ftp} W` : "--"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Zones cibles d'entraînement</p>
              <div className="space-y-1.5 text-xs font-medium text-slate-700">
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-400"/> Z2 Endurance</span>
                  <span className="font-bold text-slate-900">{ftp ? `${Math.round(ftp * 0.56)} - ${Math.round(ftp * 0.75)} W` : "--"}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400"/> Z3 Tempo</span>
                  <span className="font-bold text-slate-900">{ftp ? `${Math.round(ftp * 0.76)} - ${Math.round(ftp * 0.90)} W` : "--"}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-400"/> Z4 Seuil / FTP</span>
                  <span className="font-bold text-slate-900">{ftp ? `${Math.round(ftp * 0.91)} - ${Math.round(ftp * 1.05)} W` : "--"}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500"/> Z5 VO2Max</span>
                  <span className="font-bold text-rose-600">{ftp ? `>${Math.round(ftp * 1.06)} W` : "--"}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <button className="w-full py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.99] transition-all rounded-lg font-semibold text-sm shadow-sm flex items-center justify-center gap-1">
              Analyses physiologiques <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
              <Activity size={18} className="text-indigo-600" /> Dernières activités
            </h3>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Historique</span>
          </div>

          <div className="divide-y divide-slate-100">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">Aucune activité récente enregistrée.</p>
            ) : (
              recentActivities.map((act: any, idx: number) => {
                const name = act.stravaDetail?.name || (act.idStrava ? "Activité Strava" : "Activité importée");
                const rawDistance = act.stravaDetail?.distance || act.uploadDetail?.distance || 0;
                const distanceKm = rawDistance / 1000;
                
                const type = act.stravaDetail?.type || (act.idUpload ? "FIT File" : "Workout");

                return (
                  <div key={act.id || idx} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 rounded-lg text-slate-600 border border-slate-100">
                        {act.idStrava ? (
                          <FontAwesomeIcon icon={faStrava} className="text-[#FC4C02] text-sm" />
                        ) : (
                          <TrendingUp size={16} />
                        )}
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-slate-800 line-clamp-1">{name}</h5>
                        <span className="text-xs text-slate-400">
                          {act.startDate ? new Date(act.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : "--"}{" "}
                          • <span className="lowercase">{type}</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900 block">
                        {distanceKm > 0 ? `${distanceKm.toFixed(1)} km` : "--"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
              <Calendar size={18} className="text-emerald-600" /> Séances planifiées
            </h3>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Calendrier</span>
          </div>

          <div className="divide-y divide-slate-100">
            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">Aucune séance prévue à l'agenda.</p>
            ) : (
              upcomingSessions.map((session: any, idx: number) => (
                <div key={session.id || idx} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 flex-shrink-0" style={{ borderColor: session.color }}>
                      <Clock size={16} style={{ color: session.color }} />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-sm font-bold text-slate-800 truncate">{session.title}</h5>
                      <p className="text-xs text-slate-400 font-medium truncate max-w-[200px] sm:max-w-xs">
                        {session.description || `${session.type} - ${session.intensity || 'Intensité normale'}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 pl-2">
                    <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded-md block border border-slate-200 whitespace-nowrap">
                      {session.startDate ? new Date(session.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : "Bientôt"}
                    </span>
                    {session.startTime && (
                      <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">{session.startTime}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {stats?.allTime && (
        <div className="bg-white px-6 py-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs font-semibold text-slate-500 shadow-sm">
          <span className="flex items-center gap-1"><Star size={14} className="text-amber-500" /> Volume de carrière cumulé (Strava + Upload)</span>
          <div className="flex gap-4 text-slate-800 font-bold">
            <span>Distance Totale : <span className="text-indigo-600">{stats.allTime.distance.toFixed(0)} km</span></span>
            <span>Sessions : <span className="text-indigo-600">{stats.allTime.count}</span></span>
          </div>
        </div>
      )}

    </div>
  );
}