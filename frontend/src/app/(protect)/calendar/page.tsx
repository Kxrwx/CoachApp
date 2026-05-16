"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Calendar,
  Clock,
  Repeat2,
} from "lucide-react";
import { api } from "@/lib/api";
import { RRulePresets, parseRRuleToDescription } from "@/lib/rrule-helpers";

interface PlannedEvent {
  id: string;
  title: string;
  startDate: string;
  startTime?: string;
  type: string;
  duration?: number;
  intensity?: string;
  description?: string;
  color: string;
  isRecurring: boolean;
  status: string;
}

interface Activity {
  id: string;
  title: string;
  startDate: string;
  type: string;
  distance?: number;
  duration?: number;
  isCompleted: boolean;
  color: string;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<PlannedEvent[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "training",
    duration: 60,
    intensity: "moderate",
    startTime: "18:00",
    isRecurring: false,
    recurrenceRule: "",
    color: "#6366f1",
  });

  // Charger les événements du calendrier
  useEffect(() => {
    loadCalendarEvents();
  }, []);

  const loadCalendarEvents = async () => {
    try {
      const response = await api("/planning/calendar");
      if (response.ok) {
        const data = await response.json();
        setEvents(data.plannedWorkouts || []);
        setActivities(data.activities || []);
      } else {
        console.error("Erreur lors de la récupération des données:", response.statusText);
      }
    } catch (error) {
      console.error("Erreur lors du chargement du calendrier:", error);
    }
  };

  // Générer les jours du calendrier
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysCount = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Jours du mois précédent
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }
    // Jours du mois courant
    for (let day = 1; day <= daysCount; day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true,
      });
    }
    // Jours du mois suivant
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentDate]);

  // Obtenir les événements pour un jour spécifique
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return [
      ...events.filter(
        (e) => e.startDate.split("T")[0] === dateStr
      ),
      ...activities.filter(
        (a) => a.startDate.split("T")[0] === dateStr
      ),
    ];
  };

  // Changer le mois
  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1
      )
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1
      )
    );
  };

  // Créer un événement
  const handleCreateEvent = async () => {
    if (!selectedDate || !formData.title) return;

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        duration: formData.duration,
        intensity: formData.intensity,
        startDate: selectedDate.toISOString(),
        startTime: formData.startTime,
        isRecurring: formData.isRecurring,
        recurrenceRule: formData.isRecurring
          ? formData.recurrenceRule
          : undefined,
        color: formData.color,
      };

      // Correction ici : Ajout de la méthode POST et du Body stringifié
      const response = await api("/planning/workouts", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setFormData({
          title: "",
          description: "",
          type: "training",
          duration: 60,
          intensity: "moderate",
          startTime: "18:00",
          isRecurring: false,
          recurrenceRule: "",
          color: "#6366f1",
        });
        setShowEventForm(false);
        setSelectedDate(null);
        loadCalendarEvents();
      } else {
        console.error("Erreur lors de la création de l'événement:", response.statusText);
      }
    } catch (error) {
      console.error("Erreur lors de la création de l'événement:", error);
    }
  };

  const monthName = currentDate.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-800">Calendrier</h1>
        <button
          onClick={() => {
            setSelectedDate(new Date());
            setShowEventForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors"
        >
          <Plus size={18} />
          Ajouter un entraînement
        </button>
      </div>

      {/* Main Calendar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <h2 className="text-xl font-black uppercase tracking-wide text-slate-800">
            {monthName}
          </h2>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-2 text-center font-bold text-slate-500 text-sm"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {daysInMonth.map((day, idx) => {
            const dayEvents = getEventsForDate(day.date);
            const isToday =
              new Date().toDateString() ===
              day.date.toDateString();
            const isSelected =
              selectedDate?.toDateString() ===
              day.date.toDateString();

            return (
              <div
                key={idx}
                onClick={() => {
                  setSelectedDate(day.date);
                  setShowEventForm(true);
                }}
                className={`min-h-32 p-2 rounded-lg border-2 transition-all cursor-pointer ${
                  isToday
                    ? "border-indigo-500 bg-indigo-50"
                    : isSelected
                    ? "border-indigo-400 bg-indigo-50"
                    : day.isCurrentMonth
                    ? "border-slate-200 bg-white hover:border-slate-300"
                    : "border-slate-100 bg-slate-50"
                }`}
              >
                <div
                  className={`text-xs font-bold mb-1 ${
                    day.isCurrentMonth
                      ? "text-slate-800"
                      : "text-slate-400"
                  }`}
                >
                  {day.date.getDate()}
                </div>

                {/* Events */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className="text-[10px] px-2 py-1 rounded text-white font-bold truncate"
                      style={{
                        backgroundColor: event.color,
                      }}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[9px] text-slate-500 px-2">
                      +{dayEvents.length - 2} autre
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Form Modal */}
      {showEventForm && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800">
                Ajouter un entraînement
              </h3>
              <button
                onClick={() => {
                  setShowEventForm(false);
                  setSelectedDate(null);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} className="text-slate-600" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Date Display */}
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                <Calendar size={16} />
                {selectedDate.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">
                  Titre
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      title: e.target.value,
                    })
                  }
                  placeholder="Ex: Entraînement gym"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Type */}
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="training">Entraînement</option>
                  <option value="strength">Force</option>
                  <option value="cardio">Cardio</option>
                  <option value="flexibility">Flexibilité</option>
                  <option value="recovery">Récupération</option>
                </select>
              </div>

              {/* Time */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-bold text-slate-700 block mb-1">
                    Heure
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        startTime: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-bold text-slate-700 block mb-1">
                    Durée (min)
                  </label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration: parseInt(
                          e.target.value
                        ),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Intensity */}
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">
                  Intensité
                </label>
                <select
                  value={formData.intensity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      intensity: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="low">Faible</option>
                  <option value="moderate">Modérée</option>
                  <option value="high">Élevée</option>
                </select>
              </div>

              {/* Recurring */}
              <div className="border-t border-slate-200 pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isRecurring: e.target.checked,
                        recurrenceRule: e.target.checked
                          ? "FREQ=WEEKLY;BYDAY=MO,WE,FR"
                          : "",
                      })
                    }
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span className="text-sm font-bold text-slate-700">
                    Répétition hebdomadaire
                  </span>
                </label>

                {formData.isRecurring && (
                  <div className="mt-3 space-y-3">
                    <select
                      value={formData.recurrenceRule}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          recurrenceRule:
                            e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 text-sm"
                    >
                      {RRulePresets.map(
                        (preset) => (
                          <option
                            key={preset.value}
                            value={preset.value}
                          >
                            {preset.label}
                          </option>
                        )
                      )}
                    </select>

                    {formData.recurrenceRule && (
                      <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                        {parseRRuleToDescription(
                          formData.recurrenceRule
                        )}
                      </div>
                    )}

                    <label className="text-xs text-slate-600">
                      Ou entrez une règle RRULE
                      personnalisée:
                    </label>
                    <input
                      type="text"
                      value={formData.recurrenceRule}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          recurrenceRule:
                            e.target.value,
                        })
                      }
                      placeholder="Ex: FREQ=WEEKLY;BYDAY=MO,WE,FR"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Color Picker */}
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-2">
                  Couleur
                </label>
                <div className="flex gap-2">
                  {[
                    "#6366f1",
                    "#ef4444",
                    "#f59e0b",
                    "#10b981",
                    "#3b82f6",
                    "#ec4899",
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          color,
                        })
                      }
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        formData.color === color
                          ? "border-slate-800"
                          : "border-slate-300"
                      }`}
                      style={{
                        backgroundColor: color,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowEventForm(false);
                  setSelectedDate(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-200 text-slate-800 font-bold hover:bg-slate-300 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCreateEvent}
                className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}