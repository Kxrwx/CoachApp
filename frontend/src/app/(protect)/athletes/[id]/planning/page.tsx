"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2,
  Clock, Plus, X, Loader2, Repeat, Trash2
} from "lucide-react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

// --- PRESETS POUR LA RÉCURRENCE (RRULE) ---
const RRulePresets = [
  { label: "Tous les lundis", value: "FREQ=WEEKLY;BYDAY=MO" },
  { label: "Tous les mardis", value: "FREQ=WEEKLY;BYDAY=TU" },
  { label: "Tous les mercredis", value: "FREQ=WEEKLY;BYDAY=WE" },
  { label: "Tous les jeudis", value: "FREQ=WEEKLY;BYDAY=TH" },
  { label: "Tous les vendredis", value: "FREQ=WEEKLY;BYDAY=FR" },
  { label: "Tous les samedis", value: "FREQ=WEEKLY;BYDAY=SA" },
  { label: "Tous les dimanches", value: "FREQ=WEEKLY;BYDAY=SU" },
  { label: "Tous les jours", value: "FREQ=DAILY" },
];

const parseRRuleToDescription = (rule: string) => {
  const preset = RRulePresets.find(p => p.value === rule);
  return preset ? preset.label : "Récurrence personnalisée";
};

export default function AthletePlanningPage() {
  const { id } = useParams();

  const [workouts, setWorkouts] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // --- ÉTATS POUR LA PROPOSITION ---
  const [isProposeModalOpen, setIsProposeModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [proposeForm, setProposeForm] = useState({
    title: "",
    scheduledDate: new Date().toISOString().split('T')[0],
    type: "training",
    startTime: "",
    duration: 0,
    description: "",
    isRecurring: false,
    recurrenceRule: "FREQ=WEEKLY;BYDAY=MO",
    color: "#6366f1",
  });

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const minDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 30);
    return d;
  }, [today]);

  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 30);
    return d;
  }, [today]);

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [planningRes, activitiesRes] = await Promise.all([
          api(`/coaching/athletes/${id}/planning`),
          api(`/coaching/athletes/${id}/activities`),
        ]);

        if (planningRes.ok) {
          const planning = await planningRes.json();
          const filteredPlanning = planning.filter((w: any) => {
            const date = new Date(w.startDate);
            return date >= minDate && date <= maxDate;
          });
          setWorkouts(filteredPlanning);
        }

        if (activitiesRes.ok) {
          const activitiesData = await activitiesRes.json();
          const filteredActivities = activitiesData.data.filter((a: any) => {
            const date = new Date(a.startDate);
            return date >= minDate && date <= today;
          });
          setActivities(filteredActivities);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, today, minDate, maxDate]);

  const weekDates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const changeWeek = (direction: number) => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + direction * 7);
    const weekEnd = new Date(next);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (weekEnd < minDate) return;
    if (next > maxDate) return;
    setCurrentWeekStart(next);
  };

  const isToday = (date: Date) => date.toDateString() === today.toDateString();
  const isWithinBounds = (date: Date) => date >= minDate && date <= maxDate;

  // --- SOUMISSION DE LA PROPOSITION ---
  const handleProposeSubmit = async () => {
    if (!proposeForm.title || !proposeForm.scheduledDate) return;
    
    setIsSubmitting(true);
    
    const payload = {
      title: proposeForm.title,
      scheduledDate: proposeForm.scheduledDate,
      activityType: proposeForm.type,
      startTime: proposeForm.startTime || null,
      duration: proposeForm.duration || null,
      description: proposeForm.description || null,
      isRecurring: proposeForm.isRecurring,
      rrule: proposeForm.isRecurring ? proposeForm.recurrenceRule : null,
      color: proposeForm.color,
    };

    try {
      const res = await api(`/coaching/athletes/${id}/training-proposal`, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" }
      });

      if (res.ok) {
        setIsProposeModalOpen(false);
        setProposeForm({
          title: "",
          scheduledDate: new Date().toISOString().split('T')[0],
          type: "training",
          startTime: "",
          duration: 0,
          description: "",
          isRecurring: false,
          recurrenceRule: RRulePresets[0].value,
          color: "#6366f1",
        });
      } else {
        console.error("Erreur lors de la proposition");
      }
    } catch (err) {
      console.error("Erreur réseau :", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="animate-pulse text-slate-500">Chargement du planning...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <CalendarIcon className="text-indigo-600" /> Planning & Activités
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsProposeModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Proposer une séance</span>
          </button>
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-slate-50 rounded-lg">
              <ChevronLeft size={18} />
            </button>
            <span className="px-4 text-sm font-bold text-slate-700">
              {weekDates[0].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              {" → "}
              {weekDates[6].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            </span>
            <button onClick={() => changeWeek(1)} className="p-2 hover:bg-slate-50 rounded-lg">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* LEGENDE */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500" /><span className="text-slate-600">Workout planifié</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-slate-600">Activité réalisée</span></div>
      </div>

      {/* CALENDAR */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
            <div key={day} className="p-4 text-center font-bold text-[10px] uppercase text-slate-400">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 min-h-[600px]">
          {weekDates.map((date) => {
            const dayWorkouts = workouts.filter((w) => new Date(w.startDate).toDateString() === date.toDateString());
            const dayActivities = activities.filter((a) => new Date(a.startDate).toDateString() === date.toDateString());

            return (
              <div key={date.toISOString()} className={`border-r border-slate-100 last:border-r-0 p-2 ${!isWithinBounds(date) ? "bg-slate-50/50" : ""}`}>
                <div className={`mb-3 text-center text-sm font-bold ${isToday(date) ? "text-indigo-600" : "text-slate-700"}`}>
                  {date.getDate()}
                </div>
                {dayActivities.map((activity) => (
                  <div key={activity.id} className="mb-2 p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="flex items-center gap-1 text-emerald-700 text-[10px] font-bold"><CheckCircle2 size={11} /> Activité</div>
                    <div className="mt-1 text-[10px] text-slate-600">{activity.distance ? `${activity.distance.toFixed(1)} km` : "-"}</div>
                  </div>
                ))}
                {dayWorkouts.map((workout) => (
                  <div key={workout.id} onClick={() => setSelectedWorkout(workout)} className="mb-2 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-indigo-300 transition-all border-l-4" style={{ borderLeftColor: workout.color || "#6366f1" }}>
                    <p className="text-[10px] font-bold text-slate-800 truncate">{workout.title}</p>
                    <div className="mt-1 flex items-center gap-2 text-[9px] text-slate-500">
                      {workout.duration && <><Clock size={9} /> {workout.duration} min</>}
                      {workout.isRecurring && <Repeat size={9} className="text-indigo-400" />}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= MODAL DE PROPOSITION (Basée sur ta référence) ================= */}
      {isProposeModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800">
                Proposer un entraînement
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsProposeModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg"
                >
                  <X size={20} className="text-slate-600" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              
              {/* Date */}
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Date</label>
                <input
                  type="date"
                  value={proposeForm.scheduledDate}
                  onChange={(e) => setProposeForm({ ...proposeForm, scheduledDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-600"
                />
              </div>

              {/* Titre */}
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Titre</label>
                <input
                  type="text"
                  value={proposeForm.title}
                  onChange={(e) => setProposeForm({ ...proposeForm, title: e.target.value })}
                  placeholder="Ex: Entraînement gym"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Type */}
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Type</label>
                <select
                  value={proposeForm.type}
                  onChange={(e) => setProposeForm({ ...proposeForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="training">Entraînement</option>
                  <option value="strength">Force</option>
                  <option value="cardio">Cardio</option>
                  <option value="flexibility">Flexibilité</option>
                  <option value="recovery">Récupération</option>
                </select>
              </div>

              {/* Heure & Durée */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-bold text-slate-700 block mb-1">Heure</label>
                  <input
                    type="time"
                    value={proposeForm.startTime}
                    onChange={(e) => setProposeForm({ ...proposeForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-bold text-slate-700 block mb-1">Durée (min)</label>
                  <input
                    type="number"
                    value={proposeForm.duration || ""}
                    onChange={(e) => setProposeForm({ ...proposeForm, duration: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Description / Instructions */}
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Corps de la séance (Optionnel)</label>
                <textarea
                  rows={3}
                  value={proposeForm.description}
                  onChange={(e) => setProposeForm({ ...proposeForm, description: e.target.value })}
                  placeholder="Détails de l'entraînement..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* SECTION ENTRAÎNEMENT RÉCURRENT */}
              <div className="border-t border-slate-200 pt-4 mt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={proposeForm.isRecurring}
                    onChange={(e) =>
                      setProposeForm({
                        ...proposeForm,
                        isRecurring: e.target.checked,
                        recurrenceRule: e.target.checked
                          ? (RRulePresets?.[0]?.value || "FREQ=WEEKLY;BYDAY=MO")
                          : "",
                      })
                    }
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-bold text-slate-700">
                    Entraînement récurrent
                  </span>
                </label>

                {proposeForm.isRecurring && (
                  <div className="mt-3 space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Fréquence</label>
                      <select
                        value={proposeForm.recurrenceRule}
                        onChange={(e) => setProposeForm({ ...proposeForm, recurrenceRule: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg focus:outline-none focus:border-indigo-500 text-sm"
                      >
                        {RRulePresets.map((preset) => (
                          <option key={preset.value} value={preset.value}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {proposeForm.recurrenceRule && parseRRuleToDescription && (
                      <div className="text-xs text-indigo-600 font-medium bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                        ➔ {parseRRuleToDescription(proposeForm.recurrenceRule)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* COULEUR */}
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-2">Couleur</label>
                <div className="flex gap-2">
                  {["#6366f1", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#ec4899"].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setProposeForm({ ...proposeForm, color })}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        proposeForm.color === color ? "border-slate-800" : "border-slate-300"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={() => setIsProposeModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-200 text-slate-800 font-bold hover:bg-slate-300 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleProposeSubmit}
                disabled={isSubmitting || !proposeForm.title}
                className="flex-1 flex justify-center items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Proposer"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}