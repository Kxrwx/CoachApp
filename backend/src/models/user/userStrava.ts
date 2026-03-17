import prisma from "../../utils/prisma";

export async function createAuthStrava(userId : string, athlete : any, accessToken : string, refreshToken : string, expiresAt : number, IncomingScope : string) {
    const stravaId = String(athlete.id);
    const req = await prisma.userAuthStrava.create({
        data : { userId, stravaAthleteId : stravaId, accessToken, refreshToken, expiresAt, scope : IncomingScope    }
    })
    return req
}

export async function isAuthStrava(userId : string) {
    const req = await prisma.userAuthStrava.findUnique({
        where : {userId},
        select : { id : true }
    })
    return req?.id  
}

export async function updateAuthStrava(userId : string, athlete : any, accessToken : string, refreshToken : string, expiresAt : number, IncomingScope : string){
    const stravaId = String(athlete.id);
    const req = await prisma.userAuthStrava.update({
        
        where : {userId},
        data : { stravaAthleteId : stravaId, accessToken, refreshToken, expiresAt, scope : IncomingScope}
    })
    return req
}