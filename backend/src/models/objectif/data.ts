import prisma from "../../utils/prisma";

async function syncGoalRecords(userId: string, targets: { metricId: string }[]) {
  for (const target of targets) {
    const metric = await prisma.metric.findUnique({ 
      where: { id: target.metricId } 
    });

    if (!metric) continue;

    let recordValue = 0;

    // 1. MAPPING DES CLÉS (Vérifie que tes clés Metric correspondent à gauche)
    const detailMapping: Record<string, string> = {
  "max_watts": "maxWatts",
  "avg_watts": "avgWatts",
  "max_hr": "maxHeartrate",
  "avg_hr": "avgHeartrate",
  "max_altitude": "elevHigh", 
};

// 2. Mapping pour la table PARENT (Volume & Dénivelé cumulé)
const parentMapping: Record<string, string> = {
  "longest_ride": "distance",
  "distance": "distance",
  "max_elevation": "totalElevationGain", 
  "elevation": "totalElevationGain",
};
    // 2. LOGIQUE DE CALCUL
    if (metric.key in detailMapping) {
      const field = detailMapping[metric.key] as string;
      const aggregate = await prisma.stravaActivityDetail.aggregate({
        where: { activity: { stravaProfile: { userId: userId } } },
        _max: { [field]: true } as any
      });
      recordValue = Number((aggregate._max as any)[field]) || 0;

    } else if (metric.key in parentMapping) {
      const field = parentMapping[metric.key] as string;
      
      // CETTE REQUÊTE VA MAINTENANT APPARAÎTRE DANS TES LOGS
      const aggregate = await prisma.stravaRecentActivityBike.aggregate({
        where: { stravaProfile: { userId: userId } },
        _max: { [field]: true } as any
      });
      
      recordValue = Number((aggregate._max as any)[field]) || 0;
    } else {
      console.log(`⚠️ La clé "${metric.key}" n'est dans aucun mapping. Valeur forcée à 0.`);
    }

    // 3. UPSERT DANS LE CACHE
    console.log(`✅ Update ${metric.key} pour l'user ${userId} avec la valeur : ${recordValue}`);

    await prisma.computedMetric.upsert({
      where: {
        userId_metricKey_period: {
          userId,
          metricKey: metric.key,
          period: "all_time"
        }
      },
      update: { value: recordValue, updatedAt: new Date() },
      create: {
        userId,
        metricKey: metric.key,
        value: recordValue,
        period: "all_time"
      }
    });
  }
}

export async function UpsertGoal(
  id: string | null | undefined,
  userId: string,
  data: {
    type: string
    name: string | null
    startDate: Date | null
    endDate: Date | null
    targets: {
      metricId: string
      targetValue: number
    }[]
  }
) {
  let goal;

  if (id) {
    goal = await prisma.goal.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        startDate: data.startDate ?? new Date(),
        endDate: data.endDate,
        targets: {
          deleteMany: {},
          create: data.targets.map(t => ({
            metricId: t.metricId,
            targetValue: t.targetValue
          }))
        }
      }
    });
  } else {
    goal = await prisma.goal.create({
      data: {
        userId,
        name: data.name,
        type: data.type,
        startDate: data.startDate ?? new Date(),
        endDate: data.endDate,
        targets: {
          create: data.targets.map(t => ({
            metricId: t.metricId,
            targetValue: t.targetValue
          }))
        }
      }
    });
  }

  // --- SYNCHRONISATION DES RECORDS ---
  await syncGoalRecords(userId, data.targets);

  return goal;
}