import type { AuthRequest } from "../../../../middleware/Secure";
import type { Response } from "express";
import { GetGoalAll } from "../../../../models/objectif/getData";

export default async function getObjectif(req : AuthRequest, res : Response) {
    try {
        const UserId = req.session?.userId
        if(!UserId) return res.status(401).json({error : "Unauthorized"})
        const goal = await GetGoalAll(UserId)
        if(!goal) return res.status(404).json({error : "Aucun objectif trouvé"})
        return res.status(200).json(goal)
    }
    catch (error) {
        return res.status(500).json({error : "Erreur serveur"})
    }
}