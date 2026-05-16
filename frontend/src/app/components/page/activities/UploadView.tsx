// app/activities/[id]/components/UploadView.tsx

"use client";

import React, {
  useMemo,
  useState,
  useCallback,
} from "react";

import {
  MapPin,
  Clock,
  Gauge,
  TrendingUp,
  Activity,
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
   | SELECTION RANGE
   |--------------------------------------------------------------------------
   */

  const [selection, setSelection] =
    useState<any>({
      refAreaLeft: "",
      refAreaRight: "",
      startIndex: null,
      endIndex: null,
    });

  const handleMouseDown = (
    e: any
  ) => {
    if (!e?.activeLabel) return;

    setSelection((prev: any) => ({
      ...prev,
      refAreaLeft: e.activeLabel,
    }));
  };

  const handleMouseMove = (
    e: any
  ) => {
    if (
      selection.refAreaLeft === "" ||
      !e?.activeLabel
    )
      return;

    setSelection((prev: any) => ({
      ...prev,
      refAreaRight: e.activeLabel,
    }));
  };

  const handleMouseUp = () => {
    if (
      selection.refAreaLeft === "" ||
      selection.refAreaRight === ""
    )
      return;

    const start = Math.min(
      selection.refAreaLeft,
      selection.refAreaRight
    );

    const end = Math.max(
      selection.refAreaLeft,
      selection.refAreaRight
    );

    setSelection({
      refAreaLeft: "",
      refAreaRight: "",
      startIndex: start,
      endIndex: end,
    });
  };

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
   | CALCUL STATS AMÉLIORÉ
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

      const sum = values.reduce(
        (acc, cur) => acc + cur,
        0
      );

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
        min: Math.min(...values),
        max: Math.max(...values),

        avg: sum / values.length,

        startTime: start,
        endTime: end,

        durationMs,

        samples: values.length,
      };
    },
    []
  );

  const speedStats = computeStats(
    rangedData,
    "speed"
  );

  const heartStats = computeStats(
    rangedData,
    "heartRate"
  );

  const cadenceStats = computeStats(
    rangedData,
    "cadence"
  );

  const powerStats = computeStats(
    rangedData,
    "power"
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
              <DataRow
                label="Puissance Max"
                value={`${fitStats.max_power} W`}
              />
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
              Géométrie
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
              label="Temps Total"
              value={formatDuration(
                fitStats.total_elapsed_time
              )}
            />

            <DataRow
              label="Laps"
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
              onMouseDown={
                handleMouseDown
              }
              onMouseMove={
                handleMouseMove
              }
              onMouseUp={
                handleMouseUp
              }
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

              {selection.refAreaLeft &&
                selection
                  .refAreaRight && (
                  <ReferenceArea
                    yAxisId="metric"
                    x1={
                      selection.refAreaLeft
                    }
                    x2={
                      selection.refAreaRight
                    }
                    strokeOpacity={
                      0.2
                    }
                  />
                )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* RANGE STATS */}
        {/* ------------------------------------------------------------------ */}

        <div className="mt-8">

          <div className="flex items-center justify-between mb-6">

            <div>
              <div className="text-[10px] uppercase tracking-widest font-black text-slate-400">
                Analyse plage sélectionnée
              </div>

              <div className="text-sm font-bold text-slate-800 mt-1">
                {selection.startIndex !==
                  null &&
                selection.endIndex !==
                  null
                  ? `${new Date(
                      rangedData[0]
                        ?.timestamp
                    ).toLocaleTimeString()} → ${new Date(
                      rangedData[
                        rangedData.length -
                          1
                      ]?.timestamp
                    ).toLocaleTimeString()}`
                  : "Aucune plage sélectionnée"}
              </div>
            </div>

            {speedStats && (
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest font-black text-slate-400">
                  Durée
                </div>

                <div className="text-sm font-bold text-slate-800 mt-1">
                  {formatSelectionDuration(
                    speedStats.durationMs
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