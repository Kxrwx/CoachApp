"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  X,
  Calendar as CalendarIcon,
  Trash2,
  Sparkles,
  Trophy,
  History,
} from "lucide-react";
import { 
  RadialBarChart, 
  RadialBar, 
  ResponsiveContainer, 
  PolarAngleAxis 
} from "recharts";
import { api } from "@/lib/api";

interface Metric {
  id: string;
  key: string;
  name: string;
  unit: string;
}

interface GoalTarget {
  id?: string;
  metricId: string;
  targetValue: number;
  metric?: Metric;
  currentValue?: number | null;
  progressPercent?: number | null;
  recordValue?: number | null;
}

interface Goal {
  id: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  targets: GoalTarget[];
}

const DEFAULT_FORM_DATA = {
  name: "",
  startDate: "",
  endDate: "",
  isActive: true,
  templateId: undefined as string | undefined,
  metricId: "",
  targetValue: 0,
  recordValue: null as number | null,
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateContexts, setTemplateContexts] = useState<{ [key: string]: string }>({});
  const [templates, setTemplates] = useState<any[]>([]);

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

  useEffect(() => {
    loadGoalsAndMetrics();
  }, []);

  const loadGoalsAndMetrics = async () => {
    try {
      const [goalsRes, metricsRes, templatesRes] = await Promise.all([
        api("/goals"),
        api("/metrics"),
        api("/goals/templates"),
      ]);
      if (goalsRes.ok) setGoals(await goalsRes.json());
      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (templatesRes.ok) setTemplates(await templatesRes.json());
    } catch (error) {
      console.error("Erreur de chargement des données:", error);
    }
  };

  const handlePickTemplate = async (templateId: string) => {
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;

    try {
      const res = await api("/goals/templates/evaluate", {
        method: "POST",
        body: JSON.stringify({ templateId, metricId: t.metricId }),
      });

      let suggestedValue = 0;
      let contextStr = "";
      let estimatedPR = null;

      if (res.ok) {
        const result = await res.json();
        contextStr = result.context;
        setTemplateContexts({ ...templateContexts, [templateId]: contextStr });
        suggestedValue = result.suggestedValue;
        
        const prMatch = contextStr.match(/record absolu.*?(\d+)/i);
        if (prMatch) estimatedPR = parseInt(prMatch[1], 10);
      }

      setFormData({
        ...DEFAULT_FORM_DATA,
        templateId,
        name: t.name,
        metricId: t.metricId,
        targetValue: suggestedValue,
        recordValue: estimatedPR,
      });
    } catch (err) {
      console.error("Erreur lors de l'évaluation du template:", err);
    }
  };

  const handleOpenEditModal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setTemplateContexts({});
    
    const primaryTarget = goal.targets[0] || { metricId: "", targetValue: 0, recordValue: null };
    
    setFormData({
      name: goal.name,
      startDate: goal.startDate.split("T")[0],
      endDate: goal.endDate.split("T")[0],
      isActive: goal.isActive,
      templateId: undefined,
      metricId: primaryTarget.metricId,
      targetValue: primaryTarget.targetValue,
      recordValue: primaryTarget.recordValue || null,
    });
    setShowGoalForm(true);
  };

  const handleSaveGoal = async () => {
    const finalMetricId = formData.metricId || (metrics.length > 0 ? metrics[0].id : "");

    if (!formData.name || !formData.startDate || !formData.endDate || !finalMetricId || formData.targetValue <= 0) {
      alert("Veuillez remplir tous les champs requis avec une cible valide.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = editingGoalId ? `/goals/${editingGoalId}` : "/goals";
      const method = editingGoalId ? "PUT" : "POST";

      const payload: any = {
        name: formData.name,
        startDate: formData.startDate,
        endDate: formData.endDate,
        isActive: formData.isActive,
        targets: [{
          metricId: finalMetricId,
          targetValue: formData.targetValue
        }]
      };

      if (formData.templateId && !editingGoalId) {
        payload.templateId = formData.templateId;
      }

      const response = await api(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowGoalForm(false);
        loadGoalsAndMetrics();
      } else {
        alert("Erreur lors de la sauvegarde.");
      }
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (goal: Goal) => {
    try {
      const response = await api(`/goals/${goal.id}/toggle`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !goal.isActive }),
      });
      if (response.ok) loadGoalsAndMetrics();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteGoal = async () => {
    if (!editingGoalId) return;
    if (window.confirm("Supprimer définitivement cet objectif ?")) {
      try {
        const response = await api(`/goals/${editingGoalId}`, { method: "DELETE" });
        if (response.ok) {
          setShowGoalForm(false);
          loadGoalsAndMetrics();
        }
      } catch (error) {
        console.error(error);
      }
    }
  };

  // --- GRAPHIQUE INVERSÉ : PR vs CIBLE ---
  // La cible (target) est le 100%, le PR est la valeur remplie
  const PrVsTargetRing = ({ target, pr, size = 120 }: { target: number, pr: number | null, size?: number }) => {
    const validPr = pr && pr > 0 ? pr : 0;
    const percentage = target > 0 ? Math.round((validPr / target) * 100) : 0;
    
    // Si le PR dépasse la cible (objectif déjà explosé dans le passé), on met en vert
    const chartColor = percentage >= 100 ? "#10b981" : "#4f46e5";
    const chartData = [{ value: Math.min(percentage, 100), fill: chartColor }];

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

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Vos Objectifs</h1>
        <button
          onClick={() => { setEditingGoalId(null); setFormData(DEFAULT_FORM_DATA); setTemplateContexts({}); setShowGoalForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-sm text-sm"
        >
          <Plus size={18} /> Définir un objectif
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {goals.map((goal) => {
          const target = goal.targets[0]; 
          const targetVal = target?.targetValue ?? 0;
          const prVal = target?.recordValue ?? null;
          const unit = target?.metric?.unit ?? "";

          return (
            <div
              key={goal.id}
              onClick={() => handleOpenEditModal(goal)}
              className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 md:p-6 hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between gap-4 group"
            >
              {/* Infos Gauche */}
              <div className="space-y-3 flex-1">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">
                      {goal.name}
                    </h2>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleActive(goal); }}
                      className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        goal.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {goal.isActive ? "Actif" : "En pause"}
                    </button>
                  </div>
                  <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                    <CalendarIcon size={12} />
                    Jusqu'au {new Date(goal.endDate).toLocaleDateString("fr-FR")}
                  </span>
                </div>

                {/* Cible brute */}
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                    Cible Fixée
                  </span>
                  <p className="text-slate-800 font-black text-lg">
                    {targetVal} <span className="text-slate-400 font-bold text-xs uppercase">{unit}</span>
                  </p>
                </div>

                {/* Badge Record PR */}
                {prVal !== null && (
                  <div className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    <Trophy size={11} /> PR Actuel : {prVal} {unit}
                  </div>
                )}
              </div>

              {/* Graphique Droite: PR vs Cible */}
              <div className="shrink-0">
                <PrVsTargetRing target={targetVal} pr={prVal} size={110} />
              </div>
            </div>
          );
        })}

        {goals.length === 0 && (
          <div className="col-span-full border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-bold">
            Aucun objectif en cours. Utilisez les templates intelligents pour commencer.
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showGoalForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                {editingGoalId ? "Éditer l'objectif" : "Nouvel Objectif"}
              </h3>
              <div className="flex items-center gap-2">
                {editingGoalId && (
                  <button onClick={handleDeleteGoal} className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors">
                    <Trash2 size={20} />
                  </button>
                )}
                <button onClick={() => setShowGoalForm(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* General Infos */}
            <div className="space-y-4 pb-4 border-b border-slate-100">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Intitulé de l'objectif</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Record de kilomètres mensuel"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Date de début</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700 text-sm shadow-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Date d'échéance</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-slate-700 text-sm shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* MODE 1: Templates Selection */}
            {!formData.templateId && !formData.metricId && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-indigo-500" />
                  <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">Templates Data Intelligents</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handlePickTemplate(t.id)}
                      className="text-left p-4 border border-slate-200 rounded-xl hover:bg-indigo-50/60 hover:border-indigo-300 transition-all text-xs group"
                    >
                      <div className="font-black text-slate-800 group-hover:text-indigo-600 transition-colors mb-0.5">{t.name}</div>
                      <div className="text-slate-400 font-medium leading-relaxed">{t.description}</div>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, metricId: metrics[0]?.id || "manual" })}
                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-bold hover:border-indigo-500 hover:text-indigo-600 transition-all text-sm bg-slate-50/50"
                >
                  Créer un objectif libre personnalisé
                </button>
              </div>
            )}

            {/* MODE 2 : Configuration Cible unique avec PR en vue Graphique en direct */}
            {(formData.templateId || formData.metricId) && (
              <div className="space-y-4 bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100 flex flex-col md:flex-row items-center gap-6">
                
                <div className="flex-1 space-y-4 w-full">
                  <div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Configuration de la cible</span>
                    {formData.templateId && <p className="text-sm font-black text-slate-800 mt-0.5">{formData.name}</p>}
                  </div>

                  {formData.templateId && templateContexts[formData.templateId] && (
                    <div className="text-[11px] font-bold text-indigo-900 bg-white p-3 rounded-xl border border-indigo-100/60 shadow-sm flex items-start gap-2 leading-relaxed">
                      <History size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                      <div>{templateContexts[formData.templateId]}</div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Saisie de la valeur cible (Sélecteur d'indicateur retiré) */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Valeur cible à atteindre</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={formData.targetValue || ""}
                          onChange={(e) => setFormData({ ...formData, targetValue: e.target.value === "" ? 0 : parseFloat(e.target.value) })}
                          className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-black text-indigo-600 focus:outline-none focus:border-indigo-500 bg-white shadow-sm"
                          placeholder="Ex: 500"
                        />
                        <span className="text-xs font-black text-slate-400 uppercase bg-slate-100 border border-slate-200 px-3 py-2.5 rounded-xl shrink-0">
                          {metrics.find(m => m.id === formData.metricId)?.unit || "unités"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!editingGoalId && (
                    <button
                      type="button"
                      onClick={() => setFormData(DEFAULT_FORM_DATA)}
                      className="text-[11px] text-slate-500 font-bold underline hover:text-indigo-600 transition-colors block"
                    >
                      ← Revenir à la sélection initiale
                    </button>
                  )}
                </div>

                {/* Graphique de prévisualisation en direct dans la modale */}
                <div className="shrink-0 bg-white p-3 rounded-2xl border border-indigo-100 shadow-sm flex flex-col items-center justify-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Aperçu direct</span>
                  <PrVsTargetRing target={formData.targetValue} pr={formData.recordValue} size={110} />
                </div>
              </div>
            )}

            {/* Validation Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowGoalForm(false);
                  setFormData(DEFAULT_FORM_DATA);
                  setTemplateContexts({});
                }}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors text-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSaveGoal}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm shadow-sm"
              >
                {loading ? "En cours..." : editingGoalId ? "Mettre à jour" : "Créer l'objectif"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}