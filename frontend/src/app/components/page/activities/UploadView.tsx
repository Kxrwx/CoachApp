"use client";

import React, { useState, useCallback, useEffect } from "react";

import ActivityOverview from "./sections/ActivityOverview";
import ActivityProfileChart from "./sections/ActivityProfileChart";
import ActivityRangeStats from "./sections/ActivityRangeStats";
import ActivityZoneChart from "./sections/ActivityZonesCharts";
import ActivityZoneDonut from "./sections/ActivityZoneDonut";

import { useActivityAnalysis } from "./hooks/useActivityAnalysis";
import { useZoneDistribution } from "./hooks/useZoneDistribution";
import { api } from "@/lib/api";

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
  | SELECTION PLAGE
  |--------------------------------------------------------------------------
  */

  const [selection, setSelection] = useState<{
    startIndex: number | null;
    endIndex: number | null;
  }>({
    startIndex: null,
    endIndex: null,
  });

  const handleSelectionChange = useCallback((start: number, end: number) => {
    setSelection({ startIndex: start, endIndex: end });
  }, []);

  const handleResetSelection = useCallback(() => {
    setSelection({ startIndex: null, endIndex: null });
  }, []);

  const isRangeActive =
    selection.startIndex !== null && selection.endIndex !== null;

  /*
  |--------------------------------------------------------------------------
  | ANALYSE ACTIVITÉ
  |--------------------------------------------------------------------------
  */

  const {
    unifiedSeries,
    availableMetrics,
    rangedData,
    speedStats,
    heartStats,
    cadenceStats,
    powerStats,
  } = useActivityAnalysis(records, selection);

/*
|--------------------------------------------------------------------------
| PHYSIOLOGY 
|--------------------------------------------------------------------------
*/

// On initialise directement avec les données de l'activité enrichie par le parent
const [fcMax, setFcMax] = useState<number | null>(
  activity?.physio?.maxHr ?? activity?.physio?.hrMax ?? null
);
const [ftp, setFtp] = useState<number | null>(
  activity?.physio?.ftp ?? null
);

useEffect(() => {
  // Si le parent a bien transmis les données, on n'a pas besoin de refaire un fetch
  if (activity?.physio?.maxHr || activity?.physio?.ftp) {
    setFcMax(activity.physio.maxHr ?? activity.physio.hrMax);
    setFtp(activity.physio.ftp);
    return;
  }

  // Optionnel : Un fallback de sécurité UNIQUEMENT si les données sont absentes.
  // Attention : en mode Coach, il faudrait passer l'athleteId ici, sinon tu auras les datas du coach.
  async function fetchPhysiologyFallback() {
    try {
      // Remarque : adapter la route si besoin d'un fallback spécifique à l'athlète
      const res = await api("/physiology"); 
      if (res.ok) {
        const data = await res.json();
        setFcMax(data.maxHr ?? data.hrMax ?? null);
        setFtp(data.ftp ?? null);
      }
    } catch (e) {
      console.error("Physiology fetch error:", e);
    }
  }
  
  fetchPhysiologyFallback();
}, [activity]);

  /*
  |--------------------------------------------------------------------------
  | DISTRIBUTION ZONES (pour le donut)
  |--------------------------------------------------------------------------
  */

  const { hrDistribution, powerDistribution, hrTotalMs, powerTotalMs } =
    useZoneDistribution(unifiedSeries, fcMax, ftp);

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="space-y-6">
      <ActivityOverview
        fitStats={fitStats}
        activity={activity}
        availableMetrics={availableMetrics}
      />

      <ActivityProfileChart
        unifiedSeries={unifiedSeries}
        availableMetrics={availableMetrics}
        selection={selection}
        onSelectionChange={handleSelectionChange}
        onResetSelection={handleResetSelection}
      />

      <ActivityRangeStats
        isRangeActive={isRangeActive}
        rangedData={rangedData}
        speedStats={speedStats}
        heartStats={heartStats}
        cadenceStats={cadenceStats}
        powerStats={powerStats}
      />

      <ActivityZoneChart
        unifiedSeries={unifiedSeries}
        activityDate={activity.startDate}
        fcMax={fcMax}
        ftp={ftp}
      />

      <ActivityZoneDonut
        hrDistribution={hrDistribution}
        powerDistribution={powerDistribution}
        hrTotalMs={hrTotalMs}
        powerTotalMs={powerTotalMs}
        availableMetrics={{
          hr: availableMetrics.heartRate,
          power: availableMetrics.power,
        }}
        heartStats={heartStats}
        powerStats={powerStats}
      />
    </div>
  );
}