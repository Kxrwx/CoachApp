import type { AuthRequest } from "../../../../../middleware/Secure";
import type { Response } from "express";
import { getUserStrava } from "../../../../../models/user/userStrava";
import { GetDetailActivity } from "../../../../../models/strava/getData";

export default async function getDetailActivity(req: AuthRequest, res: Response) {
    try {
        const UserId = req.session?.userId;
        const { activityId } = req.body;

        if (!UserId) return res.status(401).json({ error: "Aucun User trouvé" });

        const UserStrava = await getUserStrava(UserId);
        if (!UserStrava) return res.status(404).json({ error: "Aucun profil Strava associé" });

        const data = await GetDetailActivity(UserStrava.id, activityId);

        if (!data) return res.status(404).json({ error: "Activité introuvable en base de données" });
        const safeData = JSON.parse(
            JSON.stringify(data, (key, value) =>
                typeof value === "bigint" ? value.toString() : value
            )
        );

        return res.status(200).json(safeData);
    } catch (error) {
        console.error("Erreur getDetailActivity:", error);
        return res.status(500).json({ error: "Erreur serveur lors de la sérialisation des données" });
    }
}