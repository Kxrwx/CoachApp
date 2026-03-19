import type { AuthRequest } from "../../../../middleware/Secure";
import type { Response } from "express";
import { UpsertGoal } from "../../../../models/objectif/data";

export default async function UpsertObjectif(req: AuthRequest, res: Response) {
  try {
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    const { id, name, type, startDate, endDate, targets } = req.body;


    if (!type) return res.status(400).json({ error: "Le champ 'type' est manquant" });
    if (!name) return res.status(400).json({ error: "Le champ 'name' est manquant" });
    if (!targets || !Array.isArray(targets)) {
      return res.status(400).json({ error: "Le champ 'targets' doit être un tableau" });
    }

    const parsedStartDate = startDate && !isNaN(Date.parse(startDate)) 
      ? new Date(startDate) 
      : null;
      
    const parsedEndDate = endDate && !isNaN(Date.parse(endDate)) 
      ? new Date(endDate) 
      : null;

    const goal = await UpsertGoal(
      id || undefined, 
      userId, 
      {
        name,
        type,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        targets
      }
    );


    return res.status(200).json(goal);

  } catch (error) {

    console.error("Erreur lors de l'upsert de l'objectif:", error);
    
    return res.status(500).json({ 
      error: "Erreur Serveur", 
      details: error instanceof Error ? error.message : "Erreur inconnue" 
    });
  }
}