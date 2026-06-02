import { useMemo } from "react";

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

function getZone(value: number, ref: number, zones: Zone[]): Zone {
  for (const z of zones) {
    if (value >= ref * z.pctMin && value < ref * z.pctMax) return z;
  }
  return zones[zones.length - 1];
}

export function useZoneDistribution(
  unifiedSeries: any[],
  fcMax: number | null,
  ftp: number | null
) {
  const hrDistribution = useMemo(() => {
    if (!fcMax) return [];
    return HR_ZONES.map((zone) => {
      const points = unifiedSeries.filter((d) => {
        if (d.heartRate == null) return false;
        return getZone(d.heartRate, fcMax, HR_ZONES).id === zone.id;
      });
      // Distance estimée : vitesse moyenne du segment × durée
      const distanceKm = points.reduce((acc, d) => {
        const speedKmh = d.speed ?? 0;
        return acc + speedKmh / 3600; // ~1s par point
      }, 0);
      return { zone, totalMs: points.length * 1000, distanceKm };
    });
  }, [unifiedSeries, fcMax]);

  const powerDistribution = useMemo(() => {
    if (!ftp) return [];
    return POWER_ZONES.map((zone) => {
      const points = unifiedSeries.filter((d) => {
        if (d.power == null) return false;
        return getZone(d.power, ftp, POWER_ZONES).id === zone.id;
      });
      const distanceKm = points.reduce((acc, d) => {
        const speedKmh = d.speed ?? 0;
        return acc + speedKmh / 3600;
      }, 0);
      return { zone, totalMs: points.length * 1000, distanceKm };
    });
  }, [unifiedSeries, ftp]);

  const hrTotalMs = useMemo(
    () => hrDistribution.reduce((acc, d) => acc + d.totalMs, 0),
    [hrDistribution]
  );

  const powerTotalMs = useMemo(
    () => powerDistribution.reduce((acc, d) => acc + d.totalMs, 0),
    [powerDistribution]
  );

  return { hrDistribution, powerDistribution, hrTotalMs, powerTotalMs };
}