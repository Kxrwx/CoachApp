"use client";

import React, { useState, useCallback } from "react"; 

import ActivityOverview from "./sections/ActivityOverview";
import ActivityProfileChart from "./sections/ActivityProfileChart";
import ActivityRangeStats from "./sections/ActivityRangeStats";
import ActivityZoneChart from "./sections/ActivityZonesCharts";
import ActivityZoneDonut from "./sections/ActivityZoneDonut";

import { useActivityAnalysis } from "./hooks/useActivityAnalysis";
import { useZoneDistribution } from "./hooks/useZoneDistribution";

interface UploadViewProps {
  fitStats: any;
  charts: any;
  records: any[];
  activity: any;
  fcMaxFallback?: number | null; 
  ftpFallback?: number | null;   
}

export default function UploadView({
  fitStats,
  charts,
  records,
  activity,
  fcMaxFallback = null,
  ftpFallback = null,
}: UploadViewProps) {


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


  const {
    unifiedSeries,
    availableMetrics,
    rangedData,
    speedStats,
    heartStats,
    cadenceStats,
    powerStats,
  } = useActivityAnalysis(records, selection);

  const fcMax = activity?.physio?.maxHr ?? activity?.physio?.hrMax ?? fcMaxFallback;
  const ftp = activity?.physio?.ftp ?? ftpFallback;


  const { hrDistribution, powerDistribution, hrTotalMs, powerTotalMs } =
    useZoneDistribution(unifiedSeries, fcMax, ftp);


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