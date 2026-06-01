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
    selection.startIndex !== null &&
    selection.endIndex !== null;

  return (
    <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 shadow-sm">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
        Analyse Synchronisée
      </h3>

      <div className="w-full h-[440px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={unifiedSeries}
            syncId="activity-session"
            margin={{ top: 10, right: 20, left: -15, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />

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

            <Tooltip />

            <Area
              yAxisId="alt"
              type="monotone"
              dataKey="altitude"
              fill="#e2e8f0"
              stroke="none"
              isAnimationActive={false}
            />

            {visibleMetrics.speed && (
              <Line dataKey="speed" stroke="#6366f1" dot={false} />
            )}

            {visibleMetrics.heartRate && (
              <Line dataKey="heartRate" stroke="#ef4444" dot={false} />
            )}

            {visibleMetrics.cadence && (
              <Line dataKey="cadence" stroke="#10b981" dot={false} />
            )}

            {visibleMetrics.power && (
              <Line dataKey="power" stroke="#f59e0b" dot={false} />
            )}

            {isRangeActive && (
              <>
                <ReferenceArea
                  x1={selection.startIndex}
                  x2={selection.endIndex}
                  fill="#6366f1"
                  fillOpacity={0.15}
                />

                <ReferenceLine x={selection.startIndex} />
                <ReferenceLine x={selection.endIndex} />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* RANGE SLIDER */}
      <div className="mt-6">
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
        />

        {isRangeActive && (
          <button onClick={onResetSelection}>
            <X size={16} />
          </button>
        )}

        <button onClick={onResetSelection}>
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}