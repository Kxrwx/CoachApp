
import { getSession } from "../models/auth/session";
import prisma from "../utils/prisma";
import type { NextFunction, Request, Response } from "express"; 

export interface AuthRequest extends Request {
  user?: {
    id: string
  }
}

async function authMiddleware(req: AuthRequest,res: Response,
  next: NextFunction
) {
    console.log('Middlaware Node')
    try {
        if (req.path.startsWith("/auth")) return next();
        const token = req.cookies.session_token
        const session = await getSession(token)
        
        if(!session || !session.userId){
            return res.status(401).json({error : "Non autorisé"})
        }
        const user = await prisma.users.findUnique({
        where : {id : session.userId},
        select : {id : true}
        })
        if(!user) return res.status(401).json({error : "Non autorisé aucun user attribué à la session"})
            if(session.expiresAt < new Date() || session.revoked){
                return res.status(401).json({error : "Session non conforme"})
            }
            req.user = user
            next()
            
        
        
    }
    catch(error) {
        next(error)
    }
    
    
    
}

export default authMiddleware;