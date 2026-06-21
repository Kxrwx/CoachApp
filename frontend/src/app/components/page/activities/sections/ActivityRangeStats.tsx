"use client";

import React from "react";
import { Activity } from "lucide-react";
import { MiniStat } from "../../../UICores";

interface RangeStatsData {
  min: number;
  max: number;
  avg: number;
  stdDev: number;
  median?: number;
  p95?: number;
  durationMs: number;
  sum: number;
  samples: number;
  startTime?: string;
  endTime?: string;
} 

interface ActivityRangeStatsProps {
  isRangeActive: boolean;
  rangedData: any[];
  speedStats: RangeStatsData | null;
  heartStats: RangeStatsData | null;
  cadenceStats: RangeStatsData | null;
  powerStats: RangeStatsData | null;
}

const formatSelectionDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [
    h > 0 ? String(h).padStart(2, "0") : null,
    String(m).padStart(2, "0"),
    String(s).padStart(2, "0"),
  ]
    .filter(Boolean)
    .join(":");
};

export default function ActivityRangeStats({
  isRangeActive,
  rangedData,
  speedStats,
  heartStats,
  cadenceStats,
  powerStats,
}: ActivityRangeStatsProps) {

  if (!speedStats && !heartStats && !cadenceStats && !powerStats) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 shadow-sm">


      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-black text-slate-400 flex items-center gap-2">
            <Activity size={14} />
            {isRangeActive ? "Analyse plage sélectionnée" : "Analyse complète"}
          </div>

          <div className="text-sm font-bold text-slate-800 mt-1">
            {isRangeActive
              ? `${new Date(rangedData[0]?.timestamp).toLocaleTimeString()} → ${new Date(
                  rangedData[rangedData.length - 1]?.timestamp
                ).toLocaleTimeString()}`
              : "Données complètes"}
          </div>
        </div>

        {(speedStats || heartStats || cadenceStats || powerStats) && (
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest font-black text-slate-400">
              Durée
            </div>
            <div className="text-sm font-bold text-slate-800 mt-1">
              {formatSelectionDuration(speedStats?.durationMs || 0)}
            </div>
          </div>
        )}
      </div>


      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {speedStats && (
          <>
            <MiniStat label="Vit Avg" value={speedStats.avg.toFixed(1)} unit="km/h" />
            <MiniStat label="Vit Max" value={speedStats.max.toFixed(1)} unit="km/h" />
            <MiniStat label="Vit Min" value={speedStats.min.toFixed(1)} unit="km/h" />
            <MiniStat label="Vit σ"   value={speedStats.stdDev.toFixed(1)} unit="km/h" />
          </>
        )}

        {heartStats && (
          <>
            <MiniStat label="FC Avg" value={heartStats.avg.toFixed(0)} unit="bpm" />
            <MiniStat label="FC Max" value={heartStats.max.toFixed(0)} unit="bpm" />
            <MiniStat label="FC Min" value={heartStats.min.toFixed(0)} unit="bpm" />
            <MiniStat label="FC Med" value={heartStats.median?.toFixed(0)} unit="bpm" />
          </>
        )}

        {cadenceStats && (
          <>
            <MiniStat label="RPM Avg" value={cadenceStats.avg.toFixed(0)} unit="rpm" />
            <MiniStat label="RPM Max" value={cadenceStats.max.toFixed(0)} unit="rpm" />
            <MiniStat label="RPM Min" value={cadenceStats.min.toFixed(0)} unit="rpm" />
            <MiniStat label="RPM P95" value={cadenceStats.p95?.toFixed(0)} unit="rpm" />
          </>
        )}

        {powerStats && (
          <>
            <MiniStat label="Pwr Avg" value={powerStats.avg.toFixed(0)} unit="W" />
            <MiniStat label="Pwr Max" value={powerStats.max.toFixed(0)} unit="W" />
            <MiniStat label="Pwr Min" value={powerStats.min.toFixed(0)} unit="W" />
            <MiniStat
              label="Pwr Tot"
              value={
                powerStats && speedStats
                  ? ((powerStats.sum * speedStats.durationMs) / 3600000).toFixed(0)
                  : "—"
              }
              unit="kJ"
            />
          </>
        )}
      </div>
    </div>
  );
}