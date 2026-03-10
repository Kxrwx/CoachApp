import { any, email, includes } from "zod";
import prisma from "../../utils/prisma";
import { id } from "zod/v4/locales";



export async function signin(email : string){


    const req = prisma.user.findUnique(
        {
            where : {email : email}, 
        }
        
    )

    return req    
}

export function signup(email : string, password : string, mfa : boolean){

    const req = prisma.user.create({
        data : {email : email, passwordHash : password, mfaEnabled : mfa}
    })
}
