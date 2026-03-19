import prisma from "../../utils/prisma";


export async function GetGoalAll(userId:string) {
    const req = await prisma.goal.findMany({
        where : {userId},
        include: {
            targets: {
                include: {
                    metric: {
                        select: {
                            key: true,
                            unit: true
                                 }
                            }
                        }
                    }
                }
        
    })
    return req
}

