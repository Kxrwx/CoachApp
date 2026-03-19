import prisma from "../../utils/prisma";

async function syncGoalRecords(userId: string, targets: { metricId: string }[]) {
  const now = new Date();

  for (const target of targets) {
    const metric = await prisma.metric.findUnique({ 
      where: { id: target.metricId } 
    });

    if (!metric) continue;

    let recordValue = 0;

    const recordsMapping = {
      "longest_ride": "maxDistance",
      "max_elevation": "maxElevation",
      "max_watts": "maxWatts",
      "max_hr": "maxHeartrate",
      "max_cadence": "maxCadence"
    } as const; 

    const detailMapping = {
      "avg_watts": "avgWatts",
      "avg_hr": "avgHeartrate",
      "max_altitude": "elevHigh", 
    } as const;

    const parentMapping = {
      "distance": "distance",
      "elevation": "totalElevationGain",
    } as const;


    if (metric.key in recordsMapping) {
      const field = recordsMapping[metric.key as keyof typeof recordsMapping];
      const record = await prisma.stravaRecord.findFirst({
        where: { stravaProfile: { userId: userId } }
      });
      if (record) recordValue = Number(record[field as keyof typeof record]) || 0;
    } 


    else if (metric.key === "weekly_distance") {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); 
      
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0); 
      
      const aggregate = await prisma.stravaRecentActivityBike.aggregate({
        where: { 
          stravaProfile: { userId: userId },
          startDate: { gte: startOfWeek } 
        },
        _sum: { distance: true }
      });
      recordValue = Number(aggregate._sum.distance) || 0;
    }

    else if (metric.key === "monthly_distance") {
      const currentMonth = await prisma.stravaMonthlyStatsBike.findFirst({
        where: { 
          stravaProfile: { userId: userId },
          year: now.getFullYear(),
          month: now.getMonth() + 1
        }
      });
      recordValue = currentMonth?.distance || 0;
    }

    else if (metric.key === "yearly_distance") {
      const currentYear = await prisma.stravaYearlyStatsBike.findFirst({
        where: { 
          stravaProfile: { userId: userId },
          year: now.getFullYear()
        }
      });
      recordValue = currentYear?.distance || 0;
    }
    
    else if (metric.key in detailMapping) {
      const field = detailMapping[metric.key as keyof typeof detailMapping];
      const aggregate = await prisma.stravaActivityDetail.aggregate({
        where: { activity: { stravaProfile: { userId: userId } } },
        _max: { [field]: true } as any
      });
      const results = aggregate._max as Record<string, any>;
      recordValue = Number(results[field]) || 0;
    } 
    

    else if (metric.key in parentMapping) {
      const field = parentMapping[metric.key as keyof typeof parentMapping];
      const aggregate = await prisma.stravaRecentActivityBike.aggregate({
        where: { stravaProfile: { userId: userId } },
        _max: { [field]: true } as any
      });
      const results = aggregate._max as Record<string, any>;
      recordValue = Number(results[field]) || 0;
    }


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