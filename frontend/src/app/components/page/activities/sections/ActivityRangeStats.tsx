"use client";

import React from "react";
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceArea, ReferenceLine } from "recharts";
import { MiniStat } from "../../../UICores";
import { X, RotateCcw } from "lucide-react";

export default function ActivityRangeStats({
  availableMetrics = {},
  visibleMetrics = {},
  toggleMetric,
  unifiedSeries,
  isRangeActive,
  rangedData,
  selection = {},
  totalDataPoints,
  handleRangeChange,
  handleResetSelection,
  speedStats,
  heartStats,
  cadenceStats,
  powerStats,
}: any) {
    const formatSelectionDuration = (ms: number) => {
    if (!ms) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [h > 0 ? String(h).padStart(2, "0") : null, String(m).padStart(2, "0"), String(s).padStart(2, "0")]
      .filter(Boolean).join(":");
  };
  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* TOGGLES */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap gap-3">
        {availableMetrics.speed && (
          <button
            onClick={() => toggleMetric("speed")}
            className={`px-4 py-2 rounded-full border text-xs font-black uppercase tracking-wider transition-all ${
              visibleMetrics.speed ? "bg-indigo-500 border-indigo-500 text-white" : "bg-white border-slate-300 text-slate-500"
            }`}
          >
            Vitesse
          </button>
        )}
        {availableMetrics.heartRate && (
          <button
            onClick={() => toggleMetric("heartRate")}
            className={`px-4 py-2 rounded-full border text-xs font-black uppercase tracking-wider transition-all ${
              visibleMetrics.heartRate ? "bg-red-500 border-red-500 text-white" : "bg-white border-slate-300 text-slate-500"
            }`}
          >
            FC
          </button>
        )}
        {availableMetrics.cadence && (
          <button
            onClick={() => toggleMetric("cadence")}
            className={`px-4 py-2 rounded-full border text-xs font-black uppercase tracking-wider transition-all ${
              visibleMetrics.cadence ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-300 text-slate-500"
            }`}
          >
            RPM
          </button>
        )}
        {availableMetrics.power && (
          <button
            onClick={() => toggleMetric("power")}
            className={`px-4 py-2 rounded-full border text-xs font-black uppercase tracking-wider transition-all ${
              visibleMetrics.power ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-slate-300 text-slate-500"
            }`}
          >
            Watt
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MASTER CHART */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 shadow-sm mt-6">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
          Analyse Synchronisée
        </h3>

        <div className="w-full h-[440px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={unifiedSeries} syncId="activity-session" margin={{ top: 10, right: 20, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
              <XAxis dataKey="index" hide />
              <YAxis yAxisId="alt" orientation="left" stroke="#94a3b8" domain={["dataMin - 10", "dataMax + 10"]} axisLine={false} tickLine={false} />
              <YAxis yAxisId="metric" orientation="right" axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "1rem", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
              
              <Area yAxisId="alt" type="monotone" dataKey="altitude" fill="#e2e8f0" stroke="none" isAnimationActive={false} />

              {visibleMetrics.speed && <Line yAxisId="metric" type="monotone" dataKey="speed" stroke="#6366f1" strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />}
              {visibleMetrics.heartRate && <Line yAxisId="metric" type="monotone" dataKey="heartRate" stroke="#ef4444" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />}
              {visibleMetrics.cadence && <Line yAxisId="metric" type="monotone" dataKey="cadence" stroke="#10b981" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />}
              {visibleMetrics.power && <Line yAxisId="metric" type="monotone" dataKey="power" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />}

              {isRangeActive && (
                <>
                  <ReferenceArea yAxisId="metric" x1={selection.startIndex} x2={selection.endIndex} stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" fill="#6366f1" fillOpacity={0.15} />
                  <ReferenceLine yAxisId="metric" x={selection.startIndex} stroke="#6366f1" strokeWidth={2.5} />
                  <ReferenceLine yAxisId="metric" x={selection.endIndex} stroke="#6366f1" strokeWidth={2.5} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* RANGE SELECTOR BAR */}
        {/* ------------------------------------------------------------------ */}
        <div className="mt-6 space-y-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-3">Sélectionner une plage</label>
                <div className="relative h-8 flex items-center">
                  <div className="absolute w-full h-2 bg-slate-300 rounded-full" />
                  {isRangeActive && (
                    <div className="absolute h-2 bg-indigo-500 rounded-full" style={{ left: `${(selection.startIndex / totalDataPoints) * 100}%`, right: `${100 - (selection.endIndex / totalDataPoints) * 100}%` }} />
                  )}
                  <input type="range" min="0" max={Math.max(0, totalDataPoints - 1)} value={selection.startIndex ?? 0} onChange={(e) => { const start = parseInt(e.target.value); if (start < (selection.endIndex ?? totalDataPoints - 1)) handleRangeChange(start, selection.endIndex ?? totalDataPoints - 1); }} className="absolute w-full h-2 top-3 appearance-none bg-transparent rounded-full cursor-pointer z-5 pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:shadow-md" />
                  <input type="range" min="0" max={Math.max(0, totalDataPoints - 1)} value={selection.endIndex ?? totalDataPoints - 1} onChange={(e) => { const end = parseInt(e.target.value); if ((selection.startIndex ?? 0) < end) handleRangeChange(selection.startIndex ?? 0, end); }} className="absolute w-full h-2 top-3 appearance-none bg-transparent rounded-full cursor-pointer z-5 pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:shadow-md" />
                </div>
                {isRangeActive && (
                  <div className="flex justify-between mt-3 text-[11px] text-slate-500">
                    <span>{selection.startIndex}</span>
                    <span>{totalDataPoints - selection.endIndex + selection.startIndex} pts ({(((totalDataPoints - selection.endIndex + selection.startIndex) / totalDataPoints) * 100).toFixed(1)}%)</span>
                    <span>{selection.endIndex}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {isRangeActive && <button onClick={handleResetSelection} className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors"><X size={16} /></button>}
                <button onClick={handleResetSelection} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"><RotateCcw size={16} /></button>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* RANGE STATS */}
        {/*------------------------------------------------------------------*/}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-[10px] uppercase tracking-widest font-black text-slate-400">{isRangeActive ? "Analyse plage sélectionnée" : "Analyse complète"}</div>
              <div className="text-sm font-bold text-slate-800 mt-1">
                {isRangeActive ? `${new Date(rangedData[0]?.timestamp).toLocaleTimeString()} → ${new Date(rangedData[rangedData.length - 1]?.timestamp).toLocaleTimeString()}` : "Données complètes"}
              </div>
            </div>
            {(speedStats || heartStats || cadenceStats || powerStats) && (
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest font-black text-slate-400">Durée</div>
                <div className="text-sm font-bold text-slate-800 mt-1">{formatSelectionDuration(speedStats?.durationMs || 0)}</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {speedStats && (
              <>
                <MiniStat label="Vit Avg" value={speedStats.avg.toFixed(1)} unit="km/h" />
                <MiniStat label="Vit Max" value={speedStats.max.toFixed(1)} unit="km/h" />
                <MiniStat label="Vit Min" value={speedStats.min.toFixed(1)} unit="km/h" />
                <MiniStat label="Vit σ" value={speedStats.stdDev.toFixed(1)} unit="km/h" />
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
                <MiniStat label="Pwr Tot" value={powerStats && speedStats ? ((powerStats.sum * speedStats.durationMs) / 3600000).toFixed(0) : "—"} unit="kJ" />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}