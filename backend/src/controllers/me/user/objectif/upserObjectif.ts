import type { AuthRequest } from "../../../../middleware/Secure";
import type { Response } from "express";
import { UpsertGoal } from "../../../../models/objectif/data"; 

export default async function UpsertObjectif(req: AuthRequest, res: Response) {
  try {
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      id,
      name,
      type,
      startDate,
      endDate,
      targets
    } = req.body;

    if (!type || !targets || !Array.isArray(targets)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const goal = await UpsertGoal(
        id, userId,{
        name,
        type,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        targets}
    )

    return res.status(200).json(goal);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur Serveur" });
  }
}
