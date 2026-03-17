import type { AuthRequest } from '../../../../middleware/Secure';
import type { Response } from 'express';
import { UpsertTraining } from '../../../../models/training/data';

export default async function upsertTraining(req: AuthRequest, res: Response) {
  try {
    const {
      id,
      title,
      description,
      type,
      duration,
      distance,
      intensity,
      startDate,
      startTime,
      isRecurring,
      rrule,
      endDate
    } = req.body;

    const sessionUserId = req.session?.userId;
    if (!sessionUserId) return res.status(401).json("Non autorisé");

    const formattedStartDate = new Date(startDate);
    const formattedEndDate = endDate ? new Date(endDate) : null;

    const response = await UpsertTraining(
      id,
      sessionUserId, 
      title,
      description,
      type,
      Number(duration), 
      distance ? Number(distance) : null,
      intensity,
      formattedStartDate,
      startTime,
      isRecurring,
      rrule,
      formattedEndDate
    );

    if (!response) return res.status(400).json("Erreur lors de la sauvegarde");
    
    return res.status(200).json(response);

  } catch (error) {
    res.status(500).json("Erreur serveur lors de la planification");
  }
}