import prisma from "../../utils/prisma";
import { addHours, lastDayOfISOWeek } from "date-fns";
import crypto from "crypto"
import { sanitizeIP } from "../../utils/bib";


export async function session(userId : string, deviceId : string, token : string, ip: string, userAgent : string) {
    const expireAt = addHours(new Date, 2)
    const IP = sanitizeIP(ip)
    const req = prisma.sessions.create({
        data : {userId : userId, deviceId : deviceId, tokenHash : token, ip : IP, userAgent : userAgent, expiresAt : expireAt}
    })
    console.log("IP envoyée à Prisma:", ip);
    return req
}

export async function getSession(token : string){
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const req = prisma.sessions.findUnique(
        {
            where : {tokenHash}
        }
    )
    return req
}

export async function updateRevokedSession(userId:string) {
    const req = await prisma.sessions.updateMany(
        {
            where : {userId},
            data : { revoked : true }
        }
    )
    return req
}

export async function updateRevokedSessionToken(token:string) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const req = await prisma.sessions.update(
        {
            where : {tokenHash},
            data : { revoked : true }
        }
    )
    return req
}

export async function updateLastSeenSession(id:string) {
    const req = await prisma.sessions.update(
        {
            where : {id : id, revoked : false},
            data : {lastSeen : new Date()}
        }
    )
    return req
    
}