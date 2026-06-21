"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Area } from "recharts";
import { Activity, Zap, Heart } from "lucide-react";
import { MiniStat } from "../../../UICores";
import { computeMetricStats } from "../utils/activityStats";


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

const ZONE_HEIGHT: Record<number, number> = { 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7 };
const BLOCK_Y_MAX = 7;
const CHART_H = 200;
const MARGIN = { top: 8, right: 8, left: 8, bottom: 0 };

interface Segment {
  zoneId: number;
  startIdx: number;
  endIdx: number;
  color: string;
  height: number;
  totalMs: number;
}


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


function ZoneBars({
  zones, distribution, totalMs, selectedZoneId, onZoneClick,
}: {
  zones: Zone[];
  distribution: { zone: Zone; totalMs: number }[];
  totalMs: number;
  selectedZoneId: number | null;
  onZoneClick: (id: number) => void;
}) {
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
            <span className="text-xs font-bold text-slate-600 w-24 flex-shrink-0">{zone.name}</span>
            <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: zone.color }}
              />
            </div>
            <span className="text-[11px] font-bold text-slate-500 w-24 text-right flex-shrink-0">
              {formatDuration(data?.totalMs ?? 0)}
              <span className="text-slate-400 font-normal ml-1">{pct.toFixed(1)}%</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}


