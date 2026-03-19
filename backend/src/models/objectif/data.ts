import prisma from "../../utils/prisma"

export async function UpsertGoal(
  id: string | null,
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
  if (id) {
    return await prisma.goal.update({
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
    })
  }

  return await prisma.goal.create({
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
  })
}

