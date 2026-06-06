"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

export default function AthletePlanningPage() {
  const { id } = useParams();

  const [workouts, setWorkouts] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Fenêtre d'affichage : J-30 -> J+30
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
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // lundi
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

        // WORKOUTS : J-30 -> J+30
        if (planningRes.ok) {
          const planning = await planningRes.json();

          const filteredPlanning = planning.filter((w: any) => {
            const date = new Date(w.startDate);
            return date >= minDate && date <= maxDate;
          });

          setWorkouts(filteredPlanning);
        }

        // ACTIVITES : J-30 -> J0 uniquement
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

  const isToday = (date: Date) =>
    date.toDateString() === today.toDateString();

  const isWithinBounds = (date: Date) =>
    date >= minDate && date <= maxDate;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="animate-pulse text-slate-500">
          Chargement du planning...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <CalendarIcon className="text-indigo-600" />
          Planning & Activités
        </h2>

        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          <button
            onClick={() => changeWeek(-1)}
            className="p-2 hover:bg-slate-50 rounded-lg"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="px-4 text-sm font-bold text-slate-700">
            {weekDates[0].toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })}
            {" → "}
            {weekDates[6].toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })}
          </span>

          <button
            onClick={() => changeWeek(1)}
            className="p-2 hover:bg-slate-50 rounded-lg"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* LEGENDE */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-indigo-500" />
          <span className="text-slate-600">Workout planifié</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-slate-600">Activité réalisée</span>
        </div>
      </div>

      {/* CALENDAR */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
            <div
              key={day}
              className="p-4 text-center font-bold text-[10px] uppercase text-slate-400"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 min-h-[600px]">
          {weekDates.map((date) => {
            const dayWorkouts = workouts.filter(
              (w) =>
                new Date(w.startDate).toDateString() === date.toDateString()
            );

            const dayActivities = activities.filter(
              (a) =>
                new Date(a.startDate).toDateString() === date.toDateString()
            );

            return (
              <div
                key={date.toISOString()}
                className={`border-r border-slate-100 last:border-r-0 p-2 ${
                  !isWithinBounds(date) ? "bg-slate-50/50" : ""
                }`}
              >
                <div
                  className={`mb-3 text-center text-sm font-bold ${
                    isToday(date)
                      ? "text-indigo-600"
                      : "text-slate-700"
                  }`}
                >
                  {date.getDate()}
                </div>

                {/* ACTIVITES (J-30 -> J0) */}
                {dayActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="mb-2 p-2 rounded-xl bg-emerald-50 border border-emerald-200"
                  >
                    <div className="flex items-center gap-1 text-emerald-700 text-[10px] font-bold">
                      <CheckCircle2 size={11} />
                      Activité
                    </div>

                    <div className="mt-1 text-[10px] text-slate-600">
                      {activity.distance
                        ? `${activity.distance.toFixed(1)} km`
                        : "-"}
                    </div>

                    {activity.elevation > 0 && (
                      <div className="text-[9px] text-slate-500">
                        D+ {Math.round(activity.elevation)} m
                      </div>
                    )}
                  </div>
                ))}

                {/* WORKOUTS (J-30 -> J+30) */}
                {dayWorkouts.map((workout) => (
                  <div
                    key={workout.id}
                    onClick={() => setSelectedWorkout(workout)}
                    className="mb-2 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-indigo-300 transition-all border-l-4"
                    style={{
                      borderLeftColor:
                        workout.color || "#6366f1",
                    }}
                  >
                    <p className="text-[10px] font-bold text-slate-800 truncate">
                      {workout.title}
                    </p>

                    <div className="mt-1 flex items-center gap-2 text-[9px] text-slate-500">
                      {workout.duration && (
                        <>
                          <Clock size={9} />
                          {workout.duration} min
                        </>
                      )}

                      <span>{workout.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL */}
      {selectedWorkout && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl">
            <h2 className="text-2xl font-black text-slate-900 mb-6">
              {selectedWorkout.title}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  label: "Type",
                  value: selectedWorkout.type,
                },
                {
                  label: "Durée",
                  value: selectedWorkout.duration
                    ? `${selectedWorkout.duration} min`
                    : "-",
                },
                {
                  label: "Intensité",
                  value: selectedWorkout.intensity || "-",
                },
                {
                  label: "Status",
                  value: selectedWorkout.status || "-",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-slate-50 rounded-xl p-3"
                >
                  <div className="text-[9px] uppercase font-bold text-slate-400">
                    {item.label}
                  </div>

                  <div className="text-sm font-bold text-slate-700">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 bg-slate-50 rounded-xl text-sm text-slate-600">
              {selectedWorkout.description ||
                "Aucune description"}
            </div>

            <button
              onClick={() => setSelectedWorkout(null)}
              className="mt-6 w-full py-3 rounded-xl bg-slate-900 text-white font-bold"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}