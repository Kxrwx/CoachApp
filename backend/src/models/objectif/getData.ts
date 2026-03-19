import prisma from "../../utils/prisma";


export async function GetObjectif(userId:string) {
    const req = await prisma.objectif.findUnique({
        where : {userId}
        
    })
    return req
}