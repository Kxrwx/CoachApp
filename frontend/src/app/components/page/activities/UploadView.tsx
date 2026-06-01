"use client";

import React, { useState, useCallback } from "react";

import ActivityOverview from "./sections/ActivityOverview";
import ActivityProfileChart from "./sections/ActivityProfileChart";
import ActivityRangeStats from "./sections/ActivityRangeStats";

import { useActivityAnalysis } from "./hooks/useActivityAnalysis";

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
  const [selection, setSelection] = useState<{
    startIndex: number | null;
    endIndex: number | null;
  }>({
    startIndex: null,
    endIndex: null,
  });

  // Adaptateur : reçoit (start, end) et construit l'objet attendu par le state
  const handleSelectionChange = useCallback(
    (start: number, end: number) => {
      setSelection({ startIndex: start, endIndex: end });
    },
    []
  );

  const handleResetSelection = useCallback(() => {
    setSelection({ startIndex: null, endIndex: null });
  }, []);

  const {
    unifiedSeries,
    availableMetrics,
    rangedData,
    speedStats,
    heartStats,
    cadenceStats,
    powerStats,
  } = useActivityAnalysis(records, selection);

  const isRangeActive =
    selection.startIndex !== null && selection.endIndex !== null;

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
    </div>
  );
}