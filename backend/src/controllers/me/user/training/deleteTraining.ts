
import type { Request, Response } from "express";
import { DeleteTraining } from "../../../../models/training/data";


export default async function deleteTraining(req: Request, res: Response) {
    try {
        const { id } = req.body;

        const data = await DeleteTraining(id);

        if (!data) return res.status(404).json({ error: "Training introuvable en base de données" });

        return res.status(200).json({isDelete : true});
    } catch (error) {
        return res.status(500).json({ error: "Erreur serveur" });
    }
}