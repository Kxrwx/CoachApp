"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { 
  Plus, Bike, Dumbbell, GripVertical, X, Trash2, Save, Timer, Activity, Map, ChevronLeft, Calendar as CalendarIcon, AlignLeft
} from "lucide-react";
import { 
  format, addDays, subDays, eachDayOfInterval, isSameDay, isToday, parseISO, startOfDay 
} from "date-fns";
import { fr } from "date-fns/locale";
import { RRule } from "rrule";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

type ModalState = 'closed' | 'day' | 'detail' | 'form';

export default function PlanningPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [plannedWorkouts, setPlannedWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Nouveaux états unifiés pour les pop-ups
  const [modalState, setModalState] = useState<ModalState>('closed');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
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

  // CORRECTION 1 : Plage de dates -30 / +30 jours
  const dateRange = useMemo(() => {
    const start = subDays(startOfDay(new Date()), 30);
    const end = addDays(startOfDay(new Date()), 30);
    return eachDayOfInterval({ start, end });
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [resStrava, resPlanned] = await Promise.all([
        axios.get("/api/me/strava/get/allActivities"), 
        axios.get("/api/me/training/getAll")
      ]);
      // FIX 1: Sécurisation du tableau de retour (si wrappé dans un data/activities)
      const stravaData = resStrava.data?.activities || resStrava.data?.data || resStrava.data;
      setActivities(Array.isArray(stravaData) ? stravaData : []);
      
      setPlannedWorkouts(Array.isArray(resPlanned.data) ? resPlanned.data : []);
    } catch (err) {
      console.error("Erreur fetch:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getWorkoutsForDay = (day: Date) => {
    const dailyItems: any[] = [];
    plannedWorkouts.forEach(pw => {
      if (pw.isRecurring && pw.rrule) {
        try {
          const dtStart = parseISO(pw.startDate);
          const ruleString = `DTSTART:${format(dtStart, "yyyyMMdd'T'HHmmss'Z'")}\nRRULE:${pw.rrule}`;
          const rule = RRule.fromString(ruleString);
          const occurrences = rule.between(subDays(day, 1), addDays(day, 1));
          if (occurrences.some(occ => isSameDay(occ, day))) {
            dailyItems.push({ ...pw, isOccurrence: true });
          }
        } catch (e) {
          console.error("RRule error:", e);
        }
      } else if (isSameDay(parseISO(pw.startDate), day)) {
        dailyItems.push(pw);
      }
    });
    return dailyItems;
  };

  // --- GESTIONNAIRES DE MODAL ---
  const closeModal = () => {
    setModalState('closed');
    setSelectedDay(null);
    setSelectedItem(null);
  };

  const openDayModal = (day: Date) => {
    setSelectedDay(day);
    setModalState('day');
  };

  const openDetailModal = (item: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedItem(item);
    setModalState('detail');
  };

  const openFormModal = (item: any = null, defaultDate?: Date, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedItem(item);
    setFormData({
      title: item?.title || "",
      type: item?.type || "Ride",
      startDate: format(item ? parseISO(item.startDate) : (defaultDate || new Date()), "yyyy-MM-dd"),
      isRecurring: item?.isRecurring || false,
      rrule: item?.rrule || "",
      description: item?.description || "",
      duration: item?.duration || 60,
      distance: item?.distance || 0,
      intensity: item?.intensity || "Moderate"
    });
    setModalState('form');
  };

  const navigateBack = () => {
    if (modalState === 'form' && selectedItem) {
      setModalState('detail');
    } else if (modalState === 'detail' && selectedDay) {
      setModalState('day');
    } else {
      closeModal();
    }
  };

  // --- ACTIONS ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await axios.post("/api/me/training/upsert", {
        ...formData,
        id: selectedItem?.id || null, 
      });
      fetchData();
      if (selectedDay) {
        setModalState('day'); // Retour à la vue jour si on y était
      } else {
        closeModal();
      }
    } catch (err) {
      alert("Erreur lors de la sauvegarde");
    } finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    if (!confirm("Supprimer définitivement cette séance ?")) return;
    setIsSaving(true);
    try {
      await axios.get(`/api/me/training/delete/${selectedItem.id}`);
      fetchData();
      if (selectedDay) {
        setModalState('day');
      } else {
        closeModal();
      }
    } catch (err) { alert("Erreur suppression"); }
    finally { setIsSaving(false); }
  };

  const onDragEnd = async (result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    
    // Si la clé est composée pour sécuriser l'affichage react, on extrait l'id pur.
    const realId = draggableId.split('-')[0];
    
    // FIX 2: Réordonnancement strict et calcul de l'ordre global (id transformé en string pour être matché sans erreur)
    let updatedWorkouts = [...plannedWorkouts];
    
    const draggedIndex = updatedWorkouts.findIndex(pw => pw.id.toString() === realId);
    if (draggedIndex === -1) return;

    const [draggedItem] = updatedWorkouts.splice(draggedIndex, 1);
    draggedItem.startDate = destination.droppableId;

    // Isoler les items de la date de destination et y injecter l'item pour redéfinir l'ordre
    const destItems = updatedWorkouts.filter(pw => pw.startDate === destination.droppableId);
    destItems.splice(destination.index, 0, draggedItem);

    // Assigner un nouvel ordre à la journée modifiée
    const orderedItems = destItems.map((item, idx) => ({ ...item, order: idx }));

    // Reconstituer l'état global avec le nouvel ordre de fin de jour
    updatedWorkouts = updatedWorkouts
      .filter(pw => pw.startDate !== destination.droppableId)
      .concat(orderedItems);

    setPlannedWorkouts(updatedWorkouts);

    try {
      // Upsert du tableau réordonnancé pour persister le nouvel ordre
      await axios.post("/api/me/training/upsert", orderedItems);
    } catch (err) { 
      fetchData(); 
    }
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
            <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mt-1">Données synchronisées (Strava + Coaching)</p>
          </div>
          <button onClick={(e) => openFormModal(null, undefined, e)} className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all">
            <Plus size={16} /> Ajouter une séance
          </button>
        </header>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {dateRange.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              // FIX 1: Ajout de 'start_date' courant aux retours API standard Strava pour match le champ ISO
              const dayActivities = activities.filter(a => isSameDay(parseISO(a.startDate || a.start_date_local || a.start_date), day));
              const dayPlanned = getWorkoutsForDay(day);

              return (
                <Droppable droppableId={dateKey} key={dateKey}>
                  {(provided) => (
                    <div 
                      ref={provided.innerRef} 
                      {...provided.droppableProps}
                      onClick={() => openDayModal(day)}
                      className={`min-h-[220px] rounded-[1.8rem] p-4 border transition-all cursor-pointer hover:bg-zinc-800/40 ${isToday(day) ? 'bg-zinc-900 border-orange-600/50' : 'bg-zinc-900/30 border-zinc-800'}`}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <p className={`text-[10px] font-black uppercase ${isToday(day) ? 'text-orange-500' : 'text-zinc-500'}`}>
                          {format(day, "EEE d MMM", { locale: fr })}
                        </p>
                        {/* Bouton d'ajout discret pour ce jour */}
                        <button 
                          onClick={(e) => openFormModal(null, day, e)}
                          className="text-zinc-600 hover:text-orange-500 transition-colors p-1"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        {dayActivities.map(act => (
                          <div 
                            key={act.id} 
                            onClick={(e) => openDetailModal(act, e)}
                            className="bg-white text-black p-2 rounded-xl flex items-center gap-2 text-[9px] font-black uppercase shadow-lg hover:scale-[1.02] transition-transform"
                          >
                            <Bike size={12} className="text-orange-600 shrink-0" /> 
                            <span className="truncate">{act.name}</span>
                          </div>
                        ))}
                        
                        {dayPlanned.map((plan, index) => {
                          const dragId = plan.isOccurrence ? `${plan.id}-${dateKey}` : plan.id;
                          return (
                            <Draggable 
                              key={dragId} 
                              draggableId={dragId.toString()} // Cast en string pour assurer le map
                              index={index}
                              isDragDisabled={plan.isRecurring} // Désactive le drag pour les récurrences
                            >
                              {(draggable) => (
                                <div 
                                  ref={draggable.innerRef} 
                                  {...draggable.draggableProps} 
                                  {...draggable.dragHandleProps}
                                  onClick={(e) => openDetailModal(plan, e)}
                                  className={`p-3 rounded-xl bg-zinc-800 border-l-4 ${getIntensityColor(plan.intensity)} border-y-zinc-700 border-r-zinc-700 hover:border-orange-500/50 transition-all group mb-2 relative ${plan.isRecurring ? 'cursor-default' : ''}`}
                                >
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="text-[10px] font-black uppercase truncate pr-2">{plan.title}</span>
                                    {plan.isRecurring ? (
                                      <Activity size={10} className="text-orange-500 animate-pulse shrink-0" />
                                    ) : (
                                      <GripVertical size={12} className="text-zinc-600 group-hover:text-zinc-400 shrink-0" />
                                    )}
                                  </div>
                                  <div className="flex gap-2 text-[8px] text-zinc-500 font-bold uppercase italic">
                                    <span className="flex items-center gap-0.5"><Timer size={10}/> {plan.duration}m</span>
                                    {plan.distance > 0 && <span className="flex items-center gap-0.5"><Map size={10}/> {plan.distance}km</span>}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                      </div>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>

        {/* MODAL UNIFIÉ */}
        {modalState !== 'closed' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-zinc-950 border border-zinc-800 w-full max-w-xl rounded-[2.5rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
              
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  {(modalState === 'detail' || (modalState === 'form' && selectedItem)) && (
                    <button onClick={navigateBack} className="bg-zinc-900 hover:bg-zinc-800 p-2 rounded-full text-zinc-400 transition-colors">
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                    {modalState === 'day' && selectedDay && format(selectedDay, "EEEE d MMMM", { locale: fr })}
                    {modalState === 'detail' && "Détail de l'activité"}
                    {modalState === 'form' && (selectedItem ? "Modifier la séance" : "Nouvelle séance")}
                  </h2>
                </div>
                <button onClick={closeModal} className="bg-zinc-900 hover:bg-zinc-800 p-2 rounded-full text-zinc-400 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* VUE: JOUR */}
              {modalState === 'day' && selectedDay && (() => {
                const dayActs = activities.filter(a => isSameDay(parseISO(a.startDate || a.start_date_local || a.start_date), selectedDay));
                const dayPlans = getWorkoutsForDay(selectedDay);
                
                return (
                  <div className="space-y-6">
                    <button onClick={(e) => openFormModal(null, selectedDay, e)} className="w-full bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 border-dashed text-zinc-400 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all">
                      <Plus size={16} /> Ajouter une séance ce jour
                    </button>
                    
                    {dayActs.length === 0 && dayPlans.length === 0 && (
                      <p className="text-center text-zinc-600 text-xs font-bold uppercase py-8">Aucune activité ce jour</p>
                    )}

                    {dayActs.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-[10px] text-orange-600 font-black uppercase tracking-widest">Activités Strava</h3>
                        {dayActs.map(act => (
                          <div key={act.id} onClick={(e) => openDetailModal(act, e)} className="bg-white text-black p-4 rounded-2xl flex items-center gap-3 text-xs font-black uppercase shadow-lg cursor-pointer hover:scale-[1.02] transition-transform">
                            <Bike size={16} className="text-orange-600" /> {act.name}
                          </div>
                        ))}
                      </div>
                    )}

                    {dayPlans.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-[10px] text-orange-600 font-black uppercase tracking-widest">Séances Planifiées</h3>
                        {dayPlans.map((plan, i) => (
                          <div key={i} onClick={(e) => openDetailModal(plan, e)} className={`p-4 rounded-2xl bg-zinc-900 border-l-4 ${getIntensityColor(plan.intensity)} cursor-pointer hover:bg-zinc-800 transition-colors`}>
                            <p className="text-sm font-black uppercase mb-1">{plan.title}</p>
                            <div className="flex gap-3 text-[10px] text-zinc-500 font-bold uppercase">
                              <span className="flex items-center gap-1"><Timer size={12}/> {plan.duration} min</span>
                              {plan.distance > 0 && <span className="flex items-center gap-1"><Map size={12}/> {plan.distance} km</span>}
                              {plan.isRecurring && <span className="flex items-center gap-1 text-orange-500"><Activity size={12}/> Récurrent</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* VUE: DÉTAIL */}
              {modalState === 'detail' && selectedItem && (() => {
                const isStrava = !!selectedItem.name; // Les données Strava utilisent souvent 'name', Prisma 'title'
                return (
                  <div className="space-y-6">
                    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                      <h3 className="text-2xl font-black italic uppercase text-white mb-4">
                        {isStrava ? selectedItem.name : selectedItem.title}
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="flex items-center gap-3 text-sm text-zinc-400 font-bold uppercase">
                          <CalendarIcon size={16} className="text-orange-500"/>
                          {format(parseISO(selectedItem.startDate || selectedItem.start_date_local || selectedItem.start_date), "dd/MM/yyyy")}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-zinc-400 font-bold uppercase">
                          <Timer size={16} className="text-orange-500"/>
                          {isStrava ? Math.round(selectedItem.moving_time / 60) : selectedItem.duration} min
                        </div>
                        {(selectedItem.distance > 0) && (
                          <div className="flex items-center gap-3 text-sm text-zinc-400 font-bold uppercase">
                            <Map size={16} className="text-orange-500"/>
                            {isStrava ? (selectedItem.distance / 1000).toFixed(1) : selectedItem.distance} km
                          </div>
                        )}
                        {!isStrava && selectedItem.intensity && (
                          <div className="flex items-center gap-3 text-sm text-zinc-400 font-bold uppercase">
                            <Activity size={16} className="text-orange-500"/>
                            Intensité : {selectedItem.intensity}
                          </div>
                        )}
                      </div>

                      {!isStrava && selectedItem.description && (
                        <div className="pt-4 border-t border-zinc-800">
                          <div className="flex items-center gap-2 mb-2">
                            <AlignLeft size={14} className="text-orange-500" />
                            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Notes</span>
                          </div>
                          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{selectedItem.description}</p>
                        </div>
                      )}
                    </div>

                    {!isStrava && (
                      <div className="flex gap-4 pt-4">
                        <button onClick={handleDelete} className="p-4 rounded-2xl bg-red-900/10 text-red-500 hover:bg-red-900/20 border border-red-900/20 transition-all flex items-center justify-center">
                          <Trash2 size={24} />
                        </button>
                        <button onClick={() => setModalState('form')} className="flex-1 bg-white text-black font-black uppercase text-[12px] tracking-widest py-4 rounded-2xl hover:bg-orange-600 hover:text-white transition-all flex items-center justify-center gap-3">
                          Modifier la séance
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* VUE: FORMULAIRE */}
              {modalState === 'form' && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-500 mb-2 block tracking-widest">Titre</label>
                    <input type="text" required className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:border-orange-600 outline-none"
                      value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                      <label className="text-[9px] font-black uppercase text-zinc-500 mb-2 block">Intensité</label>
                      <select className="w-full bg-transparent text-sm font-bold outline-none" value={formData.intensity} onChange={e => setFormData({...formData, intensity: e.target.value})}>
                        <option value="Low">Basse</option>
                        <option value="Moderate">Modérée</option>
                        <option value="High">Haute</option>
                      </select>
                    </div>
                    <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                      <label className="text-[9px] font-black uppercase text-zinc-500 mb-2 block">Durée</label>
                      <input type="number" className="w-full bg-transparent text-sm font-bold outline-none" value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                      <label className="text-[9px] font-black uppercase text-zinc-500 mb-2 block">Date</label>
                      <input type="date" className="w-full bg-transparent text-xs font-bold outline-none" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                      <input type="checkbox" id="recurring" className="w-5 h-5 accent-orange-600"
                        checked={formData.isRecurring} onChange={e => setFormData({...formData, isRecurring: e.target.checked})} />
                      <label htmlFor="recurring" className="text-[10px] font-black uppercase tracking-widest cursor-pointer">Activer la récurrence hebdomadaire</label>
                    </div>
                    {formData.isRecurring && (
                      <select className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-orange-600"
                        value={formData.rrule} onChange={e => setFormData({...formData, rrule: e.target.value})}>
                        <option value="">Choisir un jour...</option>
                        <option value="FREQ=WEEKLY;BYDAY=MO">Tous les Lundis</option>
                        <option value="FREQ=WEEKLY;BYDAY=TU">Tous les Mardis</option>
                        <option value="FREQ=WEEKLY;BYDAY=WE">Tous les Mercredis</option>
                        <option value="FREQ=WEEKLY;BYDAY=TH">Tous les Jeudis</option>
                        <option value="FREQ=WEEKLY;BYDAY=FR">Tous les Vendredis</option>
                        <option value="FREQ=WEEKLY;BYDAY=SA">Tous les Samedis</option>
                        <option value="FREQ=WEEKLY;BYDAY=SU">Tous les Dimanches</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-500 mb-2 block text-center italic">Notes de séance</label>
                    <textarea className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-xs focus:border-orange-600 outline-none h-20 resize-none"
                      value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                  </div>
                  <div className="flex gap-4 pt-4">
                    {selectedItem && (
                      <button type="button" onClick={handleDelete} className="p-4 rounded-2xl bg-red-900/10 text-red-500 hover:bg-red-900/20 border border-red-900/20">
                        <Trash2 size={24} />
                      </button>
                    )}
                    <button type="submit" disabled={isSaving} className="flex-1 bg-white text-black font-black uppercase text-[12px] tracking-widest py-4 rounded-2xl hover:bg-orange-600 hover:text-white transition-all flex items-center justify-center gap-3">
                      {isSaving ? <Activity className="animate-spin" /> : <Save size={18} />}
                      {selectedItem ? "Mettre à jour" : "Sauvegarder"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}