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

export async function createUserStrava(id : number, userId:string, firstname: string, lastname : string, profilePicture : string, city : string, state : string, country : string, sex :string) {
    const req = await prisma.userStrava.create({
        data : {id, userId, firstname, lastname, profilePicture, city, state, country, sex}
    })
    return req
}

export async function updateUserStrava(id : number, userId:string, firstname: string, lastname : string, profilePicture : string, city : string, state : string, country : string, sex :string) {
    const req = await prisma.userStrava.update({
        where : {id},
        data : { userId, firstname, lastname, profilePicture, city, state, country, sex}
    })
    return req
}

export async function getUserStrava(userId:string) {
    const req = await prisma.userStrava.findUnique({
        where : {userId},
    })
    return req
    
}