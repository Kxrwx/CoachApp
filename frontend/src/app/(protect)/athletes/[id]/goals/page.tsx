"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Target, Plus, Loader2, AlertCircle, Calendar, Flag, Activity, Trophy, X, Sparkles, History } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  RadialBarChart, 
  RadialBar, 
  ResponsiveContainer, 
  PolarAngleAxis 
} from "recharts";
import { api } from '@/lib/api';

interface Metric {
  id: string;
  key: string;
  name: string;
  unit: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  metricId: string;
  metricName: string;
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

type ModalStep = 'template-select' | 'configure';

const getDefaultProposalData = (firstMetricId = "") => ({
  name: "",
  description: "",
  startDate: format(new Date(), 'yyyy-MM-dd'),
  endDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
  metricId: firstMetricId,
  targetValue: "" as number | "",
  templateId: undefined as string | undefined,
});

const PrVsTargetRing = ({
  target,
  targetValue,
  size = 110,
}: {
  target: number;
  targetValue: number | "";
  size?: number;
}) => {
  const currentVal = Number(target) > 0 ? Number(target) : 0;
  const goalVal = Number(targetValue) > 0 ? Number(targetValue) : 0;
  
  const percentage = goalVal > 0 ? Math.min(Math.round((currentVal / goalVal) * 100), 100) : 0;
  const chartColor = percentage >= 100 ? "#10b981" : "#4f46e5";
  const chartData = [{ value: percentage, fill: chartColor }];

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="75%"
          outerRadius="100%"
          barSize={10}
          data={chartData}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background dataKey="value" cornerRadius={5} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xl font-black text-slate-800 tracking-tight">{percentage}%</span>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">DE LA CIBLE</span>
      </div>
    </div>
  );
};

const ProgressRing = ({
  target,
  current, 
  size = 90,
}: {
  target: number;
  current: number | null;
  size?: number;
}) => {
  const currentVal = current && current > 0 ? current : 0;
  const goalVal = target && target > 0 ? target : 0;
  
  const percentage = goalVal > 0 ? Math.min(Math.round((currentVal / goalVal) * 100), 100) : 0;
  const chartColor = percentage >= 100 ? "#10b981" : "#4f46e5";
  const chartData = [{ value: percentage, fill: chartColor }];

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="75%"
          outerRadius="100%"
          barSize={8}
          data={chartData}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background dataKey="value" cornerRadius={5} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-sm font-black text-slate-800 tracking-tight">{percentage}%</span>
      </div>
    </div>
  );
};


