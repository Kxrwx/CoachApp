

import type { Response } from "express";
import type { AuthRequest } from "../../../middleware/Secure";
import { getUserStrava } from "../../../models/user/userStrava";

export default async function GetUserStrava(req:AuthRequest, res:Response) {
    try {
            const userId = req.session?.userId
            if(!userId) return res.status(401).json({error : "Unauthorize"})
            const reponse = await getUserStrava(userId)
            if(!reponse) return res.status(402).json({error : "Aucun UserStrava trouvé"})
            res.status(200).json(reponse)
        }
        catch(error){
            res.status(500).json({error : "Erreur serveur"})
        }
}