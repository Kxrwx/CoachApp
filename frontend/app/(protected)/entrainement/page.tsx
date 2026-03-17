"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { 
  Plus, Bike, Dumbbell, GripVertical, X, Trash2, Save, Timer, Activity, Map
} from "lucide-react";
import { 
  format, addDays, subDays, eachDayOfInterval, isSameDay, isToday, parseISO 
} from "date-fns";
import { fr } from "date-fns/locale";
import { RRule } from "rrule";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export default function PlanningPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [plannedWorkouts, setPlannedWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    type: "Ride",
    startDate: format(new Date(), "yyyy-MM-dd"),
    isRecurring: false,
    rrule: "",
    description: "",
    duration: 60,
    distance: 0,
    intensity: "Moderate"
  });

  // On étend la plage pour plus de visibilité
  const startDate = subDays(new Date(), 10);
  const endDate = addDays(new Date(), 21);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const fetchData = useCallback(async () => {
    try {
      const [resStrava, resPlanned] = await Promise.all([
        axios.get("/api/me/strava/get/allActivities"),
        axios.get("/api/me/training/getAll")
      ]);
      setActivities(Array.isArray(resStrava.data) ? resStrava.data : []);
      setPlannedWorkouts(Array.isArray(resPlanned.data) ? resPlanned.data : []);
    } catch (err) {
      console.error("Erreur fetch:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreateModal = () => {
    setSelectedWorkout(null);
    setFormData({
      title: "",
      type: "Ride",
      startDate: format(new Date(), "yyyy-MM-dd"),
      isRecurring: false,
      rrule: "",
      description: "",
      duration: 60,
      distance: 0,
      intensity: "Moderate"
    });
    setIsModalOpen(true);
  };

  const openEditModal = (workout: any) => {
    setSelectedWorkout(workout);
    setFormData({
      title: workout.title,
      type: workout.type,
      startDate: format(parseISO(workout.startDate), "yyyy-MM-dd"),
      isRecurring: workout.isRecurring,
      rrule: workout.rrule || "",
      description: workout.description || "",
      duration: workout.duration || 60,
      distance: workout.distance || 0,
      intensity: workout.intensity || "Moderate"
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await axios.post("/api/me/training/upsert", {
        ...formData,
        id: selectedWorkout?.id || null, 
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedWorkout) return;
    if (!confirm("Supprimer définitivement cette séance ?")) return;
    
    setIsSaving(true);
    try {
      await axios.delete(`/api/me/training/delete/${selectedWorkout.id}`);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert("Erreur lors de la suppression");
    } finally {
      setIsSaving(false);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;

    // Optimistic UI : Mise à jour immédiate côté client
    const updatedWorkouts = plannedWorkouts.map(pw => 
      pw.id === draggableId ? { ...pw, startDate: destination.droppableId } : pw
    );
    setPlannedWorkouts(updatedWorkouts);

    const workout = updatedWorkouts.find(p => p.id === draggableId);
    try {
      await axios.post("/api/me/training/upsert", { ...workout });
    } catch (err) { 
      fetchData(); // Rollback en cas d'erreur
    }
  };

  const getWorkoutsForDay = (day: Date) => {
    return plannedWorkouts.filter(pw => isSameDay(parseISO(pw.startDate), day));
  };

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case "High": return "border-l-red-500";
      case "Moderate": return "border-l-orange-500";
      case "Low": return "border-l-emerald-500";
      default: return "border-l-zinc-500";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-orange-600">Performance Planning</h1>
            <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mt-1">Gérez votre cycle d'entraînement</p>
          </div>
          <button onClick={openCreateModal} className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all active:scale-95">
            <Plus size={16} /> Ajouter une séance
          </button>
        </header>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {days.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayActivities = activities.filter(a => isSameDay(parseISO(a.startDate), day));
              const dayPlanned = getWorkoutsForDay(day);

              return (
                <Droppable droppableId={dateKey} key={dateKey}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className={`min-h-[220px] rounded-[1.8rem] p-4 border transition-all ${isToday(day) ? 'bg-zinc-900 border-orange-600/50 shadow-[0_0_20px_rgba(234,88,12,0.1)]' : 'bg-zinc-900/30 border-zinc-800'}`}>
                      <p className={`text-[10px] font-black uppercase mb-4 ${isToday(day) ? 'text-orange-500' : 'text-zinc-500'}`}>
                        {format(day, "EEE d MMM", { locale: fr })}
                      </p>
                      
                      <div className="space-y-2">
                        {/* Activités réelles (Strava) */}
                        {dayActivities.map(act => (
                          <div key={act.id} className="bg-white text-black p-2 rounded-xl flex items-center gap-2 text-[9px] font-black uppercase shadow-lg">
                            <Bike size={12} className="text-orange-600" /> {act.name}
                          </div>
                        ))}

                        {/* Séances planifiées */}
                        {dayPlanned.map((plan, index) => (
                          <Draggable key={plan.id} draggableId={plan.id} index={index}>
                            {(draggable) => (
                              <div ref={draggable.innerRef} {...draggable.draggableProps} {...draggable.dragHandleProps}
                                onClick={() => openEditModal(plan)}
                                className={`p-3 rounded-xl bg-zinc-800 border-l-4 ${getIntensityColor(plan.intensity)} border-y-zinc-700 border-r-zinc-700 hover:border-orange-500/50 cursor-pointer transition-all group`}>
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[10px] font-black uppercase truncate pr-2">{plan.title}</span>
                                    <GripVertical size={12} className="text-zinc-600 group-hover:text-zinc-400" />
                                </div>
                                <div className="flex gap-2 text-[8px] text-zinc-500 font-bold uppercase">
                                    <span className="flex items-center gap-0.5"><Timer size={10}/> {plan.duration}m</span>
                                    {plan.distance > 0 && <span className="flex items-center gap-0.5"><Map size={10}/> {plan.distance}km</span>}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </div>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>

        {/* MODALE COMPLETE */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-zinc-950 border border-zinc-800 w-full max-w-xl rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">
                  {selectedWorkout ? "Éditer la séance" : "Planification"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="bg-zinc-800 p-2 rounded-full text-zinc-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 mb-2 block tracking-widest text-center">Titre</label>
                  <input type="text" required placeholder="Ex: Sortie Seuil 3x10min" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:border-orange-600 outline-none transition-all"
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                    <label className="text-[9px] font-black uppercase text-zinc-500 mb-2 block">Type</label>
                    <select className="w-full bg-transparent text-sm font-bold outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                      <option value="Ride">Ride</option>
                      <option value="Run">Run</option>
                      <option value="Gym">Gym</option>
                    </select>
                  </div>
                  <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                    <label className="text-[9px] font-black uppercase text-zinc-500 mb-2 block">Intensité</label>
                    <select className="w-full bg-transparent text-sm font-bold outline-none" value={formData.intensity} onChange={e => setFormData({...formData, intensity: e.target.value})}>
                      <option value="Low">Basse</option>
                      <option value="Moderate">Modérée</option>
                      <option value="High">Haute</option>
                    </select>
                  </div>
                  <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                    <label className="text-[9px] font-black uppercase text-zinc-500 mb-2 block">Date</label>
                    <input type="date" className="w-full bg-transparent text-xs font-bold outline-none" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                    <label className="text-[9px] font-black uppercase text-zinc-500 mb-2 block flex items-center gap-1"><Timer size={10}/> Durée (min)</label>
                    <input type="number" className="w-full bg-transparent text-sm font-bold outline-none" value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                    <label className="text-[9px] font-black uppercase text-zinc-500 mb-2 block flex items-center gap-1"><Map size={10}/> Distance (km)</label>
                    <input type="number" className="w-full bg-transparent text-sm font-bold outline-none" value={formData.distance} onChange={e => setFormData({...formData, distance: parseInt(e.target.value) || 0})} />
                  </div>
                </div>

                <div>
                   <label className="text-[10px] font-black uppercase text-zinc-500 mb-2 block">Description / Notes</label>
                   <textarea className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-xs focus:border-orange-600 outline-none h-24 resize-none"
                    placeholder="Détails de la séance..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                {/* SECTION RÉCURRENCE */}
<div className="space-y-3 pt-2">
  <div className="flex items-center gap-3 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
    <input 
      type="checkbox" 
      id="recurring" 
      className="w-5 h-5 accent-orange-600 cursor-pointer"
      checked={formData.isRecurring} 
      onChange={e => setFormData({...formData, isRecurring: e.target.checked})} 
    />
    <label htmlFor="recurring" className="text-[10px] font-black uppercase tracking-widest cursor-pointer flex-1">
      Répéter cette séance chaque semaine
    </label>
  </div>

  {formData.isRecurring && (
    <div className="bg-orange-600/5 border border-orange-600/20 p-4 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
      <label className="text-[9px] font-black uppercase text-orange-500 mb-2 block">Fréquence de répétition</label>
      <select 
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-orange-600"
        value={formData.rrule} 
        onChange={e => setFormData({...formData, rrule: e.target.value})}
      >
        <option value="">Choisir un jour...</option>
        <option value="FREQ=WEEKLY;BYDAY=MO">Tous les Lundis</option>
        <option value="FREQ=WEEKLY;BYDAY=TU">Tous les Mardis</option>
        <option value="FREQ=WEEKLY;BYDAY=WE">Tous les Mercredis</option>
        <option value="FREQ=WEEKLY;BYDAY=TH">Tous les Jeudis</option>
        <option value="FREQ=WEEKLY;BYDAY=FR">Tous les Vendredis</option>
        <option value="FREQ=WEEKLY;BYDAY=SA">Tous les Samedis</option>
        <option value="FREQ=WEEKLY;BYDAY=SU">Tous les Dimanches</option>
        <option value="FREQ=DAILY;INTERVAL=2">Un jour sur deux</option>
      </select>
      <p className="text-[8px] text-zinc-500 mt-2 italic text-center">
        La séance sera dupliquée automatiquement sur votre calendrier.
      </p>
    </div>
  )}
</div>

                <div className="flex gap-4 pt-4">
                  {selectedWorkout && (
                    <button type="button" onClick={handleDelete} disabled={isSaving}
                      className="p-4 rounded-2xl bg-red-900/10 text-red-500 hover:bg-red-900/20 transition-all active:scale-95 border border-red-900/20">
                      <Trash2 size={24} />
                    </button>
                  )}
                  <button type="submit" disabled={isSaving}
                    className="flex-1 bg-white text-black font-black uppercase text-[12px] tracking-widest py-4 rounded-2xl hover:bg-orange-600 hover:text-white transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95">
                    {isSaving ? <Activity className="animate-spin" /> : <Save size={18} />}
                    {selectedWorkout ? "Mettre à jour" : "Planifier la séance"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}