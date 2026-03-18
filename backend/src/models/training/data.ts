import prisma from "../../utils/prisma";
import { v4 as uuidv4 } from "uuid"; 

export async function UpsertTraining(
  id: string | undefined | null,
  userId: string,
  title: string,
  description: string | null,
  type: string,
  duration: number,
  distance: number | null,
  intensity: string | null,
  startDate: Date,
  startTime: string | null,
  isRecurring: boolean,
  rrule: string | null,
  endDate: Date | null
) {
  const finalId = id || uuidv4();

  return await prisma.plannedWorkout.upsert({
    where: {
      id: finalId, 
    },
    update: {
      title,
      description,
      type,
      duration,
      distance,
      intensity,
      startDate,
      startTime,
      isRecurring,
      rrule,
      endDate,
    },
    create: {
      id: finalId,
      userId,
      title,
      description,
      type,
      duration,
      distance,
      intensity,
      startDate,
      startTime,
      isRecurring,
      rrule,
      endDate,
    },
  });
}


export async function DeleteTraining(id: string) {
    const req = await prisma.plannedWorkout.delete({
        where : {id}
    })
    return req
    
}