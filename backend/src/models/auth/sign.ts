import prisma from "../../utils/prisma";



export async function signin(email : string){


    const req = await prisma.users.findUnique(
        {
            where : {email : email}, 
        }
    )
    return req    
}

export async function signup(email : string, password : string, mfa : boolean){

    const req = await prisma.users.create({
        data : {email : email, passwordHash : password, mfaEnabled : mfa}
    })
    return req
}
