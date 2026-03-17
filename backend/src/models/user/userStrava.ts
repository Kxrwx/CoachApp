import prisma from "../../utils/prisma";

export async function upsertAuthStrava(userId: string, athlete: any, accessToken: string, refreshToken: string, expiresAt: number, IncomingScope: string) {
    const stravaId = String(athlete.id);
    return await prisma.userAuthStrava.upsert({
        where: { userId },
        update: {
            stravaAthleteId: stravaId,
            accessToken,
            refreshToken,
            expiresAt,
            scope: IncomingScope,
            updatedAt: new Date()
        },
        create: {
            userId,
            stravaAthleteId: stravaId,
            accessToken,
            refreshToken,
            expiresAt,
            scope: IncomingScope
        }
    });
}

export async function upsertUserStrava(id: number, userId: string, firstname: string, lastname: string, profilePicture: string, city: string, state: string, country: string, sex: string) {
    return await prisma.userStrava.upsert({
        where: { id },
        update: {
            userId, 
            firstname,
            lastname,
            profilePicture,
            city,
            state,
            country,
            sex,
            syncedAt: new Date()
        },
        create: {
            id,
            userId,
            firstname,
            lastname,
            profilePicture,
            city,
            state,
            country,
            sex
        }
    });
}

export async function getUserStrava(userId:string) {
    const req = await prisma.userStrava.findUnique({
        where : {userId},
    })
    return req
    
}

export async function deleteStrava(userId:string) {
    const req = await prisma.userAuthStrava.delete({
        where : {userId}
    })
    return req
    
}