"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Calendar as CalendarIcon,
  Trash2,
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

const DEFAULT_FORM_DATA = {
  title: "",
  description: "",
  type: "training",
  duration: 60,
  intensity: "moderate",
  startTime: "18:00",
  isRecurring: false,
  recurrenceRule: "",
  color: "#6366f1",
};

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<PlannedEvent[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  
  // Modal states
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null); // Null = Création, String = Modification
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

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
      }
    } catch (error) {
      console.error("Erreur lors du chargement du calendrier:", error);
    }
  };

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysCount = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
    }
    for (let day = 1; day <= daysCount; day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({ date: new Date(year, month + 1, day), isCurrentMonth: false });
    }
    return days;
  }, [currentDate]);

  // Fusionner et différencier activités et entraînements
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    
    const dayPlanned = events
      .filter((e) => e.startDate.split("T")[0] === dateStr)
      .map((e) => ({ ...e, _itemType: "planned" as const }));
      
    const dayActivities = activities
      .filter((a) => a.startDate.split("T")[0] === dateStr)
      .map((a) => ({ ...a, _itemType: "activity" as const }));
      
    return [...dayPlanned, ...dayActivities];
  };

  // ----- ACTIONS SUR LE CALENDRIER -----

  const handleDayClick = (date: Date) => {
    // Bloquer la création dans le passé
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      alert("Impossible de planifier un entraînement dans le passé.");
      return;
    }

    setSelectedDate(date);
    setEditingEventId(null); // Mode Création
    setFormData(DEFAULT_FORM_DATA);
    setShowEventForm(true);
  };

  const handleItemClick = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();

    if (item._itemType === "activity") {
      router.push(`/activities/${item.id}`);
    } else {
      setEditingEventId(item.id);
      setSelectedDate(new Date(item.startDate));
      setFormData({
        title: item.title,
        description: item.description || "",
        type: item.type || "training",
        duration: item.duration || 60,
        intensity: item.intensity || "moderate",
        startTime: item.startTime || "18:00",
        isRecurring: item.isRecurring || false, 
        recurrenceRule: item.recurrenceRule || "", 
        color: item.color || "#6366f1",
      });
      setShowEventForm(true);
    }
  };

  // ----- DRAG AND DROP -----

  const handleDragStart = (e: React.DragEvent, item: any) => {
    if (item._itemType !== "planned") {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("eventId", item.id);
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("eventId");
    if (!eventId) return;

    // Empêcher de glisser vers le passé
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (targetDate < today) {
      alert("Impossible de déplacer un entraînement vers le passé.");
      return;
    }

    try {
      const response = await api(`/planning/workouts/${eventId}`, {
        method: "PUT",
        body: JSON.stringify({ startDate: targetDate.toISOString() }),
      });
      
      if (response.ok) {
        loadCalendarEvents();
      }
    } catch (error) {
      console.error("Erreur lors du déplacement", error);
    }
  };

  // ----- ACTIONS MODAL (API) -----

  const handleSaveEvent = async () => {
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
        recurrenceRule: formData.isRecurring ? formData.recurrenceRule : undefined,
        color: formData.color,
      };

      const endpoint = editingEventId 
        ? `/planning/workouts/${editingEventId}` 
        : "/planning/workouts";
        
      const method = editingEventId ? "PUT" : "POST";

      const response = await api(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowEventForm(false);
        setEditingEventId(null);
        setSelectedDate(null);
        loadCalendarEvents();
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEventId) return;
    
    // NETTOYAGE SÉCURISÉ RECONNAISSANT L'UUID V4 COMPLET
    let realIdInDatabase = editingEventId;

    if (editingEventId.includes('_')) {
      realIdInDatabase = editingEventId.split('_')[0];
    } else if (editingEventId.includes('-recurring')) {
      realIdInDatabase = editingEventId.split('-recurring')[0];
    } else {
      const uuidMatch = editingEventId.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      if (uuidMatch) {
        realIdInDatabase = uuidMatch[0];
      }
    }

    const confirmMessage = formData.isRecurring
      ? "Cet entraînement est récurrent. Voulez-vous supprimer TOUTE la série ?"
      : "Voulez-vous vraiment supprimer cet entraînement ?";

    if (window.confirm(confirmMessage)) {
      try {
        const response = await api(`/planning/workouts/${realIdInDatabase}`, {
          method: "DELETE",
        });
        
        if (response.ok) {
          setShowEventForm(false);
          setEditingEventId(null);
          setSelectedDate(null);
          loadCalendarEvents(); 
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Erreur renvoyée par le serveur :", errorData);
          alert(`Erreur : ${errorData.message || "Impossible de supprimer l'entraînement."}`);
        }
      } catch (error) {
        console.error("Erreur réseau lors de la suppression:", error);
      }
    }
  };

  const monthName = currentDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-800">Calendrier</h1>
        <button
          onClick={() => handleDayClick(new Date())}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors"
        >
          <Plus size={18} />
          Ajouter un entraînement
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <h2 className="text-xl font-black uppercase tracking-wide text-slate-800">
            {monthName}
          </h2>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronRight size={20} className="text-slate-600" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="p-2 text-center font-bold text-slate-500 text-sm">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {daysInMonth.map((day, idx) => {
            const dayItems = getEventsForDate(day.date);
            const isToday = new Date().toDateString() === day.date.toDateString();
            const isSelected = selectedDate?.toDateString() === day.date.toDateString();

            return (
              <div
                key={idx}
                onClick={() => handleDayClick(day.date)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, day.date)}
                className={`min-h-32 p-2 rounded-lg border-2 transition-all cursor-pointer ${
                  isToday ? "border-indigo-500 bg-indigo-50" :
                  isSelected ? "border-indigo-400 bg-indigo-50" :
                  day.isCurrentMonth ? "border-slate-200 bg-white hover:border-slate-300" :
                  "border-slate-100 bg-slate-50"
                }`}
              >
                <div className={`text-xs font-bold mb-1 ${day.isCurrentMonth ? "text-slate-800" : "text-slate-400"}`}>
                  {day.date.getDate()}
                </div>

                <div className="space-y-1">
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={(e) => handleItemClick(e, item)}
                      draggable={item._itemType === "planned"}
                      onDragStart={(e) => handleDragStart(e, item)}
                      className={`text-[10px] px-2 py-1 rounded text-white font-bold truncate ${
                        item._itemType === "planned" ? "cursor-grab active:cursor-grabbing hover:opacity-90" : "cursor-pointer hover:opacity-90"
                      }`}
                      style={{ backgroundColor: item.color }}
                      title={item.title}
                    >
                      {item._itemType === "activity" ? "✓ " : ""}{item.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showEventForm && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800">
                {editingEventId ? "Modifier l'entraînement" : "Ajouter un entraînement"}
              </h3>
              <div className="flex items-center gap-2">
                {editingEventId && (
                  <button onClick={handleDeleteEvent} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Supprimer">
                    <Trash2 size={20} />
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowEventForm(false);
                    setSelectedDate(null);
                    setEditingEventId(null);
                  }}
                  className="p-1 hover:bg-slate-100 rounded-lg"
                >
                  <X size={20} className="text-slate-600" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                <CalendarIcon size={16} />
                {selectedDate.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Titre</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Entraînement gym"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="training">Entraînement</option>
                  <option value="strength">Force</option>
                  <option value="cardio">Cardio</option>
                  <option value="flexibility">Flexibilité</option>
                  <option value="recovery">Récupération</option>
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-bold text-slate-700 block mb-1">Heure</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-bold text-slate-700 block mb-1">Durée (min)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* SECTION ENTRAÎNEMENT RÉCURRENT */}
              <div className="border-t border-slate-200 pt-4 mt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
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

                {formData.isRecurring && (
                  <div className="mt-3 space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Fréquence</label>
                      <select
                        value={formData.recurrenceRule}
                        onChange={(e) => setFormData({ ...formData, recurrenceRule: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg focus:outline-none focus:border-indigo-500 text-sm"
                      >
                        {RRulePresets?.map((preset) => (
                          <option key={preset.value} value={preset.value}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {formData.recurrenceRule && parseRRuleToDescription && (
                      <div className="text-xs text-indigo-600 font-medium bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                        ➔ {parseRRuleToDescription(formData.recurrenceRule)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 block mb-2">Couleur</label>
                <div className="flex gap-2">
                  {["#6366f1", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#ec4899"].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        formData.color === color ? "border-slate-800" : "border-slate-300"
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
                onClick={() => {
                  setShowEventForm(false);
                  setSelectedDate(null);
                  setEditingEventId(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-200 text-slate-800 font-bold hover:bg-slate-300 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveEvent}
                className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors"
              >
                {editingEventId ? "Enregistrer" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}