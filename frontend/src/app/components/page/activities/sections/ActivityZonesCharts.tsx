"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Area,
  ReferenceArea,
} from "recharts";
import { Activity, Zap, Heart } from "lucide-react";
import { MiniStat } from "../../../UICores";
import { computeMetricStats } from "../utils/activityStats";

/*
|--------------------------------------------------------------------------
| ZONES
|--------------------------------------------------------------------------
*/

const HR_ZONES = [
  { id: 1, label: "Z1", name: "Récupération", pctMin: 0.00, pctMax: 0.60, color: "#94a3b8" },
  { id: 2, label: "Z2", name: "Endurance",    pctMin: 0.60, pctMax: 0.70, color: "#60a5fa" },
  { id: 3, label: "Z3", name: "Tempo",        pctMin: 0.70, pctMax: 0.80, color: "#34d399" },
  { id: 4, label: "Z4", name: "Seuil",        pctMin: 0.80, pctMax: 0.90, color: "#fb923c" },
  { id: 5, label: "Z5", name: "VO2Max",       pctMin: 0.90, pctMax: 9999, color: "#ef4444" },
];

const POWER_ZONES = [
  { id: 1, label: "Z1", name: "Récupération", pctMin: 0.00, pctMax: 0.55, color: "#94a3b8" },
  { id: 2, label: "Z2", name: "Endurance",    pctMin: 0.55, pctMax: 0.74, color: "#60a5fa" },
  { id: 3, label: "Z3", name: "Tempo",        pctMin: 0.74, pctMax: 0.89, color: "#34d399" },
  { id: 4, label: "Z4", name: "Seuil",        pctMin: 0.89, pctMax: 1.05, color: "#facc15" },
  { id: 5, label: "Z5", name: "VO2Max",       pctMin: 1.05, pctMax: 1.20, color: "#fb923c" },
  { id: 6, label: "Z6", name: "Anaérobie",    pctMin: 1.20, pctMax: 1.50, color: "#ef4444" },
  { id: 7, label: "Z7", name: "Neuromusc.",   pctMin: 1.50, pctMax: 9999, color: "#a855f7" },
];

type Zone = typeof HR_ZONES[0];

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function getZone(value: number, ref: number, zones: Zone[]): Zone {
  for (const z of zones) {
    if (value >= ref * z.pctMin && value < ref * z.pctMax) return z;
  }
  return zones[zones.length - 1];
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [
    h > 0 ? String(h).padStart(2, "0") : null,
    String(m).padStart(2, "0"),
    String(sec).padStart(2, "0"),
  ].filter(Boolean).join(":");
}

// Hauteur visuelle par zone (1-5 niveaux normalisés)
const ZONE_HEIGHT: Record<number, number> = {
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7,
};

// Y max du graphique de blocs (unités arbitraires)
const BLOCK_Y_MAX = 7;

/*
|--------------------------------------------------------------------------
| COMPOSANT ZONE BARS (distribution temps)
|--------------------------------------------------------------------------
*/

interface ZoneBarsProps {
  zones: Zone[];
  distribution: { zone: Zone; totalMs: number }[];
  totalMs: number;
  selectedZoneId: number | null;
  onZoneClick: (id: number) => void;
}

