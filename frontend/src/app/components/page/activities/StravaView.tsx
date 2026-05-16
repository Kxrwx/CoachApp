// app/activities/[id]/components/StravaView.tsx

import React from "react";
import { MapPin, Clock, Gauge, TrendingUp, Activity } from "lucide-react";
import { StatCard, DataRow } from "../../UICores";
import { formatDistance, formatDuration, formatStravaSpeed, formatStravaPace } from "@/lib/utils";

interface StravaViewProps {
  sd: any;
  isRide: boolean;
}

export default function StravaView({ sd, isRide }: StravaViewProps) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<MapPin />} label="Distance" value={formatDistance(sd.distance)} unit="km" color="text-orange-600" />
        <StatCard icon={<Clock />} label="Effort Actif" value={formatDuration(sd.movingTime)} unit="" />
        <StatCard icon={<Gauge />} label={isRide ? "Vitesse Moy." : "Allure Moy."} value={isRide ? formatStravaSpeed(sd.distance / sd.movingTime) : formatStravaPace(sd.distance / sd.movingTime)} unit={isRide ? "km/h" : "/km"} />
        <StatCard icon={<TrendingUp />} label="Dénivelé +" value={sd.totalElevationGain?.toFixed(0) || "0"} unit="m" />
      </div>

      <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
          <Activity size={14} /> Toutes les données récoltées de la session (Strava)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-orange-600 mb-2">Physiologique & Capteurs</h4>
            <DataRow label="Puissance moyenne" value={sd.avgWatts ? `${sd.avgWatts} W` : "Pas de capteur"} />
            <DataRow label="Fréquence Cardiaque Moy." value={sd.avgHeartrate ? `${sd.avgHeartrate} bpm` : "--"} />
            <DataRow label="Fréquence Cardiaque Max." value={sd.maxHeartrate ? `${sd.maxHeartrate} bpm` : "--"} />
            <DataRow label="Cadence moyenne" value={sd.avgCadence ? `${sd.avgCadence} rpm` : "--"} />
          </div>
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Structure de Temps & Environnement</h4>
            <DataRow label="Temps total écoulé" value={formatDuration(sd.elapsedTime)} />
            <DataRow label="Ratio d'effort actif" value={sd.elapsedTime ? `${((sd.movingTime / sd.elapsedTime) * 100).toFixed(1)}%` : "--"} />
            <DataRow label="Température moyenne" value={sd.avgTemp ? `${sd.avgTemp}°C` : "--"} />
            <DataRow label="Calories dépensées" value={sd.calories ? `${sd.calories} kcal` : "--"} />
          </div>
        </div>
      </div>
    </div>
  );
}