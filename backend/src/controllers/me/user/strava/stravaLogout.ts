
import type { AuthRequest } from "../../../../middleware/Secure";
import type { Response } from "express";
import { deleteStrava } from "../../../../models/user/userStrava"

export default async function deleteStravaAccount(req : AuthRequest, res : Response) {
    
    try {
        const userId = req.session?.userId
        if(!userId) return res.status(401).json({error : "Unauthorize"})
        const reponse = await deleteStrava(userId)
        if(!reponse) return res.status(402).json({error : "Aucun User trouvé"})
        res.status(200).json(reponse)
    }
    catch(error){
        res.status(500).json({error : "Erreur serveur"})
    }
}