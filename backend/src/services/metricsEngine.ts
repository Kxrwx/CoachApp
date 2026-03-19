// services/metricsEngine.ts
import prisma from "../utils/prisma";

export async function updateAllTimeRecord(userId: string, metricKey: string) {
  // 1. Lister toutes les sources de données
  // On récupère le max de chaque table existante
  
  const [stravaRecord, manualRecord] = await Promise.all([
    // Source Strava
    prisma.stravaActivityDetail.aggregate({
      where: { activity: { stravaProfile: { userId } } },
      _max: { [metricKey]: true } 
    }),
    // Source Future (ex: Manual/Garmin) - À adapter quand la table sera là
    /* prisma.otherActivity.aggregate({ ... }) */
    Promise.resolve({ _max: { [metricKey]: 0 } }) 
  ]);

  // 2. Prendre la valeur la plus haute parmi toutes les sources
  const maxValue = Math.max(
    Number(stravaRecord._max[metricKey as keyof typeof stravaRecord._max] || 0),
    Number(manualRecord._max[metricKey as any] || 0)
  );

  // 3. Update le cache central ComputedMetric
  return await prisma.computedMetric.upsert({
    where: {
      userId_metricKey_period: {
        userId,
        metricKey,
        period: "all_time",
      },
    },
    update: { value: maxValue },
    create: {
      userId,
      metricKey,
      value: maxValue,
      period: "all_time",
    },
  });
}