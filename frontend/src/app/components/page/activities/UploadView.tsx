"use client";

import React, { useState } from "react";

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
  const [selection, setSelection] = useState<any>({
    startIndex: null,
    endIndex: null,
  });

  const {
    unifiedSeries,
    availableMetrics,
    rangedData,

    speedStats,
    heartStats,
    cadenceStats,
    powerStats,
  } = useActivityAnalysis(records, selection);

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
        onSelectionChange={setSelection}
        onResetSelection={() =>
          setSelection({
            startIndex: null,
            endIndex: null,
          })
        }
      />

      <ActivityRangeStats
        isRangeActive={
          selection.startIndex !== null &&
          selection.endIndex !== null
        }
        rangedData={rangedData}
        speedStats={speedStats}
        heartStats={heartStats}
        cadenceStats={cadenceStats}
        powerStats={powerStats}
      />
    </div>
  );
}