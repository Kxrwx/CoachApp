import prisma from "../../utils/prisma";

export async function getUser(id : string){
    const req = await prisma.users.findUnique({
        where : {id}
    })
    return req
}

export async function updateUserMfa(id : string, mfaEnabled : boolean) {
    const req = await prisma.users.update({
        where : {id},
        data : {mfaEnabled}
    })
    return  req 
}