export default function AthleteGoalsPage() {
  const { id: athleteId } = useParams();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showProposalForm, setShowProposalForm] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>('template-select');
  const [submitting, setSubmitting] = useState(false);
  const [proposalData, setProposalData] = useState(getDefaultProposalData());

  const selectedMetric = metrics.find(m => m.id === proposalData.metricId) ?? null;

  useEffect(() => {
    if (!athleteId) return;

    const fetchData = async () => {
      try {
        const [goalsRes, metricsRes, templatesRes] = await Promise.all([
          api(`/coaching/athletes/${athleteId}/objectives`),
          api(`/metrics`),
          api(`/goals/templates`),
        ]);

        if (goalsRes.status === 403) {
          setError("L'athlète n'a pas autorisé le partage de ses objectifs.");
          return;
        }

        if (goalsRes.ok) setGoals(await goalsRes.json());
        if (templatesRes.ok) setTemplates(await templatesRes.json());

        if (metricsRes.ok) {
          const metricsData: Metric[] = await metricsRes.json();
          setMetrics(metricsData);
          if (metricsData.length > 0) {
            setProposalData(getDefaultProposalData(metricsData[0].id));
          }
        }
      } catch (err) {
        console.error(err);
        setError("Une erreur est survenue lors du chargement des données.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [athleteId]);


  const handleOpenForm = () => {
    setProposalData(getDefaultProposalData(metrics[0]?.id ?? ""));
    setModalStep('template-select');
    setShowProposalForm(true);
  };

  const handleCloseForm = () => {
    setShowProposalForm(false);
    setProposalData(getDefaultProposalData(metrics[0]?.id ?? ""));
    setModalStep('template-select');
  };

  const handlePickTemplate = (template: Template) => {
    setProposalData(prev => ({
      ...prev,
      name: template.name,
      metricId: template.metricId,
      templateId: template.id,
      targetValue: "",
    }));
    setModalStep('configure');
  };

  const handlePickFree = () => {
    setProposalData(prev => ({
      ...prev,
      name: "",
      metricId: metrics[0]?.id ?? "",
      templateId: undefined,
      targetValue: "",
    }));
    setModalStep('configure');
  };

  const handleBackToTemplates = () => {
    setModalStep('template-select');
  };

  const handleProposeGoal = async () => {
    const { name, startDate, endDate, metricId, targetValue, description } = proposalData;

    if (!name.trim()) {
      alert("Veuillez saisir un intitulé pour l'objectif.");
      return;
    }
    if (!startDate || !endDate) {
      alert("Veuillez renseigner les dates de début et d'échéance.");
      return;
    }
    if (!metricId) {
      alert("Veuillez sélectionner un indicateur de suivi.");
      return;
    }
    if (!targetValue || Number(targetValue) <= 0) {
      alert("Veuillez saisir une valeur cible supérieure à 0.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        type: "COACH_PROPOSAL",
        description: description.trim() || null,
        startDate,
        endDate,
        targets: [{ metricId, targetValue: Number(targetValue) }],
      };

      const response = await api(`/coaching/athletes/${athleteId}/goal-proposal`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("Proposition d'objectif envoyée à l'athlète avec succès !");
        handleCloseForm();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData?.message ?? "Erreur lors de l'envoi de la proposition.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau lors de l'envoi de la proposition.");
    } finally {
      setSubmitting(false);
    }
  };

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


  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm relative">

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight italic">
            <Target className="text-indigo-600" size={28} />
            Objectifs de la saison
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">
            Vue Coach — Planification et suivi de progression
          </p>
        </div>

        <button
          onClick={handleOpenForm}
          className="bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-black py-3 px-5 rounded-xl text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 border border-slate-200 hover:border-indigo-200 shadow-sm"
        >
          <Plus size={14} /> Proposer un objectif
        </button>
      </div>

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
            <div
              key={goal.id}
              className="border border-slate-100 rounded-3xl p-6 hover:shadow-md transition-shadow bg-slate-50/30 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    {goal.name}
                  </h3>
                  {goal.status && (
                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-600 shadow-sm">
                      {goal.status}
                    </span>
                  )}
                </div>

                {goal.description && (
                  <p className="text-sm text-slate-600 mb-6">{goal.description}</p>
                )}

                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-6 bg-white p-3 rounded-xl border border-slate-100 w-fit shadow-sm">
                  <Calendar size={14} className="text-indigo-400" />
                  <span>{format(new Date(goal.startDate), "dd MMM yy", { locale: fr })}</span>
                  <span className="text-slate-300 mx-1">→</span>
                  <span>{format(new Date(goal.endDate), "dd MMM yy", { locale: fr })}</span>
                </div>
              </div>

              {goal.targets && goal.targets.length > 0 && (
                <div className="border-t border-slate-200/60 pt-4 mt-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                    <Activity size={12} /> Suivi des métriques
                  </p>
                  <div className="space-y-4">
                    {goal.targets.map((target) => (
  <div
    key={target.id}
    className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4"
  >
    <div className="flex-1">
      <span className="text-xs font-black text-slate-800 uppercase tracking-tight block mb-1">
        {target.metric.name}
      </span>
      <div className="text-xs text-slate-500">
        Cible :{" "}
        <strong className="text-slate-900 font-black">
          {target.targetValue} {target.metric.unit}
        </strong>
      </div>
      <div className="text-xs text-slate-500 mb-2">
        Actuel :{" "}
        <strong className="text-indigo-600 font-black">
          {target.currentValue ?? 0} {target.metric.unit}
        </strong>
      </div>
      {target.recordValue !== null && (
        <div className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
          <Trophy size={10} className="text-amber-500 shrink-0" />
          PR : {target.recordValue} {target.metric.unit}
        </div>
      )}
    </div>

    {target.recordValue !== null && target.recordValue > 0 && (
      <div className="shrink-0 bg-slate-50 rounded-xl p-2 border border-slate-100">
        <ProgressRing target={target.targetValue} current={target.recordValue} size={60} />
      </div>
    )}
  </div>
))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showProposalForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">

            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <Sparkles className="text-indigo-500" size={24} />
                  Proposer un objectif
                </h3>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">
                  Cette proposition sera soumise à l'athlète pour validation
                </p>
              </div>
              <button
                onClick={handleCloseForm}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            {modalStep === 'template-select' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={16} className="text-indigo-500" />
                  <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">
                    Templates intelligents
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handlePickTemplate(t)}
                      className="text-left p-4 border border-slate-200 rounded-xl hover:bg-indigo-50/60 hover:border-indigo-300 transition-all text-xs group"
                    >
                      <div className="font-black text-slate-800 group-hover:text-indigo-600 transition-colors mb-0.5">
                        {t.name}
                      </div>
                      <div className="text-slate-400 font-medium leading-relaxed">
                        {t.description}
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handlePickFree}
                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-bold hover:border-indigo-400 hover:text-indigo-600 transition-all text-sm bg-slate-50/50"
                >
                  Créer un objectif libre personnalisé
                </button>
              </div>
            )}

            {modalStep === 'configure' && (
              <div className="space-y-5">

                <button
                  type="button"
                  onClick={handleBackToTemplates}
                  className="text-[11px] text-slate-500 font-bold hover:text-indigo-600 transition-colors flex items-center gap-1"
                >
                  ← Revenir aux templates
                </button>

  
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                    Intitulé de l'objectif *
                  </label>
                  <input
                    type="text"
                    value={proposalData.name}
                    onChange={(e) => setProposalData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: 500 km cumulés en juin, Battre son PR sur 20 min..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800 text-sm shadow-sm transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                    Description{" "}
                    <span className="text-slate-300 font-medium normal-case">(optionnel)</span>
                  </label>
                  <textarea
                    value={proposalData.description}
                    onChange={(e) => setProposalData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Contexte, conseils, stratégie recommandée..."
                    rows={2}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium text-slate-600 text-sm shadow-sm transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                      Date de début *
                    </label>
                    <input
                      type="date"
                      value={proposalData.startDate}
                      onChange={(e) => setProposalData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 text-sm shadow-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                      Date d'échéance *
                    </label>
                    <input
                      type="date"
                      value={proposalData.endDate}
                      onChange={(e) => setProposalData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 text-sm shadow-sm transition-all"
                    />
                  </div>
                </div>

                <div className="bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100 flex flex-col md:flex-row items-center gap-6">

                  <div className="flex-1 space-y-4 w-full">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                      Configuration de la cible
                    </span>

                    {!proposalData.templateId && (
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                          Indicateur de suivi *
                        </label>
                        <select
                          value={proposalData.metricId}
                          onChange={(e) => setProposalData(prev => ({ ...prev, metricId: e.target.value }))}
                          className="w-full px-4 py-3 border border-indigo-200/60 rounded-xl focus:outline-none focus:border-indigo-500 bg-white font-semibold text-slate-700 text-sm shadow-sm"
                        >
                          {metrics.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {proposalData.templateId && selectedMetric && (
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-800 bg-white px-4 py-3 rounded-xl border border-indigo-100 shadow-sm">
                        <History size={14} className="text-indigo-400 shrink-0" />
                        Indicateur : {selectedMetric.name}
                        <span className="text-indigo-400 font-medium">({selectedMetric.unit})</span>
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Valeur cible à atteindre *
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={proposalData.targetValue}
                          onChange={(e) =>
                            setProposalData(prev => ({
                              ...prev,
                              targetValue: e.target.value === "" ? "" : parseFloat(e.target.value),
                            }))
                          }
                          placeholder="Ex: 500"
                          className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-black text-indigo-600 focus:outline-none focus:border-indigo-500 bg-white shadow-sm"
                        />
                        {selectedMetric && (
                          <span className="text-xs font-black text-slate-400 uppercase bg-slate-100 border border-slate-200 px-3 py-2.5 rounded-xl shrink-0">
                            {selectedMetric.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 bg-white p-3 rounded-2xl border border-indigo-100 shadow-sm flex flex-col items-center justify-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Aperçu direct
                    </span>
                    <PrVsTargetRing
                      target={0}
                      targetValue={proposalData.targetValue}
                      size={110}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-600 font-black hover:bg-slate-200 transition-colors text-sm"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleProposeGoal}
                    className="flex-1 py-3.5 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm shadow-md flex justify-center items-center gap-2"
                  >
                    {submitting && <Loader2 size={16} className="animate-spin" />}
                    {submitting ? "Envoi en cours..." : "Envoyer la proposition"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}