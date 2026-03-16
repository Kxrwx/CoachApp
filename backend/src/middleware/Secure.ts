
import { error } from "node:console";
import { getSession } from "../models/auth/session";
import type { NextFunction, Request, Response } from "express"; 

export interface AuthRequest extends Request {
  session?: {
    id: string,
    userId : string
  }
}

async function authMiddleware(req: AuthRequest,res: Response,
  next: NextFunction
) {
    try {
        
        const token = req.cookies.session_token
        if(!token) return res.status(401).json({error : "Unauthorize"})
        const session = await getSession(token)
        if(!session || !session.userId || session.revoked || new Date(session.expiresAt) < new Date()){
            return res.status(401).json({error : "Non autorisé"})
        }
        req.session = session
        next()
            
        
        
    }
    catch(error) {
        next(error)
    }
}

export default authMiddleware;