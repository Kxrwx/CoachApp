export function computeMetricStats(data: any[], key: string) {
  const values = data
    .map((d) => d[key])
    .filter(
      (v) =>
        v !== null &&
        v !== undefined &&
        !Number.isNaN(v)
    );

  if (!values.length) return null;

  const sorted = [...values].sort((a, b) => a - b);

  const sum = values.reduce((acc, cur) => acc + cur, 0);
  const avg = sum / values.length;

  const variance =
    values.reduce(
      (acc, val) => acc + Math.pow(val - avg, 2),
      0
    ) / values.length;

  const stdDev = Math.sqrt(variance);

  const getPercentile = (p: number) => {
    const idx = Math.ceil((p / 100) * sorted.length - 1);
    return sorted[Math.max(0, idx)];
  };

  const start = data[0]?.timestamp;
  const end = data[data.length - 1]?.timestamp;

  const durationMs =
    start && end
      ? new Date(end).getTime() - new Date(start).getTime()
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
}