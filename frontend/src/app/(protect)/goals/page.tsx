"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  X,
  Calendar as CalendarIcon,
  Trash2,
  Target,
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
  targets: [] as { metricId: string; targetValue: number }[],
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
      if (res.ok) {
        const result = await res.json();
        setTemplateContexts({ ...templateContexts, [templateId]: result.context });
        suggestedValue = result.suggestedValue;
      }

      // Initialise le template et injecte la target pré-calculée modifiable
      setFormData((fd) => ({
        ...fd,
        templateId,
        name: t.name,
        targets: [{ metricId: t.metricId, targetValue: suggestedValue }],
      }));
    } catch (err) {
      console.error("Erreur lors de l'évaluation du template:", err);
    }
  };

  const handleAddFreeTarget = () => {
    setFormData({
      ...formData,
      templateId: undefined,
      targets: [...formData.targets, { metricId: "", targetValue: 0 }],
    });
  };

  const handleTargetChange = (index: number, field: "metricId" | "targetValue", value: any) => {
    const updatedTargets = [...formData.targets];
    if (field === "targetValue") {
      updatedTargets[index].targetValue = value === "" ? 0 : parseFloat(value);
    } else {
      updatedTargets[index].metricId = value;
    }
    setFormData({ ...formData, targets: updatedTargets });
  };

  const handleRemoveTarget = (index: number) => {
    const updatedTargets = formData.targets.filter((_, i) => i !== index);
    setFormData({ ...formData, targets: updatedTargets });
  };

  const handleOpenEditModal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setTemplateContexts({});
    setFormData({
      name: goal.name,
      startDate: goal.startDate.split("T")[0],
      endDate: goal.endDate.split("T")[0],
      isActive: goal.isActive,
      templateId: undefined, // Traité comme une modification directe des cibles
      targets: goal.targets.map((t) => ({
        metricId: t.metricId,
        targetValue: t.targetValue,
      })),
    });
    setShowGoalForm(true);
  };

  const handleSaveGoal = async () => {
    if (!formData.name || !formData.startDate || !formData.endDate) {
      alert("Veuillez remplir tous les champs requis.");
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
      };

      if (formData.targets.length > 0) {
        const validTargets = formData.targets.filter((t) => t.metricId && t.targetValue > 0);
        if (validTargets.length === 0) {
          alert("Veuillez renseigner une valeur cible valide supérieure à 0.");
          setLoading(false);
          return;
        }
        payload.targets = validTargets;
        
        // Si on est en création avec un template actif, on transmet l'id
        if (formData.templateId && !editingGoalId) {
          payload.templateId = formData.templateId;
        }
      } else {
        alert("Veuillez sélectionner un template ou ajouter un indicateur personnalisé.");
        setLoading(false);
        return;
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
                  <div key={`${target.metricId}-${target.id ?? Math.random()}`} className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Target size={15} className="text-indigo-500" />
                        {target.metric?.name}
                      </span>
                      <span className="font-black text-slate-800">
                        {target.targetValue} <span className="text-xs text-slate-400 font-bold">{target.metric?.unit}</span>
                      </span>
                    </div>
                    {(target.progressPercent !== null || target.currentValue !== null) && (
                      <div className="text-xs text-slate-500 flex justify-between gap-4">
                        <span>Avancement : {target.progressPercent ?? 0}%</span>
                        <span>{target.currentValue ?? 0}/{target.targetValue} {target.metric?.unit}</span>
                      </div>
                    )}
                    {target.recordValue !== null && (
                      <div className="text-xs text-slate-400">Record perso : {target.recordValue} {target.metric?.unit}</div>
                    )}
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

      {/* Modal Form */}
      {showGoalForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800">{editingGoalId ? "Éditer l'objectif" : "Nouvel Objectif"}</h3>
              <div className="flex items-center gap-2">
                {editingGoalId && (
                  <button onClick={handleDeleteGoal} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"><Trash2 size={20} /></button>
                )}
                <button onClick={() => setShowGoalForm(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
              </div>
            </div>

            {/* Infos générales */}
            <div className="space-y-4 pb-4 border-b border-slate-100">
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Intitulé</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Mon défi mensuel de sorties"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1">Date de début</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1">Date d'échéance</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            {/* MODE 1: Sélection de Templates */}
            {!formData.templateId && formData.targets.length === 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-indigo-500" />
                  <h4 className="text-sm font-black text-slate-700">Templates Rapides</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handlePickTemplate(t.id)}
                      className="text-left px-3 py-2 border border-slate-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors text-xs"
                    >
                      <div className="font-bold text-slate-800 line-clamp-1">{t.name}</div>
                      <div className="text-slate-500 line-clamp-2 text-[11px]">{t.description}</div>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddFreeTarget}
                  className="w-full px-3 py-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-600 font-bold hover:border-slate-400 transition-colors text-sm"
                >
                  Ou créer un objectif personnalisé
                </button>
              </div>
            )}

            {/* MODE 2: Configuration du Template avec Saisie de la Valeur Cible */}
            {formData.templateId && formData.targets[0] && (
              <div className="space-y-4 bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-indigo-600 uppercase">Template sélectionné</span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{formData.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, templateId: undefined, targets: [] })}
                    className="text-xs px-2 py-1 bg-white text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold"
                  >
                    Changer
                  </button>
                </div>
                
                {templateContexts[formData.templateId] && (
                  <div className="text-xs text-indigo-700 bg-white p-2.5 rounded-lg shadow-sm">
                    💡 {templateContexts[formData.templateId]}
                  </div>
                )}

                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-indigo-100">
                  <span className="text-sm font-bold text-slate-700 flex-1">
                    Définissez votre valeur cible :
                  </span>
                  <input
                    type="number"
                    value={formData.targets[0].targetValue || ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                      const updatedTargets = [...formData.targets];
                      updatedTargets[0].targetValue = val;
                      setFormData({ ...formData, targets: updatedTargets });
                    }}
                    className="w-28 px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 text-center focus:outline-none focus:border-indigo-500"
                    placeholder="Valeur"
                  />
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                    {metrics.find(m => m.id === formData.targets[0].metricId)?.unit || "unités"}
                  </span>
                </div>
              </div>
            )}

            {/* MODE 3: Indicateurs Libres (sans Template) */}
            {formData.targets.length > 0 && !formData.templateId && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Target size={18} className="text-indigo-500" />
                    <h4 className="text-sm font-black text-slate-700">Indicateurs Personnalisés</h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddFreeTarget}
                    className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg font-bold hover:bg-indigo-100 transition-colors"
                  >
                    + Ajouter
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.targets.map((target, index) => (
                    <div key={index} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex gap-2 items-center">
                        <select
                          value={target.metricId}
                          onChange={(e) => handleTargetChange(index, "metricId", e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 bg-white rounded-lg text-sm"
                        >
                          <option value="">Métrique...</option>
                          {metrics.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.unit})
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          placeholder="Cible"
                          value={target.targetValue || ""}
                          onChange={(e) => handleTargetChange(index, "targetValue", e.target.value)}
                          className="w-24 px-3 py-2 border border-slate-300 bg-white rounded-lg text-sm font-bold"
                        />

                        {formData.targets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTarget(index)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, templateId: undefined, targets: [] })}
                  className="w-full text-xs px-3 py-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-600 font-bold hover:border-slate-400 transition-colors"
                >
                  ← Revenir aux templates
                </button>
              </div>
            )}

            {/* Actions de validation */}
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowGoalForm(false);
                  setFormData(DEFAULT_FORM_DATA);
                  setTemplateContexts({});
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors text-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSaveGoal}
                className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? "En cours..." : editingGoalId ? "Mettre à jour" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}