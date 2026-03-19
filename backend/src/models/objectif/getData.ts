import prisma from "../../utils/prisma";


export async function GetGoalAll(userId: string) {
  const goals = await prisma.goal.findMany({
    where: { userId },
    include: {
      targets: {
        include: {
          metric: {
            select: {
              id: true,
              key: true,
              unit: true
            }
          }
        }
      }
    }
  });

  const records = await prisma.computedMetric.findMany({
    where: { userId, period: "all_time" }
  });

  return goals.map(goal => ({
    ...goal,
    targets: goal.targets.map(target => ({
      ...target,
      currentValue: records.find(r => r.metricKey === target.metric.key)?.value || 0
    }))
  }));
}


export async function GetTemplates() {
    const req = await prisma.metric.findMany()
    return req
}
