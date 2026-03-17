import prisma from "../../utils/prisma";

export async function GetAllTraining(userId:string) {
    const req = await prisma.plannedWorkout.findMany({
        where : {userId}
    })
    return req
}