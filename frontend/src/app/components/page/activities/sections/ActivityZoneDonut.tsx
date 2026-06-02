"use client";

import React, { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Heart, Zap } from "lucide-react";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

interface Zone {
  id: number;
  label: string;
  name: string;
  pctMin: number;
  pctMax: number;
  color: string;
}

interface ZoneSlice {
  zone: Zone;
  totalMs: number;
  distanceKm: number;
}

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [
    h > 0 ? String(h).padStart(2, "0") : null,
    String(m).padStart(2, "0"),
    String(sec).padStart(2, "0"),
  ]
    .filter(Boolean)
    .join(":");
}

/*
|--------------------------------------------------------------------------
| CUSTOM TOOLTIP
|--------------------------------------------------------------------------
*/

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: ZoneSlice = payload[0].payload;
  const pct = payload[0].value;

  return (
    <div
      className="rounded-2xl px-4 py-3 shadow-lg text-left min-w-[140px]"
      style={{
        backgroundColor: "white",
        border: `2px solid ${d.zone.color}`,
      }}
    >
      <div
        className="text-[10px] font-black uppercase tracking-widest mb-1"
        style={{ color: d.zone.color }}
      >
        {d.zone.label} — {d.zone.name}
      </div>
      <div className="text-lg font-black text-slate-800">
        {pct.toFixed(1)}%
      </div>
      <div className="text-xs text-slate-500 mt-1">
        {formatDuration(d.totalMs)}
      </div>
      {d.distanceKm > 0 && (
        <div className="text-xs text-slate-400">
          {d.distanceKm.toFixed(2)} km
        </div>
      )}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| DONUT CHART UNIQUE
|--------------------------------------------------------------------------
*/

interface DonutProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  slices: ZoneSlice[];
  totalMs: number;
}

function ZoneDonut({ title, icon, color, slices, totalMs }: DonutProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = useMemo(
    () =>
      slices
        .filter((s) => s.totalMs > 0)
        .map((s) => ({
          ...s,
          pct: totalMs > 0 ? (s.totalMs / totalMs) * 100 : 0,
        })),
    [slices, totalMs]
  );

  const activeSlice = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Titre */}
      <div
        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
        style={{ color }}
      >
        {icon}
        {title}
      </div>

      {/* Donut */}
      <div className="relative w-[200px] h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="pct"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.zone.id}
                  fill={entry.zone.color}
                  opacity={
                    activeIndex === null || activeIndex === index ? 1 : 0.3
                  }
                  stroke="white"
                  strokeWidth={activeIndex === index ? 2 : 1}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Centre : zone active ou total */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {activeSlice ? (
            <>
              <span
                className="text-xl font-black"
                style={{ color: activeSlice.zone.color }}
              >
                {activeSlice.pct.toFixed(1)}%
              </span>
              <span
                className="text-[10px] font-black uppercase tracking-wider mt-0.5"
                style={{ color: activeSlice.zone.color }}
              >
                {activeSlice.zone.label}
              </span>
            </>
          ) : (
            <>
              <span className="text-sm font-black text-slate-700">
                {formatDuration(totalMs)}
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                Total
              </span>
            </>
          )}
        </div>
      </div>

      {/* Légende inline */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5">
        {data.map((entry, index) => (
          <div
            key={entry.zone.id}
            className="flex items-center gap-1.5 cursor-default"
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.zone.color }}
            />
            <span className="text-[11px] font-bold text-slate-500">
              {entry.zone.label}
            </span>
            <span className="text-[11px] text-slate-400">
              {entry.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| MAIN
|--------------------------------------------------------------------------
*/

interface ActivityZoneDonutProps {
  hrDistribution: ZoneSlice[];
  powerDistribution: ZoneSlice[];
  hrTotalMs: number;
  powerTotalMs: number;
  availableMetrics: { hr: boolean; power: boolean };
}

export default function ActivityZoneDonut({
  hrDistribution,
  powerDistribution,
  hrTotalMs,
  powerTotalMs,
  availableMetrics,
}: ActivityZoneDonutProps) {
  const hasHr = availableMetrics.hr && hrTotalMs > 0;
  const hasPower = availableMetrics.power && powerTotalMs > 0;

  if (!hasHr && !hasPower) return null;

  return (
    <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 shadow-sm">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8">
        Répartition par zones
      </h3>

      <div
        className={`grid gap-12 ${
          hasHr && hasPower ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {hasHr && (
          <ZoneDonut
            title="Fréquence cardiaque"
            icon={<Heart size={12} />}
            color="#ef4444"
            slices={hrDistribution}
            totalMs={hrTotalMs}
          />
        )}
        {hasPower && (
          <ZoneDonut
            title="Puissance"
            icon={<Zap size={12} />}
            color="#f59e0b"
            slices={powerDistribution}
            totalMs={powerTotalMs}
          />
        )}
      </div>
    </div>
  );
}