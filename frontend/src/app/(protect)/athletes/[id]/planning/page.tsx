"use client";

import React from 'react';
import { Calendar as CalendarIcon, Plus, CheckCircle2, CircleDashed, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function AthletePlanningPage() {
  const { id } = useParams();

  // Structure fictive d'une semaine d'entraînement
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  
  const workouts = [
    { day: 0, title: "Récupération active", duration: "45 min", type: "Bike", status: "completed" },
    { day: 2, title: "Intervalles PMA (5x3')", duration: "1h 15", type: "Bike", status: "missed" },
    { day: 4, title: "Endurance fondamentale", duration: "2h 00", type: "Bike", status: "planned" },
    { day: 6, title: "Sortie Longue", duration: "4h 00", type: "Bike", status: "planned" },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="text-indigo-600" size={20} />
            Planning Hebdomadaire
          </h2>
          
          {/* Navigation Semaines */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            <button className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors"><ChevronLeft size={16}/></button>
            <span className="text-xs font-bold px-2 text-slate-700">Cette semaine</span>
            <button className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors"><ChevronRight size={16}/></button>
          </div>
        </div>

        <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-md shadow-indigo-200 shrink-0">
          <Plus size={16} /> Ajouter une séance
        </button>
      </div>

      {/* Calendrier (Vue Semaine) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
          {weekDays.map((day, idx) => (
            <div key={day} className={`p-3 text-center border-r last:border-r-0 border-slate-100 ${idx === 3 ? 'bg-indigo-50/30' : ''}`}>
              <span className={`text-[10px] font-black uppercase tracking-wider ${idx === 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
                {day}
              </span>
              <div className={`text-sm font-bold mt-0.5 ${idx === 3 ? 'text-indigo-900' : 'text-slate-700'}`}>
                {idx + 1} Juin
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 min-h-[400px]">
          {weekDays.map((_, dayIdx) => {
            const dayWorkouts = workouts.filter(w => w.day === dayIdx);
            
            return (
              <div key={dayIdx} className={`border-r last:border-r-0 border-slate-100 p-2 ${dayIdx === 3 ? 'bg-indigo-50/10' : ''}`}>
                {dayWorkouts.map((workout, wIdx) => (
                  <div 
                    key={wIdx} 
                    className={`p-3 rounded-xl border text-left mb-2 cursor-pointer hover:shadow-md transition-all group ${
                      workout.status === 'completed' ? 'bg-emerald-50 border-emerald-200' :
                      workout.status === 'missed' ? 'bg-rose-50 border-rose-200' :
                      'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      {workout.status === 'completed' && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
                      {workout.status === 'planned' && <CircleDashed size={16} className="text-slate-300 shrink-0" />}
                      {workout.status === 'missed' && <div className="h-4 w-4 rounded-full border-2 border-rose-400 shrink-0 flex items-center justify-center"><div className="h-1.5 w-1.5 bg-rose-400 rounded-full" /></div>}
                      
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-white/50 px-1.5 py-0.5 rounded">
                        <Clock size={10} /> {workout.duration}
                      </div>
                    </div>
                    
                    <h4 className={`text-xs font-bold leading-tight ${
                      workout.status === 'completed' ? 'text-emerald-900' :
                      workout.status === 'missed' ? 'text-rose-900' :
                      'text-slate-800'
                    }`}>
                      {workout.title}
                    </h4>
                  </div>
                ))}

                {/* Zone de drop vide / Ajouter rapide */}
                <div className="h-full min-h-[60px] rounded-xl border-2 border-dashed border-transparent hover:border-slate-200 flex items-center justify-center opacity-0 hover:opacity-100 transition-all cursor-pointer">
                  <Plus size={16} className="text-slate-300" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
    </div>
  );
}