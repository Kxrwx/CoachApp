// app/activities/[id]/components/UploadView.tsx

"use client";

import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";

import {
  MapPin,
  Clock,
  Gauge,
  TrendingUp,
  Activity,
  X,
  RotateCcw,
} from "lucide-react";

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

import {
  StatCard,
  DataRow,
  MiniStat,
  MetricChart,
} from "../../UICores";

import {
  formatDistance,
  formatDuration,
  formatFitSpeed,
  smoothAndFilterData,
} from "@/lib/utils";

interface UploadViewProps {
  fitStats: any;
  charts: any;
  records: any[];
  activity: any;
}

export default function UploadView({
  fitStats,
  charts,
  records,
  activity,
}: UploadViewProps) {
  /*
   |--------------------------------------------------------------------------
   | DATASET NORMALISÉ
   |--------------------------------------------------------------------------
   */

  const unifiedSeries = useMemo(() => {
    const base = records
      .filter((r: any) => r.timestamp)
      .map((r: any, index: number) => ({
        index,

        timestamp: r.timestamp,

        altitude:
          r.enhanced_altitude ??
          r.altitude ??
          null,

        speed:
          r.speed !== undefined
            ? r.speed * 3.6
            : null,

        heartRate:
          r.heart_rate ?? null,

        cadence:
          r.cadence ?? null,

        power:
          r.power ?? null,
      }));

    /*
     |--------------------------------------------------------------------------
     | LISSAGE GLOBAL
     |--------------------------------------------------------------------------
     */

    return smoothAndFilterData(
      base,
      "speed",
      20
    );
  }, [records]);

  /*
   |--------------------------------------------------------------------------
   | DATA DISPONIBLES
   |--------------------------------------------------------------------------
   */

  const availableMetrics = useMemo(() => {
    return {
      speed: unifiedSeries.some(
        (d: any) => d.speed !== null
      ),

      heartRate: unifiedSeries.some(
        (d: any) => d.heartRate !== null
      ),

      cadence: unifiedSeries.some(
        (d: any) => d.cadence !== null
      ),

      power: unifiedSeries.some(
        (d: any) => d.power !== null
      ),
    };
  }, [unifiedSeries]);

  /*
   |--------------------------------------------------------------------------
   | VISIBILITÉ DES MÉTRIQUES
   |--------------------------------------------------------------------------
   */

  const [visibleMetrics, setVisibleMetrics] =
    useState({
      speed: true,
      heartRate: true,
      cadence: true,
      power: true,
    });

  const toggleMetric = useCallback(
    (metric: string) => {
      setVisibleMetrics((prev: any) => ({
        ...prev,
        [metric]: !prev[metric],
      }));
    },
    []
  );

  /*
   |--------------------------------------------------------------------------
   | SELECTION RANGE (NOUVELLE MÉCANIQUE)
   |--------------------------------------------------------------------------
   */

  const [selection, setSelection] = useState<any>({
    startIndex: null,
    endIndex: null,
  });

  const totalDataPoints = unifiedSeries.length;

  const handleRangeChange = useCallback(
    (start: number, end: number) => {
      if (start >= end) return;
      setSelection({
        startIndex: start,
        endIndex: end,
      });
    },
    []
  );

  const handleResetSelection = useCallback(() => {
    setSelection({
      startIndex: null,
      endIndex: null,
    });
  }, []);

  const isRangeActive =
    selection.startIndex !== null &&
    selection.endIndex !== null;

  /*
   |--------------------------------------------------------------------------
   | RANGE DATA
   |--------------------------------------------------------------------------
   */

  const rangedData = useMemo(() => {
    if (
      selection.startIndex === null ||
      selection.endIndex === null
    ) {
      return unifiedSeries;
    }

    return unifiedSeries.slice(
      selection.startIndex,
      selection.endIndex + 1
    );
  }, [selection, unifiedSeries]);

  /*
   |--------------------------------------------------------------------------
   | CALCUL STATS AMÉLIORÉ (OPTIMISÉ)
   |--------------------------------------------------------------------------
   */

  const computeStats = useCallback(
    (data: any[], key: string) => {
      const values = data
        .map((d) => d[key])
        .filter(
          (v) =>
            v !== null &&
            v !== undefined &&
            !Number.isNaN(v)
        );

      if (!values.length) return null;

      // Tri une seule fois pour tous les calculs
      const sorted = [...values].sort(
        (a, b) => a - b
      );

      const sum = values.reduce(
        (acc, cur) => acc + cur,
        0
      );

      const avg = sum / values.length;

      // Calcul écart-type
      const variance =
        values.reduce(
          (acc, val) =>
            acc + Math.pow(val - avg, 2),
          0
        ) / values.length;

      const stdDev = Math.sqrt(variance);

      // Percentiles
      const getPercentile = (p: number) => {
        const idx = Math.ceil(
          (p / 100) * sorted.length - 1
        );
        return sorted[Math.max(0, idx)];
      };

      const start =
        data[0]?.timestamp;

      const end =
        data[data.length - 1]
          ?.timestamp;

      const durationMs =
        start && end
          ? new Date(end).getTime() -
            new Date(start).getTime()
          : 0;

      return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg,
        stdDev: Math.round(stdDev * 100) / 100,
        p5: getPercentile(5),
        p25: getPercentile(25),
        p75: getPercentile(75),
        p95: getPercentile(95),
        median: getPercentile(50),
        startTime: start,
        endTime: end,
        durationMs,
        samples: values.length,
        sum,
      };
    },
    []
  );

  const speedStats = useMemo(
    () => computeStats(rangedData, "speed"),
    [rangedData, computeStats]
  );

  const heartStats = useMemo(
    () => computeStats(rangedData, "heartRate"),
    [rangedData, computeStats]
  );

  const cadenceStats = useMemo(
    () => computeStats(rangedData, "cadence"),
    [rangedData, computeStats]
  );

  const powerStats = useMemo(
    () => computeStats(rangedData, "power"),
    [rangedData, computeStats]
  );

  /*
   |--------------------------------------------------------------------------
   | DATASETS CHARTS
   |--------------------------------------------------------------------------
   */

  const buildMetricDataset = (
    key: string
  ) => {
    return unifiedSeries
      .filter(
        (d: any) =>
          d[key] !== null
      )
      .map((d: any) => ({
        ...d,
        value: d[key],
      }));
  };

  const speedData =
    buildMetricDataset("speed");

  const heartData =
    buildMetricDataset("heartRate");

  const cadenceData =
    buildMetricDataset("cadence");

  const powerData =
    buildMetricDataset("power");

  const altitudeData =
    buildMetricDataset("altitude");

  /*
   |--------------------------------------------------------------------------
   | FORMATTERS
   |--------------------------------------------------------------------------
   */

  const formatSelectionDuration = (
    ms: number
  ) => {
    const totalSeconds = Math.floor(
      ms / 1000
    );

    const h = Math.floor(
      totalSeconds / 3600
    );

    const m = Math.floor(
      (totalSeconds % 3600) / 60
    );

    const s =
      totalSeconds % 60;

    return [
      h > 0
        ? String(h).padStart(2, "0")
        : null,

      String(m).padStart(2, "0"),

      String(s).padStart(2, "0"),
    ]
      .filter(Boolean)
      .join(":");
  };

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* ------------------------------------------------------------------ */}
      {/* HEADER */}
      {/* ------------------------------------------------------------------ */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<MapPin />}
          label="Distance"
          value={formatDistance(
            fitStats.total_distance
          )}
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
          value={formatFitSpeed(
            fitStats.avg_speed
          )}
          unit="km/h"
        />

        <StatCard
          icon={<TrendingUp />}
          label="Vitesse max"
          value={formatFitSpeed(
            fitStats.max_speed
          )}
          unit="km/h"
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* FIT INFOS */}
      {/* ------------------------------------------------------------------ */}

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
              value={`${fitStats.total_ascent?.toFixed(
                0
              )} m`}
            />

            <DataRow
              label="Descente"
              value={`${fitStats.total_descent?.toFixed(
                0
              )} m`}
            />

            <DataRow
              label="Temps Actif"
              value={formatDuration(
                fitStats.total_timer_time
              )}
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
                activity.decodedFileData?.laps
                  ?.length || "1"
              }
            />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* TOGGLES */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex flex-wrap gap-3">

        {availableMetrics.speed && (
          <button
            onClick={() =>
              toggleMetric("speed")
            }
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
            onClick={() =>
              toggleMetric(
                "heartRate"
              )
            }
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
            onClick={() =>
              toggleMetric(
                "cadence"
              )
            }
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
            onClick={() =>
              toggleMetric("power")
            }
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

      {/* ------------------------------------------------------------------ */}
      {/* MASTER CHART */}
      {/* ------------------------------------------------------------------ */}

      <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 shadow-sm">

        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
          Analyse Synchronisée
        </h3>

        <div className="w-full h-[440px]">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <ComposedChart
              data={unifiedSeries}
              syncId="activity-session"
              margin={{
                top: 10,
                right: 20,
                left: -15,
                bottom: 0,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                opacity={0.15}
                vertical={false}
              />

              <XAxis
                dataKey="index"
                hide
              />

              <YAxis
                yAxisId="alt"
                orientation="left"
                stroke="#94a3b8"
                domain={[
                  "dataMin - 10",
                  "dataMax + 10",
                ]}
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
                  boxShadow:
                    "0 4px 12px rgba(0,0,0,0.08)",
                }}
              />

              <Area
                yAxisId="alt"
                type="monotone"
                dataKey="altitude"
                fill="#e2e8f0"
                stroke="none"
                isAnimationActive={
                  false
                }
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
                  isAnimationActive={
                    false
                  }
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
                  isAnimationActive={
                    false
                  }
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
                  isAnimationActive={
                    false
                  }
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
                  isAnimationActive={
                    false
                  }
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
                    x={selection.startIndex}
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    strokeDasharray="none"
                  />
                  <ReferenceLine
                    x={selection.endIndex}
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    strokeDasharray="none"
                  />
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
              {/* Single Range Slider */}
              <div className="flex-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-3">
                  Sélectionner une plage
                </label>
                
                {/* Custom range container */}
                <div className="relative h-8 flex items-center">
                  {/* Track background */}
                  <div className="absolute w-full h-2 bg-slate-300 rounded-full" />
                  
                  {/* Progress track */}
                  {isRangeActive && (
                    <div
                      className="absolute h-2 bg-indigo-500 rounded-full"
                      style={{
                        left: `${(selection.startIndex / totalDataPoints) * 100}%`,
                        right: `${100 - (selection.endIndex / totalDataPoints) * 100}%`,
                      }}
                    />
                  )}

                  {/* Start slider */}
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, totalDataPoints - 1)}
                    value={selection.startIndex ?? 0}
                    onChange={(e) => {
                      const start = parseInt(
                        e.target.value
                      );
                      const end =
                        selection.endIndex ??
                        totalDataPoints - 1;
                      if (start < end) {
                        handleRangeChange(
                          start,
                          end
                        );
                      }
                    }}
                    className="absolute w-full h-2 top-3 appearance-none bg-transparent rounded-full cursor-pointer z-5 pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-indigo-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
                  />

                  {/* End slider */}
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, totalDataPoints - 1)}
                    value={
                      selection.endIndex ??
                      totalDataPoints - 1
                    }
                    onChange={(e) => {
                      const end = parseInt(
                        e.target.value
                      );
                      const start =
                        selection.startIndex ?? 0;
                      if (start < end) {
                        handleRangeChange(
                          start,
                          end
                        );
                      }
                    }}
                    className="absolute w-full h-2 top-3 appearance-none bg-transparent rounded-full cursor-pointer z-5 pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-indigo-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
                  />
                </div>

                {/* Info labels */}
                {isRangeActive && (
                  <div className="flex justify-between mt-3 text-[11px] text-slate-500">
                    <span>
                      {selection.startIndex}
                    </span>
                    <span>
                      {totalDataPoints -
                        selection.endIndex +
                        selection.startIndex}{" "}
                      pts (
                      {(
                        ((totalDataPoints -
                          selection.endIndex +
                          selection.startIndex) /
                          totalDataPoints) *
                        100
                      ).toFixed(1)}
                      %)
                    </span>
                    <span>
                      {selection.endIndex}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {isRangeActive && (
                  <button
                    onClick={
                      handleResetSelection
                    }
                    className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors"
                    title="Enlever la sélection"
                  >
                    <X size={16} />
                  </button>
                )}
                <button
                  onClick={
                    handleResetSelection
                  }
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                  title="Réinitialiser"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* RANGE STATS */}
        {/* ------------------------------------------------------------------ */}

        <div className="mt-8">

          <div className="flex items-center justify-between mb-6">

            <div>
              <div className="text-[10px] uppercase tracking-widest font-black text-slate-400">
                {isRangeActive
                  ? "Analyse plage sélectionnée"
                  : "Analyse complète"}
              </div>

              <div className="text-sm font-bold text-slate-800 mt-1">
                {isRangeActive
                  ? `${new Date(
                      rangedData[0]
                        ?.timestamp
                    ).toLocaleTimeString()} → ${new Date(
                      rangedData[
                        rangedData.length -
                          1
                      ]?.timestamp
                    ).toLocaleTimeString()}`
                  : "Données complètes"}
              </div>
            </div>

            {(speedStats ||
              heartStats ||
              cadenceStats ||
              powerStats) && (
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest font-black text-slate-400">
                  Durée
                </div>

                <div className="text-sm font-bold text-slate-800 mt-1">
                  {formatSelectionDuration(
                    speedStats?.durationMs ||
                      0
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            {speedStats && (
              <>
                <MiniStat
                  label="Vit Avg"
                  value={speedStats.avg.toFixed(
                    1
                  )}
                  unit="km/h"
                />

                <MiniStat
                  label="Vit Max"
                  value={speedStats.max.toFixed(
                    1
                  )}
                  unit="km/h"
                />

                <MiniStat
                  label="Vit Min"
                  value={speedStats.min.toFixed(
                    1
                  )}
                  unit="km/h"
                />

                <MiniStat
                  label="Vit σ"
                  value={speedStats.stdDev.toFixed(
                    1
                  )}
                  unit="km/h"
                />
              </>
            )}

            {heartStats && (
              <>
                <MiniStat
                  label="FC Avg"
                  value={heartStats.avg.toFixed(
                    0
                  )}
                  unit="bpm"
                />

                <MiniStat
                  label="FC Max"
                  value={heartStats.max.toFixed(
                    0
                  )}
                  unit="bpm"
                />

                <MiniStat
                  label="FC Min"
                  value={heartStats.min.toFixed(
                    0
                  )}
                  unit="bpm"
                />

                <MiniStat
                  label="FC Med"
                  value={heartStats.median?.toFixed(
                    0
                  )}
                  unit="bpm"
                />
              </>
            )}

            {cadenceStats && (
              <>
                <MiniStat
                  label="RPM Avg"
                  value={cadenceStats.avg.toFixed(
                    0
                  )}
                  unit="rpm"
                />

                <MiniStat
                  label="RPM Max"
                  value={cadenceStats.max.toFixed(
                    0
                  )}
                  unit="rpm"
                />

                <MiniStat
                  label="RPM Min"
                  value={cadenceStats.min.toFixed(
                    0
                  )}
                  unit="rpm"
                />

                <MiniStat
                  label="RPM P95"
                  value={cadenceStats.p95?.toFixed(
                    0
                  )}
                  unit="rpm"
                />
              </>
            )}

            {powerStats && (
              <>
                <MiniStat
                  label="Pwr Avg"
                  value={powerStats.avg.toFixed(
                    0
                  )}
                  unit="W"
                />

                <MiniStat
                  label="Pwr Max"
                  value={powerStats.max.toFixed(
                    0
                  )}
                  unit="W"
                />

                <MiniStat
                  label="Pwr Min"
                  value={powerStats.min.toFixed(
                    0
                  )}
                  unit="W"
                />

                <MiniStat
                  label="Pwr Tot"
                  value={
                    powerStats &&
                    speedStats
                      ? (
                          (powerStats.sum *
                            speedStats
                              .durationMs) /
                          3600000
                        ).toFixed(0)
                      : "—"
                  }
                  unit="kJ"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* CHARTS SÉPARÉS */}
      {/* ------------------------------------------------------------------ */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {availableMetrics.speed && (
          <MetricChart
            title="Vitesse Lissée (km/h)"
            data={speedData}
            dataKey="value"
            color="#6366f1"
            syncId="activity-session"
          />
        )}

        {availableMetrics.heartRate && (
          <MetricChart
            title="Fréquence Cardiaque (bpm)"
            data={heartData}
            dataKey="value"
            color="#ef4444"
            syncId="activity-session"
          />
        )}

        {availableMetrics.cadence && (
          <MetricChart
            title="Cadence (rpm)"
            data={cadenceData}
            dataKey="value"
            color="#10b981"
            syncId="activity-session"
          />
        )}

        {availableMetrics.power && (
          <MetricChart
            title="Puissance (W)"
            data={powerData}
            dataKey="value"
            color="#f59e0b"
            syncId="activity-session"
          />
        )}

        <MetricChart
          title="Altitude (m)"
          data={altitudeData}
          dataKey="value"
          color="#94a3b8"
          syncId="activity-session"
        />
      </div>
    </div>
  );
}