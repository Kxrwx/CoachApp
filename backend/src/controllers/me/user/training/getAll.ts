import type { AuthRequest } from "../../../../middleware/Secure";
import type { Response } from "express";
import { GetAllTraining } from "../../../../models/training/getData";

export default async function getAllTraining(req:AuthRequest, res : Response) {
    try {
            const UserId = req.session?.userId
            if(!UserId) return res.status(404).json("Aucun user")
            const response = await GetAllTraining(UserId)
            if(!response) return res.status(404).json("Aucune data Strava")
            return res.status(200).json(response)
        }
    
        catch(error) {
            res.status(500).json("Erreur serveur")
        }
}