import prisma from "../../utils/prisma";

export async function GetAllDataStats(userId : string) {
    const req = prisma.userStrava.findUnique({
        where : {userId},
        include : { allTimeStats : true, yearlyStats : true, monthlyStats : true}
    })
    return req 
}   

export async function GetAllActivities(userId: string) {
    const data = await prisma.userStrava.findUnique({
        where: { userId },
        include: { recentActivities: true }
    });

    if (!data) return null;

    const serializedActivities = data.recentActivities.map(activity => ({
        ...activity,
        id: activity.id.toString()
    }));

    return { ...data, recentActivities: serializedActivities };
}