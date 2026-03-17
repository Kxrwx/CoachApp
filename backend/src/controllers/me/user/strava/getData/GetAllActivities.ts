import type { AuthRequest } from "../../../../../middleware/Secure";
import type { Response } from "express";
import { GetAllActivities } from "../../../../../models/strava/getData";

export default async function getAllActivities(req:AuthRequest, res : Response) {
    try {
        const UserId = req.session?.userId
        if(!UserId) return res.status(404).json("Aucun user")
        const response = await GetAllActivities(UserId)
        if(!response) return res.status(404).json("Aucune data Strava")
        
        return res.status(200).json(response)
    }
    catch (error) {
        return res.status(500).json({error : "Erreur serveur"})
    }
}