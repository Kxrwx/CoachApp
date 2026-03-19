import type { AuthRequest } from "../../../../middleware/Secure"
import type { Response } from "express"
import prisma from "../../../../utils/prisma"
import axios from "axios"

//import requete 
import { upsertAuthStrava, upsertUserStrava } from "../../../../models/user/userStrava"
import { upsertATStrava, upsertRecordsStrava, upsertActivityStrava, upsertActivityDetailStrava, upsertMonthStrava, upsertYearlyStrava } from "../../../../models/strava/data"


export default async function stravaUser(req: AuthRequest, res : Response) {
    
    try {
        const userId = req.session?.userId
        if (!userId) return res.status(401).json({error : "Aucun user trouvé"})
        const client_id = process.env.STRAVA_CLIENT_ID
        const client_secret = process.env.STRAVA_CLIENT_SECRET
        const code = req.query.code as string
        const scope = (req.query.scope as string);
        if(!scope || !code) return res.status(404).json({error : "Erreur code ou scope"})
        console.log(code)
        if(!code) return res.status(401).json({error : "Code authorization manquant"})
        const grant_type = 'authorization_code'

        const reponse = await axios.post("https://www.strava.com/oauth/token", {
            client_id, client_secret, code, grant_type
        })

        const { 
            access_token, 
            refresh_token, 
            expires_at, 
            athlete, 
        } = reponse.data
        const {
            id, 
            firstname, 
            lastname, 
            profile, 
            city, 
            state, 
            country, 
            sex
        } = athlete
        const AuthStrava = await upsertAuthStrava(userId, athlete, access_token, refresh_token, expires_at, scope)
        const UserStrava = await upsertUserStrava(id, userId, firstname, lastname, profile, city, state, country, sex)

        //Loading data Strava
        await globalStravaSync(id, access_token)
        
        return res.status(200).json({AuthStrava, UserStrava})

        
    }
    catch(error) {
        return res.status(500).json({error : "Erreur serveur"})
    }

}


async function globalStravaSync(stravaAthleteId: number, accessToken: string) {
    try {
        // --- 1. UN SEUL APPEL POUR TOUTES LES STATS ---
        const statsResponse = await axios.get(
            `https://www.strava.com/api/v3/athletes/${stravaAthleteId}/stats`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const stats = statsResponse.data;

        // On dispatch vers les deux modèles
        await upsertATStrava(stravaAthleteId, stats.all_ride_totals.distance / 1000, stats.all_ride_totals.elevation_gain, stats.all_ride_totals.count, stats.all_ride_totals.moving_time);
        
        // On prépare les records (on complètera avec la DB plus tard si besoin)
        await upsertRecordsStrava(stravaAthleteId, stats.biggest_ride_distance / 1000, stats.biggest_climb_elevation_gain, 0, 0, 0);

        // --- 2. UN SEUL APPEL POUR TOUTES LES ACTIVITÉS (4 ANS) ---
        const currentYear = new Date().getFullYear();
        const afterTimestamp = Math.floor(new Date(`${currentYear - 4}-01-01`).getTime() / 1000);
        const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

        const actResponse = await axios.get(
            `https://www.strava.com/api/v3/athlete/activities`,
            { 
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { after: afterTimestamp, per_page: 200 } 
            }
        );
        const activities = actResponse.data;

        // Maps pour ventiler les données en mémoire (CPU) plutôt qu'en requêtes (Réseau)
        const yearlyMap = new Map();
        const monthlyMap = new Map();

        for (const act of activities) {
            if (act.type !== 'Ride' && act.type !== 'VirtualRide') continue;

            const date = new Date(act.start_date);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const dist = act.distance / 1000;
            const elev = act.total_elevation_gain;

            // Ventilation Annuelle
            const y = yearlyMap.get(year) || { dist: 0, elev: 0, count: 0 };
            yearlyMap.set(year, { dist: y.dist + dist, elev: y.elev + elev, count: y.count + 1 });

            // Ventilation Mensuelle (seulement si < 13 mois)
            if (date > new Date(new Date().setMonth(new Date().getMonth() - 13))) {
                const k = `${year}-${month}`;
                const m = monthlyMap.get(k) || { year, month, dist: 0, elev: 0, count: 0 };
                monthlyMap.set(k, { year, month, dist: m.dist + dist, elev: m.elev + elev, count: m.count + 1 });
            }

            // --- 3. DÉTAILS (Seulement pour les 30 derniers jours) ---
            if (Math.floor(date.getTime() / 1000) > thirtyDaysAgo) {
                // Check si on a déjà le détail en DB pour éviter l'appel API
                const existing = await prisma.stravaActivityDetail.findUnique({ where: { activityId: BigInt(act.id) } });
                
                if (!existing) {
                    const detRes = await axios.get(`https://www.strava.com/api/v3/activities/${act.id}`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    await upsertActivityStrava(BigInt(act.id), stravaAthleteId, act.name, dist, act.moving_time, act.elapsed_time, elev, act.type, date);
                    await upsertActivityDetailStrava(BigInt(act.id), detRes.data);
                }
            }
        }

        // --- 4. ENVOI MASSIF EN DB ---
        for (const [year, s] of yearlyMap) await upsertYearlyStrava(stravaAthleteId, year, s.dist, s.elev, s.count);
        for (const s of monthlyMap.values()) await upsertMonthStrava(stravaAthleteId, s.year, s.month, s.dist, s.elev, s.count);

        return { success: true };
    } catch (error) {
        console.error("Sync Error", error);
        throw error;
    }
}


