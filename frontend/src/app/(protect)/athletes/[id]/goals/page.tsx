"use client";

import React from 'react';
import { Target, Plus } from 'lucide-react';

export default function AthleteGoalsPage() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Target className="text-indigo-600" size={20} />
          Objectifs de la saison
        </h2>
        <button className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-slate-200">
          <Plus size={14} /> Ajouter un objectif
        </button>
      </div>
      
      {/* Contenu ou liste des objectifs de votre athlète */}
      <p className="text-sm text-slate-500 italic">Aucun objectif défini pour le moment.</p>
    </div>
  );
}