export default function ActivityZoneChart({
  unifiedSeries,
  activityDate,
  fcMax,
  ftp,
}: {
  unifiedSeries: any[];
  activityDate: string;
  fcMax: number | null;
  ftp: number | null;
}) {
  const [tab, setTab] = useState<"hr" | "power">("hr");
  const [selectedSegIdx, setSelectedSegIdx] = useState<number | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [hoveredSegIdx, setHoveredSegIdx]   = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const [chartW, setChartW] = useState<number>(0);

  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const update = () => {
      if (el.clientWidth > 0) setChartW(el.clientWidth);
    };
    update();
    const t1 = setTimeout(update, 50);
    const t2 = setTimeout(update, 200);
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => { clearTimeout(t1); clearTimeout(t2); obs.disconnect(); };
  }, [fcMax, ftp]);

  const availableMetrics = useMemo(() => ({
    hr:    unifiedSeries.some((d) => d.heartRate != null),
    power: unifiedSeries.some((d) => d.power != null),
  }), [unifiedSeries]);

  useEffect(() => {
    if (!availableMetrics.hr && availableMetrics.power) setTab("power");
  }, [availableMetrics]);

  const currentZones  = tab === "hr" ? HR_ZONES : POWER_ZONES;
  const currentMetric = (tab === "hr" ? "heartRate" : "power") as "heartRate" | "power";
  const currentRef    = tab === "hr" ? fcMax : ftp;
  const refMissing    = !currentRef;

  const altNormSeries = useMemo(() => {
    const vals = unifiedSeries.map((d) => d.altitude).filter((v) => v != null);
    if (!vals.length) return unifiedSeries.map((d) => ({ ...d, altNorm: null }));
    const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
    return unifiedSeries.map((d) => ({
      ...d,
      altNorm: d.altitude != null ? ((d.altitude - min) / range) * BLOCK_Y_MAX : null,
    }));
  }, [unifiedSeries]);

  const blockSeries = useMemo(() => {
    if (!currentRef) return altNormSeries.map((d) => ({ ...d, zoneId: null, zoneHeight: 0, zoneColor: "transparent" }));
    return altNormSeries.map((d) => {
      const val = d[currentMetric];
      if (val == null) return { ...d, zoneId: null, zoneHeight: 0, zoneColor: "transparent" };
      const zone = getZone(val, currentRef, currentZones);
      return { ...d, zoneId: zone.id, zoneHeight: ZONE_HEIGHT[zone.id] ?? 1, zoneColor: zone.color };
    });
  }, [altNormSeries, currentRef, currentMetric, currentZones]);


  const zoneSegments: Segment[] = useMemo(() => {
    const segs: Segment[] = [];
    if (!blockSeries.length) return segs;
    let cur = blockSeries[0], segStart = 0, count = 1;
    for (let i = 1; i < blockSeries.length; i++) {
      if (blockSeries[i].zoneId !== cur.zoneId) {
        if (cur.zoneId !== null) {
          segs.push({ zoneId: cur.zoneId, startIdx: segStart, endIdx: i - 1, color: cur.zoneColor, height: cur.zoneHeight, totalMs: count * 1000 });
        }
        cur = blockSeries[i]; segStart = i; count = 1;
      } else { count++; }
    }
    if (cur.zoneId !== null) {
      segs.push({ zoneId: cur.zoneId, startIdx: segStart, endIdx: blockSeries.length - 1, color: cur.zoneColor, height: cur.zoneHeight, totalMs: count * 1000 });
    }
    return segs;
  }, [blockSeries]);

  const distribution = useMemo(() =>
    currentZones.map((zone) => ({
      zone,
      totalMs: blockSeries.filter((d) => d.zoneId === zone.id).length * 1000,
    })),
    [blockSeries, currentZones]
  );

  const totalMs = useMemo(
    () => distribution.reduce((acc, d) => acc + d.totalMs, 0),
    [distribution]
  );

  const handleSegmentClick = useCallback((segIdx: number) => {
    setSelectedZoneId(null);
    setSelectedSegIdx((prev) => (prev === segIdx ? null : segIdx));
  }, []);

  const handleZoneBarClick = useCallback((zoneId: number) => {
    setSelectedSegIdx(null);
    setSelectedZoneId((prev) => (prev === zoneId ? null : zoneId));
  }, []);

  const handleSegmentEnter = useCallback((idx: number, x: number, y: number) => {
    setHoveredSegIdx(idx);
    setTooltip({ x, y });
  }, []);

  const handleSegmentLeave = useCallback(() => {
    setHoveredSegIdx(null);
    setTooltip(null);
  }, []);

  const selectedSeg  = selectedSegIdx !== null ? zoneSegments[selectedSegIdx] ?? null : null;
  const selectedZone = selectedSeg ? currentZones.find((z) => z.id === selectedSeg.zoneId) ?? null : null;

  const segRangedData = useMemo(() => {
    if (!selectedSeg) return [];
    return blockSeries.slice(selectedSeg.startIdx, selectedSeg.endIdx + 1);
  }, [selectedSeg, blockSeries]);

  const segStats = useMemo(
    () => segRangedData.length > 0 ? computeMetricStats(segRangedData, currentMetric) : null,
    [segRangedData, currentMetric]
  );

  const hoveredSeg  = hoveredSegIdx !== null ? zoneSegments[hoveredSegIdx] ?? null : null;
  const hoveredZone = hoveredSeg ? currentZones.find((z) => z.id === hoveredSeg.zoneId) ?? null : null;

  return (
    <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 shadow-sm space-y-6">

      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <Activity size={14} />Analyse par zones
        </h3>
        <div className="flex gap-2">
          {availableMetrics.hr && (
            <button
              onClick={() => { setTab("hr"); setSelectedSegIdx(null); setSelectedZoneId(null); }}
              className={`px-4 py-2 rounded-full border text-xs font-black uppercase tracking-wider transition-all ${tab === "hr" ? "bg-red-500 border-red-500 text-white" : "bg-white border-slate-300 text-slate-500"}`}
            >
              <Heart size={12} className="inline mr-1" />FC
            </button>
          )}
          {availableMetrics.power && (
            <button
              onClick={() => { setTab("power"); setSelectedSegIdx(null); setSelectedZoneId(null); }}
              className={`px-4 py-2 rounded-full border text-xs font-black uppercase tracking-wider transition-all ${tab === "power" ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-slate-300 text-slate-500"}`}
            >
              <Zap size={12} className="inline mr-1" />Puissance
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

      <div
        ref={chartRef}
        className="relative w-full overflow-hidden"
        style={{
          height: refMissing ? 1 : CHART_H,
          visibility: refMissing ? "hidden" : "visible",
        }}
      >
        {!refMissing && (
          <>
            <svg
              className="absolute inset-0 z-10"
              width="100%"
              height="100%"
              style={{ pointerEvents: "none" }}
            >
              {chartW > 0 && zoneSegments.map((seg, i) => {
                const n     = blockSeries.length;
                const plotW = chartW - MARGIN.left - MARGIN.right;
                const plotH = CHART_H  - MARGIN.top  - MARGIN.bottom;
                const x1    = MARGIN.left + (seg.startIdx / Math.max(n - 1, 1)) * plotW;
                const x2    = MARGIN.left + (seg.endIdx   / Math.max(n - 1, 1)) * plotW;
                const yT    = MARGIN.top  + plotH - (seg.height / BLOCK_Y_MAX) * plotH;
                const yB    = MARGIN.top  + plotH;

                const isHovered      = hoveredSegIdx === i;
                const isSelectedSeg  = selectedSegIdx === i;
                const isSelectedZone = selectedZoneId === seg.zoneId;
                const isSelected     = isSelectedSeg || isSelectedZone;
                const isDimmed       =
                  (selectedSegIdx !== null && selectedZoneId === null && !isSelectedSeg) ||
                  (selectedZoneId !== null && selectedSegIdx === null && !isSelectedZone);

                return (
                  <rect
                    key={i}
                    x={x1}
                    y={yT}
                    width={Math.max(1, x2 - x1)}
                    height={Math.max(1, yB - yT)}
                    fill={seg.color}
                    fillOpacity={isDimmed ? 0.12 : isSelected ? 0.95 : isHovered ? 1 : 0.75}
                    stroke={isSelected || isHovered ? seg.color : "none"}
                    strokeWidth={isSelectedSeg ? 2.5 : 1.5}
                    style={{ cursor: "pointer", pointerEvents: "all" }}
                    onMouseEnter={(e) => {
                      const r = chartRef.current?.getBoundingClientRect();
                      handleSegmentEnter(i, e.clientX - (r?.left ?? 0), e.clientY - (r?.top ?? 0));
                    }}
                    onMouseLeave={handleSegmentLeave}
                    onClick={() => handleSegmentClick(i)}
                  />
                );
              })}
            </svg>

            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={blockSeries} margin={MARGIN}>
                <YAxis yAxisId="main" domain={[0, BLOCK_Y_MAX]} hide />
                <XAxis dataKey="index" hide />
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

            {hoveredSeg && hoveredZone && tooltip && (
              <div
                className="absolute pointer-events-none z-20 rounded-xl px-3 py-2.5 shadow-lg"
                style={{
                  left: tooltip.x + 14,
                  top: Math.max(tooltip.y - 55, 4),
                  backgroundColor: "white",
                  border: `2px solid ${hoveredZone.color}`,
                  transform: tooltip.x > 220 ? "translateX(-110%)" : "none",
                }}
              >
                <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: hoveredZone.color }}>
                  {hoveredZone.label} — {hoveredZone.name}
                </div>
                <div className="text-sm font-bold text-slate-700">{formatDuration(hoveredSeg.totalMs)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {Math.round(currentRef! * hoveredZone.pctMin)}
                  {" – "}
                  {hoveredZone.pctMax === 9999 ? "∞" : Math.round(currentRef! * hoveredZone.pctMax)}
                  {tab === "hr" ? " bpm" : " W"}
                </div>
                <div className="text-[10px] text-slate-300 mt-1 italic">clic pour sélectionner</div>
              </div>
            )}
          </>
        )}
      </div>

      {!refMissing && (
        <>
          <div className="text-[11px] text-slate-400 text-right -mt-2">
            {tab === "hr" ? `FC max : ${fcMax} bpm` : `FTP : ${ftp} W`}
          </div>

          <ZoneBars
            zones={currentZones}
            distribution={distribution}
            totalMs={totalMs}
            selectedZoneId={selectedZoneId}
            onZoneClick={handleZoneBarClick}
          />


          {selectedSeg && selectedZone && segStats ? (
            <div
              className="rounded-2xl p-6 space-y-4 transition-all"
              style={{ backgroundColor: selectedZone.color + "11", border: `1px solid ${selectedZone.color}44` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: selectedZone.color }}>
                    {selectedZone.label} — {selectedZone.name} · segment
                  </div>
                  <div className="text-sm font-bold text-slate-700 mt-0.5">
                    {Math.round(currentRef! * selectedZone.pctMin)}
                    {" – "}
                    {selectedZone.pctMax === 9999 ? "∞" : Math.round(currentRef! * selectedZone.pctMax)}
                    {tab === "hr" ? " bpm" : " W"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest font-black text-slate-400">Durée segment</div>
                  <div className="text-sm font-bold text-slate-700 mt-0.5">{formatDuration(selectedSeg.totalMs)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniStat label={tab === "hr" ? "FC Avg" : "Pwr Avg"} value={segStats.avg.toFixed(0)} unit={tab === "hr" ? "bpm" : "W"} />
                <MiniStat label={tab === "hr" ? "FC Max" : "Pwr Max"} value={segStats.max.toFixed(0)} unit={tab === "hr" ? "bpm" : "W"} />
                <MiniStat label={tab === "hr" ? "FC Min" : "Pwr Min"} value={segStats.min.toFixed(0)} unit={tab === "hr" ? "bpm" : "W"} />
                <MiniStat label="Durée" value={formatDuration(selectedSeg.totalMs)} unit="" />
              </div>
            </div>

          ) : selectedZoneId !== null ? (() => {
            const zone      = currentZones.find((z) => z.id === selectedZoneId)!;
            const zoneDist  = distribution.find((d) => d.zone.id === selectedZoneId);
            const zoneData  = blockSeries.filter((d) => d.zoneId === selectedZoneId);
            const zStats    = zoneData.length > 0 ? computeMetricStats(zoneData, currentMetric) : null;
            return (
              <div
                className="rounded-2xl p-6 space-y-4 transition-all"
                style={{ backgroundColor: zone.color + "11", border: `1px solid ${zone.color}44` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: zone.color }}>
                      {zone.label} — {zone.name} · tous les blocs
                    </div>
                    <div className="text-sm font-bold text-slate-700 mt-0.5">
                      {Math.round(currentRef! * zone.pctMin)}
                      {" – "}
                      {zone.pctMax === 9999 ? "∞" : Math.round(currentRef! * zone.pctMax)}
                      {tab === "hr" ? " bpm" : " W"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest font-black text-slate-400">Temps total</div>
                    <div className="text-sm font-bold text-slate-700 mt-0.5">{formatDuration(zoneDist?.totalMs ?? 0)}</div>
                  </div>
                </div>
                {zStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MiniStat label={tab === "hr" ? "FC Avg" : "Pwr Avg"} value={zStats.avg.toFixed(0)} unit={tab === "hr" ? "bpm" : "W"} />
                    <MiniStat label={tab === "hr" ? "FC Max" : "Pwr Max"} value={zStats.max.toFixed(0)} unit={tab === "hr" ? "bpm" : "W"} />
                    <MiniStat label={tab === "hr" ? "FC Min" : "Pwr Min"} value={zStats.min.toFixed(0)} unit={tab === "hr" ? "bpm" : "W"} />
                    <MiniStat label="Temps zone" value={formatDuration(zoneDist?.totalMs ?? 0)} unit="" />
                  </div>
                )}
              </div>
            );
          })() : (
            <div className="rounded-2xl p-6 space-y-4 bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Vue globale — {tab === "hr" ? "Fréquence cardiaque" : "Puissance"}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {distribution.filter((d) => d.totalMs > 0).map((d) => (
                  <button
                    key={d.zone.id}
                    onClick={() => handleZoneBarClick(d.zone.id)}
                    className="flex flex-col items-start p-3 rounded-xl transition-all hover:scale-[1.02]"
                    style={{ backgroundColor: d.zone.color + "15", border: `1px solid ${d.zone.color}44` }}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: d.zone.color }}>{d.zone.label}</span>
                    <span className="text-sm font-black text-slate-700 mt-1">{formatDuration(d.totalMs)}</span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      {totalMs > 0 ? ((d.totalMs / totalMs) * 100).toFixed(1) : "0"}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}