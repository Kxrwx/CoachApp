"use client";

import React, { useState, useCallback } from "react";

import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  Line,
  ReferenceArea,
  ReferenceLine,
} from "recharts";

import { X, RotateCcw } from "lucide-react";

export default function ActivityProfileChart({
  unifiedSeries,
  availableMetrics,
  selection,
  onSelectionChange,
  onResetSelection,
}: any) {
  const [visibleMetrics, setVisibleMetrics] = useState({
    speed: true,
    heartRate: true,
    cadence: true,
    power: true,
  });

  const toggleMetric = useCallback((metric: string) => {
    setVisibleMetrics((prev: any) => ({
      ...prev,
      [metric]: !prev[metric],
    }));
  }, []);

  const totalDataPoints = unifiedSeries.length;

  const isRangeActive =
    selection.startIndex !== null && selection.endIndex !== null;

  const startZIndex =
    (selection.startIndex ?? 0) >= (selection.endIndex ?? totalDataPoints - 1) - 1
      ? 6
      : 4;

  const endZIndex =
    (selection.endIndex ?? totalDataPoints - 1) <=
    (selection.startIndex ?? 0) + 1
      ? 6
      : 5;

  return (
    <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 shadow-sm">

      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
        Analyse Synchronisée
      </h3>


      <div className="flex flex-wrap gap-3 mb-6">
        {availableMetrics.speed && (
          <button
            onClick={() => toggleMetric("speed")}
            className={`px-4 py-2 rounded-full border text-xs font-black uppercase tracking-wider transition-all ${
              visibleMetrics.speed
                ? "bg-indigo-500 border-indigo-500 text-white"
                : "bg-white border-slate-300 text-slate-500"
            }`}
          >
            Vitesse
          </button>
        )}

        {availableMetrics.heartRate && (
          <button
            onClick={() => toggleMetric("heartRate")}
            className={`px-4 py-2 rounded-full border text-xs font-black uppercase tracking-wider transition-all ${
              visibleMetrics.heartRate
                ? "bg-red-500 border-red-500 text-white"
                : "bg-white border-slate-300 text-slate-500"
            }`}
          >
            FC
          </button>
        )}

        {availableMetrics.cadence && (
          <button
            onClick={() => toggleMetric("cadence")}
            className={`px-4 py-2 rounded-full border text-xs font-black uppercase tracking-wider transition-all ${
              visibleMetrics.cadence
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "bg-white border-slate-300 text-slate-500"
            }`}
          >
            RPM
          </button>
        )}

        {availableMetrics.power && (
          <button
            onClick={() => toggleMetric("power")}
            className={`px-4 py-2 rounded-full border text-xs font-black uppercase tracking-wider transition-all ${
              visibleMetrics.power
                ? "bg-amber-500 border-amber-500 text-white"
                : "bg-white border-slate-300 text-slate-500"
            }`}
          >
            Watt
          </button>
        )}
      </div>



      <div className="w-full h-[440px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={unifiedSeries}
            syncId="activity-session"
            margin={{ top: 10, right: 20, left: -15, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              opacity={0.15}
              vertical={false}
            />

            <XAxis dataKey="index" hide />

            <YAxis
              yAxisId="alt"
              orientation="left"
              stroke="#94a3b8"
              domain={["dataMin - 10", "dataMax + 10"]}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              yAxisId="metric"
              orientation="right"
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              contentStyle={{
                borderRadius: "1rem",
                border: "none",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            />

            <Area
              yAxisId="alt"
              type="monotone"
              dataKey="altitude"
              fill="#e2e8f0"
              stroke="none"
              isAnimationActive={false}
            />

            {visibleMetrics.speed && (
              <Line
                yAxisId="metric"
                type="monotone"
                dataKey="speed"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}

            {visibleMetrics.heartRate && (
              <Line
                yAxisId="metric"
                type="monotone"
                dataKey="heartRate"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}

            {visibleMetrics.cadence && (
              <Line
                yAxisId="metric"
                type="monotone"
                dataKey="cadence"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}

            {visibleMetrics.power && (
              <Line
                yAxisId="metric"
                type="monotone"
                dataKey="power"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}

            {isRangeActive && (
              <>
                <ReferenceArea
                  yAxisId="metric"
                  x1={selection.startIndex}
                  x2={selection.endIndex}
                  stroke="#6366f1"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="#6366f1"
                  fillOpacity={0.15}
                />
                <ReferenceLine
                  yAxisId="metric"
                  x={selection.startIndex}
                  stroke="#6366f1"
                  strokeWidth={2.5}
                />
                <ReferenceLine
                  yAxisId="metric"
                  x={selection.endIndex}
                  stroke="#6366f1"
                  strokeWidth={2.5}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>


      <div className="mt-6 space-y-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-4">

            <div className="flex-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-3">
                Sélectionner une plage
              </label>

              <div className="relative h-8 flex items-center">

                <div className="absolute w-full h-2 bg-slate-300 rounded-full" />

                {isRangeActive && (
                  <div
                    className="absolute h-2 bg-indigo-500 rounded-full"
                    style={{
                      left: `${(selection.startIndex! / (totalDataPoints - 1)) * 100}%`,
                      right: `${100 - (selection.endIndex! / (totalDataPoints - 1)) * 100}%`,
                    }}
                  />
                )}

                <input
                  type="range"
                  min="0"
                  max={Math.max(0, totalDataPoints - 1)}
                  value={selection.startIndex ?? 0}
                  onChange={(e) =>
                    onSelectionChange(
                      parseInt(e.target.value),
                      selection.endIndex ?? totalDataPoints - 1
                    )
                  }
                  style={{ zIndex: startZIndex }}
                  className="absolute w-full h-2 top-3 appearance-none bg-transparent rounded-full cursor-pointer pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-indigo-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
                />

                <input
                  type="range"
                  min="0"
                  max={Math.max(0, totalDataPoints - 1)}
                  value={selection.endIndex ?? totalDataPoints - 1}
                  onChange={(e) =>
                    onSelectionChange(
                      selection.startIndex ?? 0,
                      parseInt(e.target.value)
                    )
                  }
                  style={{ zIndex: endZIndex }}
                  className="absolute w-full h-2 top-3 appearance-none bg-transparent rounded-full cursor-pointer pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-indigo-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
                />
              </div>


              {isRangeActive && (
                <div className="flex justify-between mt-3 text-[11px] text-slate-500">
                  <span>{selection.startIndex}</span>
                  <span>
                    {selection.endIndex! - selection.startIndex! + 1} pts (
                    {(
                      ((selection.endIndex! - selection.startIndex! + 1) /
                        totalDataPoints) *
                      100
                    ).toFixed(1)}
                    %)
                  </span>
                  <span>{selection.endIndex}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {isRangeActive && (
                <button
                  onClick={onResetSelection}
                  className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors"
                  title="Enlever la sélection"
                >
                  <X size={16} />
                </button>
              )}
              <button
                onClick={onResetSelection}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                title="Réinitialiser"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}