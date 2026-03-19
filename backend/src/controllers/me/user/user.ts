
import type { AuthRequest } from "../../../middleware/Secure";
import type { Response } from "express";
import { getUser } from "../../../models/user/user";

export default async function User(req : AuthRequest, res : Response) {
    
    try {
        const userId = req.session?.userId
        if(!userId) return res.status(401).json({error : "Unauthorize"})
        const reponse = await getUser(userId)
        if(!reponse) return res.status(402).json({error : "Aucun User trouvé"})
        res.status(200).json(reponse)
    }
    catch(error){
        return res.status(500).json({error : "Erreur serveur"})
    }
}