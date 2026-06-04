"use client";

import { useMemo } from "react";
import { computeMetricStats } from "../utils/activityStats";
import { smoothAndFilterData } from "@/lib/utils";

export function useActivityAnalysis(records: any[], selection: any) {
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

        altitude: r.enhanced_altitude ?? r.altitude ?? null,

        speed: r.speed !== undefined ? r.speed * 3.6 : null,

        heartRate: r.heart_rate ?? null,
        cadence: r.cadence ?? null,
        power: r.power ?? null,
      }));

    return smoothAndFilterData(base, "speed", 20);
  }, [records]);

  /*
  |--------------------------------------------------------------------------
  | DATA DISPONIBLES
  |--------------------------------------------------------------------------
  */

  const availableMetrics = useMemo(() => {
    return {
      speed: unifiedSeries.some((d: any) => d.speed !== null),
      heartRate: unifiedSeries.some((d: any) => d.heartRate !== null),
      cadence: unifiedSeries.some((d: any) => d.cadence !== null),
      power: unifiedSeries.some((d: any) => d.power !== null),
    };
  }, [unifiedSeries]);

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
  | STATS
  |--------------------------------------------------------------------------
  */

  const speedStats = useMemo(
    () => computeMetricStats(rangedData, "speed"),
    [rangedData]
  );

  const heartStats = useMemo(
    () => computeMetricStats(rangedData, "heartRate"),
    [rangedData]
  );

  const cadenceStats = useMemo(
    () => computeMetricStats(rangedData, "cadence"),
    [rangedData]
  );

  const powerStats = useMemo(
    () => computeMetricStats(rangedData, "power"),
    [rangedData]
  );

  return {
    unifiedSeries,
    availableMetrics,
    rangedData,

    speedStats,
    heartStats,
    cadenceStats,
    powerStats,
  };
}