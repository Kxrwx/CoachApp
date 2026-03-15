
import { getSession } from "../models/auth/session";
import type { NextFunction, Request, Response } from "express"; 

export interface AuthRequest extends Request {
  session?: {
    id: string
  }
}

async function authMiddleware(req: AuthRequest,res: Response,
  next: NextFunction
) {
    console.log('Middlaware Node')
    console.log(req.headers.cookie)
    console.log(req.cookies)
    try {
        
        const token = req.cookies.session_token
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