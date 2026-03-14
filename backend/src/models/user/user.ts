import prisma from "../../utils/prisma";

export async function getUser(id : string){
    const req = await prisma.users.findUnique({
        where : {id}
    })
    return req
}