function ZoneBars({ zones, distribution, totalMs, selectedZoneId, onZoneClick }: ZoneBarsProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {zones.map((zone) => {
        const data = distribution.find((d) => d.zone.id === zone.id);
        const pct = totalMs > 0 ? ((data?.totalMs ?? 0) / totalMs) * 100 : 0;
        const isSelected = selectedZoneId === zone.id;

        return (
          <button
            key={zone.id}
            onClick={() => onZoneClick(zone.id)}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2 transition-all text-left hover:opacity-90"
            style={{
              backgroundColor: isSelected ? zone.color + "20" : "#f8fafc",
              outline: isSelected ? `2px solid ${zone.color}` : "1px solid #e2e8f0",
            }}
          >
            <span
              className="text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white"
              style={{ backgroundColor: zone.color }}
            >
              {zone.label}
            </span>
            <span className="text-xs font-bold text-slate-600 w-24 flex-shrink-0">
              {zone.name}
            </span>
            <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: zone.color }}
              />
            </div>
            <span className="text-[11px] font-bold text-slate-500 w-24 text-right flex-shrink-0">
              {formatDuration(data?.totalMs ?? 0)}
              <span className="text-slate-400 font-normal ml-1">
                {pct.toFixed(1)}%
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| MAIN
|--------------------------------------------------------------------------
*/

interface ActivityZoneChartProps {
  unifiedSeries: any[];
  activityDate: string;
  fcMax: number | null;
  ftp: number | null;
}

export default function ActivityZoneChart({
  unifiedSeries,
  activityDate,
  fcMax,
  ftp,
}: ActivityZoneChartProps) {
  const [tab, setTab] = useState<"hr" | "power">("hr");
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);

  /*
  |--------------------------------------------------------------------------
  | MÉTRIQUES DISPONIBLES
  |--------------------------------------------------------------------------
  */

  const availableMetrics = useMemo(() => ({
    hr:    unifiedSeries.some((d) => d.heartRate != null),
    power: unifiedSeries.some((d) => d.power != null),
  }), [unifiedSeries]);

  // Bascule auto sur power si pas de FC
  useEffect(() => {
    if (!availableMetrics.hr && availableMetrics.power) setTab("power");
  }, [availableMetrics]);

  const currentZones = tab === "hr" ? HR_ZONES : POWER_ZONES;
  const currentMetric: "heartRate" | "power" = tab === "hr" ? "heartRate" : "power";
  const currentRef = tab === "hr" ? fcMax : ftp;
  const refMissing = !currentRef;

  /*
  |--------------------------------------------------------------------------
  | SÉRIE DE BLOCS
  | On construit un dataset où chaque point a :
  |   - zoneId   : id de la zone (1-7)
  |   - zoneY    : hauteur normalisée du bloc (ZONE_HEIGHT[id])
  |   - color    : couleur de la zone
  |--------------------------------------------------------------------------
  */

  // Altitude normalisée dans l'espace [0, BLOCK_Y_MAX] pour cohabiter sur le même axe Y
  const altNormSeries = useMemo(() => {
    const altValues = unifiedSeries.map((d) => d.altitude).filter((v) => v != null);
    if (!altValues.length) return unifiedSeries.map((d) => ({ ...d, altNorm: null }));
    const altMin = Math.min(...altValues);
    const altMax = Math.max(...altValues);
    const range = altMax - altMin || 1;
    return unifiedSeries.map((d) => ({
      ...d,
      altNorm:
        d.altitude != null
          ? ((d.altitude - altMin) / range) * BLOCK_Y_MAX
          : null,
    }));
  }, [unifiedSeries]);

  const blockSeries = useMemo(() => {
    if (!currentRef) return altNormSeries;
    return altNormSeries.map((d) => {
      const val = d[currentMetric];
      if (val == null) return { ...d, zoneId: null, zoneY: 0, zoneColor: "transparent" };
      const zone = getZone(val, currentRef, currentZones);
      return {
        ...d,
        zoneId: zone.id,
        zoneY: ZONE_HEIGHT[zone.id] ?? 1,
        zoneColor: zone.color,
      };
    });
  }, [altNormSeries, currentRef, currentMetric, currentZones]);

  /*
  |--------------------------------------------------------------------------
  | SEGMENTS CONTIGUS PAR ZONE
  | On regroupe les points consécutifs de même zone en "blocs"
  | → chaque bloc = { zoneId, start, end, color }
  |--------------------------------------------------------------------------
  */

  const zoneSegments = useMemo(() => {
    const segments: { zoneId: number; start: number; end: number; color: string; height: number }[] = [];
    if (!blockSeries.length) return segments;

    let current = blockSeries[0];
    let segStart = current.index;

    for (let i = 1; i < blockSeries.length; i++) {
      const pt = blockSeries[i];
      if (pt.zoneId !== current.zoneId) {
        if (current.zoneId !== null) {
          segments.push({
            zoneId: current.zoneId,
            start: segStart,
            end: blockSeries[i - 1].index,
            color: current.zoneColor,
            height: current.zoneY,
          });
        }
        current = pt;
        segStart = pt.index;
      }
    }
    // Dernier segment
    if (current.zoneId !== null) {
      segments.push({
        zoneId: current.zoneId,
        start: segStart,
        end: blockSeries[blockSeries.length - 1].index,
        color: current.zoneColor,
        height: current.zoneY,
      });
    }
    return segments;
  }, [blockSeries]);

  /*
  |--------------------------------------------------------------------------
  | DISTRIBUTION TEMPS PAR ZONE
  |--------------------------------------------------------------------------
  */

  const distribution = useMemo(() => {
    return currentZones.map((zone) => {
      const count = blockSeries.filter((d) => d.zoneId === zone.id).length;
      return { zone, totalMs: count * 1000 };
    });
  }, [blockSeries, currentZones]);

  const totalMs = useMemo(
    () => distribution.reduce((acc, d) => acc + d.totalMs, 0),
    [distribution]
  );

  /*
  |--------------------------------------------------------------------------
  | SÉLECTION DE ZONE → STATS
  |--------------------------------------------------------------------------
  */

  const handleZoneClick = useCallback((id: number) => {
    setSelectedZoneId((prev) => (prev === id ? null : id));
  }, []);

  const selectedZone = useMemo(
    () => currentZones.find((z) => z.id === selectedZoneId) ?? null,
    [selectedZoneId, currentZones]
  );

  const zoneRangedData = useMemo(() => {
    if (selectedZoneId === null) return [];
    return unifiedSeries.filter((d) => {
      const val = d[currentMetric];
      if (val == null || !currentRef) return false;
      return getZone(val, currentRef, currentZones).id === selectedZoneId;
    });
  }, [selectedZoneId, unifiedSeries, currentMetric, currentRef, currentZones]);

  const zoneStats = useMemo(
    () => (zoneRangedData.length > 0 ? computeMetricStats(zoneRangedData, currentMetric) : null),
    [zoneRangedData, currentMetric]
  );

  const selectedDistrib = distribution.find((d) => d.zone.id === selectedZoneId);

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 shadow-sm space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <Activity size={14} />
          Analyse par zones
        </h3>

        <div className="flex gap-2">
          {availableMetrics.hr && (
            <button
              onClick={() => { setTab("hr"); setSelectedZoneId(null); }}
              className={`px-4 py-2 rounded-full border text-xs font-black uppercase tracking-wider transition-all ${
                tab === "hr"
                  ? "bg-red-500 border-red-500 text-white"
                  : "bg-white border-slate-300 text-slate-500"
              }`}
            >
              <Heart size={12} className="inline mr-1" />
              FC
            </button>
          )}
          {availableMetrics.power && (
            <button
              onClick={() => { setTab("power"); setSelectedZoneId(null); }}
              className={`px-4 py-2 rounded-full border text-xs font-black uppercase tracking-wider transition-all ${
                tab === "power"
                  ? "bg-amber-500 border-amber-500 text-white"
                  : "bg-white border-slate-300 text-slate-500"
              }`}
            >
              <Zap size={12} className="inline mr-1" />
              Puissance
            </button>
          )}
        </div>
      </div>

      {refMissing && (
        <div className="text-xs text-slate-400 bg-slate-50 rounded-xl p-4">
          {tab === "hr"
            ? "FC max non disponible — renseignez-la dans vos paramètres physiologiques."
            : "FTP non disponible — renseignez-le dans vos paramètres physiologiques."}
        </div>
      )}

      {!refMissing && (
        <>
          {/* ---------------------------------------------------------------- */}
          {/* GRAPHIQUE BLOCS + ALTITUDE EN FOND                               */}
          {/* ---------------------------------------------------------------- */}

          <div className="w-full h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={blockSeries}
                margin={{ top: 10, right: 10, left: -30, bottom: 0 }}
              >
                {/* Axe Y unique — domaine 0→BLOCK_Y_MAX, partagé altitude normalisée + blocs */}
                <YAxis
                  yAxisId="main"
                  domain={[0, BLOCK_Y_MAX]}
                  hide
                />

                <XAxis dataKey="index" hide />

                {/* Blocs de zones : un ReferenceArea par segment contigu */}
                {zoneSegments.map((seg, i) => (
                  <ReferenceArea
                    key={i}
                    yAxisId="main"
                    x1={seg.start}
                    x2={seg.end}
                    y1={0}
                    y2={seg.height}
                    fill={seg.color}
                    fillOpacity={
                      selectedZoneId === null
                        ? 0.75
                        : selectedZoneId === seg.zoneId
                        ? 0.9
                        : 0.2
                    }
                    stroke="none"
                  />
                ))}

                {/* Altitude normalisée en fond */}
                <Area
                  yAxisId="main"
                  type="monotone"
                  dataKey="altNorm"
                  fill="#e2e8f0"
                  stroke="#cbd5e1"
                  strokeWidth={1}
                  fillOpacity={0.45}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Légende référence */}
          <div className="text-[11px] text-slate-400 text-right -mt-2">
            {tab === "hr" ? `FC max : ${fcMax} bpm` : `FTP : ${ftp} W`}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* ZONE BARS                                                         */}
          {/* ---------------------------------------------------------------- */}

          <ZoneBars
            zones={currentZones}
            distribution={distribution}
            totalMs={totalMs}
            selectedZoneId={selectedZoneId}
            onZoneClick={handleZoneClick}
          />

          {/* ---------------------------------------------------------------- */}
          {/* STATS ZONE SÉLECTIONNÉE                                           */}
          {/* ---------------------------------------------------------------- */}

          {selectedZone && zoneStats && selectedDistrib && (
            <div
              className="rounded-2xl p-6 space-y-4 transition-all"
              style={{
                backgroundColor: selectedZone.color + "11",
                border: `1px solid ${selectedZone.color}44`,
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: selectedZone.color }}
                  >
                    {selectedZone.label} — {selectedZone.name}
                  </div>
                  <div className="text-sm font-bold text-slate-700 mt-0.5">
                    {Math.round(currentRef! * selectedZone.pctMin)}
                    {" – "}
                    {selectedZone.pctMax === 9999
                      ? "∞"
                      : Math.round(currentRef! * selectedZone.pctMax)}
                    {tab === "hr" ? " bpm" : " W"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest font-black text-slate-400">
                    Temps zone
                  </div>
                  <div className="text-sm font-bold text-slate-700 mt-0.5">
                    {formatDuration(selectedDistrib.totalMs)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniStat
                  label={tab === "hr" ? "FC Avg" : "Pwr Avg"}
                  value={zoneStats.avg.toFixed(0)}
                  unit={tab === "hr" ? "bpm" : "W"}
                />
                <MiniStat
                  label={tab === "hr" ? "FC Max" : "Pwr Max"}
                  value={zoneStats.max.toFixed(0)}
                  unit={tab === "hr" ? "bpm" : "W"}
                />
                <MiniStat
                  label={tab === "hr" ? "FC Min" : "Pwr Min"}
                  value={zoneStats.min.toFixed(0)}
                  unit={tab === "hr" ? "bpm" : "W"}
                />
                <MiniStat
                  label="Temps"
                  value={formatDuration(selectedDistrib.totalMs)}
                  unit=""
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}