"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  X,
  Calendar as CalendarIcon,
  Trash2,
  Target,
  BarChart2,
  Sparkles,
} from "lucide-react";
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
  type: "custom",
  startDate: "",
  endDate: "",
  isActive: true,
  targets: [{ metricId: "", targetValue: "" as unknown as number }],
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateContexts, setTemplateContexts] = useState<{ [key: number]: string }>({});

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

  useEffect(() => {
    loadGoalsAndMetrics();
  }, []);

  const loadGoalsAndMetrics = async () => {
    try {
      const [goalsRes, metricsRes] = await Promise.all([
        api("/goals"),
        api("/metrics"),
      ]);
      if (goalsRes.ok) setGoals(await goalsRes.json());
      if (metricsRes.ok) setMetrics(await metricsRes.json());
    } catch (error) {
      console.error("Erreur de chargement des données:", error);
    }
  };

  const applyTemplate = async (index: number, type: "75_pr" | "100_pr" | "remaining_rides") => {
    const currentTarget = formData.targets[index];
    if (!currentTarget.metricId) {
      alert("Veuillez d'abord sélectionner une métrique.");
      return;
    }

    try {
      let payload = {};
      if (type === "75_pr") {
        payload = { templateType: "pr_percentage", metricId: currentTarget.metricId, percentage: 75 };
      } else if (type === "100_pr") {
        payload = { templateType: "pr_percentage", metricId: currentTarget.metricId, percentage: 100 };
      } else if (type === "remaining_rides") {
        const totalInput = window.prompt("Quel est votre objectif global de sorties sur l'année ?", "50");
        if (!totalInput) return;
        payload = { templateType: "yearly_remaining_rides", metricId: currentTarget.metricId, totalYearlyTarget: parseInt(totalInput, 10) };
      }

      const res = await api("/goals/templates/evaluate", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        const updatedTargets = [...formData.targets];
        updatedTargets[index].targetValue = result.suggestedValue;
        
        setFormData({ ...formData, targets: updatedTargets });
        setTemplateContexts({ ...templateContexts, [index]: result.context });
      } else {
        alert("Impossible de calculer le template. Vérifiez vos données historiques.");
      }
    } catch (err) {
      console.error("Erreur template:", err);
    }
  };

  const handleTargetChange = (index: number, field: "metricId" | "targetValue", value: string) => {
    const updatedTargets = [...formData.targets];
    if (field === "targetValue") {
      updatedTargets[index].targetValue = value === "" ? ("" as unknown as number) : parseFloat(value);
    } else {
      updatedTargets[index].metricId = value;
      const updatedContexts = { ...templateContexts };
      delete updatedContexts[index];
      setTemplateContexts(updatedContexts);
    }
    setFormData({ ...formData, targets: updatedTargets });
  };

  const handleOpenEditModal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setTemplateContexts({});
    setFormData({
      name: goal.name,
      type: goal.type,
      startDate: goal.startDate.split("T")[0],
      endDate: goal.endDate.split("T")[0],
      isActive: goal.isActive,
      targets: goal.targets.map((t) => ({
        metricId: t.metricId,
        targetValue: t.targetValue,
      })),
    });
    setShowGoalForm(true);
  };

  const handleSaveGoal = async () => {
    if (!formData.name || !formData.startDate || !formData.endDate) return;
    const cleanTargets = formData.targets.filter((t) => t.metricId && t.targetValue !== "" as unknown as number);

    if (cleanTargets.length === 0) {
      alert("Veuillez renseigner au moins une métrique cible valide.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = editingGoalId ? `/goals/${editingGoalId}` : "/goals";
      const method = editingGoalId ? "PUT" : "POST";

      const response = await api(endpoint, {
        method,
        body: JSON.stringify({ ...formData, targets: cleanTargets }),
      });

      if (response.ok) {
        setShowGoalForm(false);
        loadGoalsAndMetrics();
      }
    } catch (error) {
      console.error(error);
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

  return (
    <div className="space-y-6 p-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Vos Objectifs</h1>
        <button
          onClick={() => { setEditingGoalId(null); setFormData(DEFAULT_FORM_DATA); setTemplateContexts({}); setShowGoalForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-sm"
        >
          <Plus size={18} /> Définir un objectif
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((goal) => (
          <div
            key={goal.id}
            onClick={() => handleOpenEditModal(goal)}
            className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">{goal.name}</h2>
                  <span className="text-xs text-slate-500 font-semibold flex items-center gap-1 mt-1">
                    <CalendarIcon size={12} />
                    {new Date(goal.startDate).toLocaleDateString("fr-FR")} au {new Date(goal.endDate).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleActive(goal); }}
                  className={`text-[11px] font-black px-2.5 py-1 rounded-full transition-colors border ${
                    goal.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}
                >
                  {goal.isActive ? "Actif" : "En pause"}
                </button>
              </div>

              <div className="space-y-2 pt-2">
                {goal.targets.map((target) => (
                  <div key={target.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Target size={15} className="text-indigo-500" />
                      {target.metric?.name}
                    </span>
                    <span className="font-black text-slate-800">
                      {target.targetValue} <span className="text-xs text-slate-400 font-bold">{target.metric?.unit}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {goals.length === 0 && (
          <div className="col-span-full border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-bold">
            Aucun objectif en cours. Utilisez les templates intelligents pour commencer.
          </div>
        )}
      </div>

      {/* Modal & Dynamic Engine */}
      {showGoalForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800">{editingGoalId ? "Éditer l'objectif" : "Nouvel Objectif"}</h3>
              <div className="flex items-center gap-2">
                {editingGoalId && (
                  <button onClick={handleDeleteGoal} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"><Trash2 size={20} /></button>
                )}
                <button onClick={() => setShowGoalForm(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Intitulé</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Amélioration puissance max"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1">Date de début</label>
                  <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1">Date d'échéance</label>
                  <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none" />
                </div>
              </div>

              {/* Template Configuration Targets Line */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><BarChart2 size={16} /> Indicateurs clés</span>
                  <button type="button" onClick={() => setFormData({ ...formData, targets: [...formData.targets, { metricId: "", targetValue: "" as unknown as number }] })} className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg font-bold hover:bg-indigo-100 transition-colors">+ Ajouter un indicateur</button>
                </div>

                <div className="space-y-4">
                  {formData.targets.map((target, index) => (
                    <div key={index} className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
                      <div className="flex gap-2 items-center">
                        <select
                          value={target.metricId}
                          onChange={(e) => handleTargetChange(index, "metricId", e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 bg-white rounded-xl text-sm"
                        >
                          <option value="">Sélectionner une métrique</option>
                          {metrics.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                        </select>

                        <input
                          type="number"
                          placeholder="Cible"
                          value={target.targetValue === ("" as unknown as number) ? "" : target.targetValue}
                          onChange={(e) => handleTargetChange(index, "targetValue", e.target.value)}
                          className="w-28 px-3 py-2 border border-slate-300 bg-white rounded-xl text-sm font-bold"
                        />

                        {formData.targets.length > 1 && (
                          <button type="button" onClick={() => setFormData({ ...formData, targets: formData.targets.filter((_, i) => i !== index) })} className="text-slate-400 hover:text-red-500"><X size={18} /></button>
                        )}
                      </div>

                      {/* Wizard templates actions triggers */}
                      {target.metricId && (
                        <div className="flex flex-wrap gap-1.5 items-center pt-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide mr-1 flex items-center gap-1">
                            <Sparkles size={11} className="text-indigo-500" /> Auto-remplissage :
                          </span>
                          <button type="button" onClick={() => applyTemplate(index, "75_pr")} className="text-[11px] px-2 py-1 bg-white hover:bg-indigo-50 text-slate-700 font-bold rounded-lg border border-slate-200 transition-colors">📉 75% du PR</button>
                          <button type="button" onClick={() => applyTemplate(index, "100_pr")} className="text-[11px] px-2 py-1 bg-white hover:bg-indigo-50 text-slate-700 font-bold rounded-lg border border-slate-200 transition-colors">👑 Égaler PR</button>
                          <button type="button" onClick={() => applyTemplate(index, "remaining_rides")} className="text-[11px] px-2 py-1 bg-white hover:bg-indigo-50 text-slate-700 font-bold rounded-lg border border-slate-200 transition-colors">📅 Reste à faire</button>
                        </div>
                      )}

                      {templateContexts[index] && (
                        <div className="text-xs text-indigo-600 font-bold bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/60 transition-all animate-fade-in">
                          💡 {templateContexts[index]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setShowGoalForm(false)} className="flex-1 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors">Annuler</button>
              <button type="button" disabled={loading} onClick={handleSaveGoal} className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {loading ? "Calcul en cours..." : "Confirmer l'objectif"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}