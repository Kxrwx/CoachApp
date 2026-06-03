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
  | PHYSIOLOGY (partagé entre ZoneChart et ZoneDonut)
  |--------------------------------------------------------------------------
  */

  const [fcMax, setFcMax] = useState<number | null>(null);
  const [ftp, setFtp] = useState<number | null>(null);

  const activityDate =
    activity?.startTime ??
    activity?.decodedFileData?.sessions?.[0]?.start_time ??
    new Date().toISOString();

  useEffect(() => {
    async function fetchPhysiology() {
      try {
        const actDate = new Date(activityDate);
        const diffDays = (Date.now() - actDate.getTime()) / 86400000;

        let data: any = null;

        if (diffDays > 30) {
          const res = await api("/physiology/month", {
            method: "POST",
            body: JSON.stringify({
              month: actDate.getMonth() + 1,
              year: actDate.getFullYear(),
            }),
          });
          if (res.ok) data = await res.json();
        }

        if (!data) {
          const res = await api("/physiology");
          if (res.ok) data = await res.json();
        }

        if (data) {
          setFcMax(data.maxHr ?? data.hrMax ?? null);
          setFtp(data.ftp ?? null);
        }
      } catch (e) {
        console.error("Physiology fetch error:", e);
      }
    }
    fetchPhysiology();
  }, [activityDate]);

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
        activityDate={activityDate}
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