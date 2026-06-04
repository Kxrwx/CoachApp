"use client";

import React from "react";
import {
  MapPin,
  Clock,
  Gauge,
  TrendingUp,
  Activity,
} from "lucide-react";

import { StatCard, DataRow } from "../../../UICores";

import {
  formatDistance,
  formatDuration,
  formatFitSpeed,
} from "@/lib/utils";

export default function ActivityOverview({
  fitStats,
  activity,
  availableMetrics,
}: any) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<MapPin />}
          label="Distance"
          value={formatDistance(fitStats.total_distance)}
          unit="km"
          color="text-indigo-600"
        />

        <StatCard
          icon={<Clock />}
          label="Temps actif"
          value={formatDuration(
            fitStats.total_timer_time ||
              fitStats.total_elapsed_time
          )}
        />

        <StatCard
          icon={<Gauge />}
          label="Vitesse moy."
          value={formatFitSpeed(fitStats.avg_speed)}
          unit="km/h"
        />

        <StatCard
          icon={<TrendingUp />}
          label="Vitesse max"
          value={formatFitSpeed(fitStats.max_speed)}
          unit="km/h"
        />
      </div>

      {/* FIT INFOS */}
      <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
          <Activity size={14} />
          Toutes les données récoltées
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-600 mb-2">
              Capteurs
            </h4>

            {availableMetrics.power && (
              <>
                <DataRow
                  label="Puissance Max"
                  value={`${fitStats.max_power} W`}
                />
                <DataRow
                  label="Puissance Moy"
                  value={`${fitStats.avg_power?.toFixed(0) || "—"} W`}
                />
              </>
            )}

            {availableMetrics.heartRate && (
              <>
                <DataRow
                  label="FC Moyenne"
                  value={`${fitStats.avg_heart_rate} bpm`}
                />
                <DataRow
                  label="FC Max"
                  value={`${fitStats.max_heart_rate} bpm`}
                />
              </>
            )}

            {availableMetrics.cadence && (
              <>
                <DataRow
                  label="Cadence Moy."
                  value={`${fitStats.avg_cadence} rpm`}
                />
                <DataRow
                  label="Cadence Max"
                  value={`${fitStats.max_cadence} rpm`}
                />
              </>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
              Géométrie & Temps
            </h4>

            <DataRow
              label="Ascension"
              value={`${fitStats.total_ascent?.toFixed(0)} m`}
            />

            <DataRow
              label="Descente"
              value={`${fitStats.total_descent?.toFixed(0)} m`}
            />

            <DataRow
              label="Temps Actif"
              value={formatDuration(fitStats.total_timer_time)}
            />

            <DataRow
              label="Temps Total"
              value={formatDuration(
                fitStats.total_elapsed_time
              )}
            />

            <DataRow
              label="Segments"
              value={
                activity.decodedFileData?.laps?.length || "1"
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}