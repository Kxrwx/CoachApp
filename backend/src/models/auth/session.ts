import prisma from "../../utils/prisma";
import { addHours } from "date-fns";


export async function session(userId : string, deviceId : string, token : string, ip: string, userAgent : string) {
    const expireAt = addHours(new Date, 2)
    const req = prisma.sessions.create({
        data : {userId : userId, deviceId : deviceId, tokenHash : token, ip : ip, userAgent : userAgent, expiresAt : expireAt}
    })
    return req
}