"use client"
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Target, Clock, Plus, X, Activity, ChevronRight, Zap } from "lucide-react";

// --- Types ---
interface Metric {
  id: string;
  key: string;
  unit: string;
  aggregationType?: string;
  scope?: string;
}

interface GoalTarget {
  metricId: string;
  targetValue: number;
  metric?: Metric;
}

interface Goal {
  id: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string | null;
  targets: GoalTarget[];
}

export default function ObjectifsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [templates, setTemplates] = useState<Metric[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "GLOBAL",
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    metricId: "", 
    targetValue: 0,
  });

  // --- API Calls ---
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [goalsRes, templatesRes] = await Promise.all([
        axios.get("/api/me/objectif/get"),
        axios.get("/api/me/objectif/templates")
      ]);
      setGoals(goalsRes.data);
      setTemplates(templatesRes.data);
    } catch (err: any) {
      setError("Erreur lors de la récupération des données");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatKey = (key: string) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const applyTemplate = (tpl: Metric) => {
    setFormData({
      ...formData,
      name: formatKey(tpl.key),
      type: tpl.key.includes('power') ? 'POWER' : 'PERFORMANCE',
      metricId: tpl.id,
    });
  };

  const handleUpsert = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type || !formData.name || !formData.metricId) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        type: formData.type.toUpperCase(),
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        targets: [{ 
          metricId: formData.metricId, 
          targetValue: Number(formData.targetValue) 
        }],
      };

      await axios.post("/api/me/objectif/upsert", payload);
      await fetchData(); 
      setIsModalOpen(false);
      // Reset form
      setFormData({ 
        name: "", 
        type: "GLOBAL", 
        startDate: new Date().toISOString().split('T')[0], 
        endDate: "", 
        metricId: "", 
        targetValue: 0 
      });
    } catch (err: any) {
      alert(err.response?.data?.error || "Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight italic uppercase">Mes Objectifs</h2>
          <p className="text-gray-500 text-sm font-medium">Suivez vos records et vos volumes d'entraînement.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold"
        >
          <Plus size={20} />
          <span>Nouvel Objectif</span>
        </button>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">{error}</div>}

      {/* Grille d'objectifs */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
           {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((obj) => (
            <div key={obj.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-xl ${obj.type === 'POWER' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  {obj.type === 'POWER' ? <Zap size={22} /> : <Target size={22} />}
                </div>
                <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-gray-100 text-gray-500 uppercase tracking-widest">
                  {obj.type}
                </span>
              </div>
              
              <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-indigo-600 transition-colors">{obj.name}</h3>
              
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-4">
                <Clock size={14} />
                <span>Échéance : {obj.endDate ? new Date(obj.endDate).toLocaleDateString('fr-FR') : "Aucune"}</span>
              </div>

              <div className="space-y-2 mt-4">
                {obj.targets?.map((target, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="text-sm font-bold text-gray-600 uppercase tracking-tighter">
                        {target.metric?.key ? formatKey(target.metric.key) : "Métrique"}
                    </span>
                    <span className="font-black text-gray-900">
                      {target.targetValue} <small className="text-gray-400 font-medium">{target.metric?.unit}</small>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {goals.length === 0 && <p className="text-gray-400 col-span-full text-center py-10">Aucun objectif défini.</p>}
        </div>
      )}

      {/* Modale */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
            
            {/* Colonne Gauche : Templates */}
            <div className="w-full md:w-1/3 bg-gray-50 border-r border-gray-100 p-6 overflow-y-auto">
              <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-4">Templates Métriques</h3>
              <div className="space-y-2">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group ${formData.metricId === tpl.id ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-200 hover:border-indigo-400'}`}
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-800 group-hover:text-indigo-600">{formatKey(tpl.key)}</p>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">Unité : {tpl.unit}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Colonne Droite : Formulaire */}
            <div className="flex-1 p-8 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-900 italic uppercase">Configuration</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpsert} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Nom de l'objectif</label>
                  <input 
                    type="text" required
                    placeholder="Ex: Record 20min Mont Ventoux"
                    className="w-full bg-gray-50 border-0 ring-1 ring-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-800 transition-all"
                    value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Catégorie</label>
                    <select 
                      required
                      className="w-full bg-gray-50 border-0 ring-1 ring-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-800 transition-all"
                      value={formData.type} 
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                    >
                      <option value="GLOBAL">GLOBAL</option>
                      <option value="POWER">POWER</option>
                      <option value="PERFORMANCE">PERFORMANCE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Échéance</label>
                    <input 
                      type="date"
                      className="w-full bg-gray-50 border-0 ring-1 ring-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-800 transition-all"
                      value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity size={16} className="text-indigo-600" />
                    <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest">Valeur cible</h4>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-400 mb-1 tracking-tighter uppercase">Entrez le chiffre à atteindre</label>
                    <input 
                      type="number" required step="any"
                      placeholder="0.00"
                      className="w-full bg-white border-0 ring-1 ring-indigo-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none font-black text-3xl text-indigo-600"
                      value={formData.targetValue} onChange={(e) => setFormData({...formData, targetValue: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={!formData.metricId || isSubmitting}
                  className="w-full bg-gray-900 disabled:bg-gray-300 text-white rounded-2xl py-4 font-black hover:bg-black transition-all active:scale-[0.98] shadow-xl shadow-gray-200 uppercase tracking-widest mt-4"
                >
                  {isSubmitting ? "Chargement..." : formData.metricId ? "Enregistrer l'objectif" : "Sélectionnez un template"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}