import axios from "axios";
import { upsertActivityStrava } from "../../../../../models/strava/data";

export default async function controllerRecentActivities(stravaAthleteId: number, accessToken: string) {
    try {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - 30);
        const afterTimestamp = Math.floor(dateLimit.getTime() / 1000);

        const response = await axios.get(
            `https://www.strava.com/api/v3/athlete/activities`,
            { 
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { after: afterTimestamp, per_page: 50 } 
            }
        );

        const activities = response.data;
        if (!Array.isArray(activities)) throw new Error("Format d'activités invalide");

        const results = [];

        for (const activity of activities) {
            if (activity.type === 'Ride' || activity.type === 'VirtualRide') {
                
                const data = await upsertActivityStrava(
                    BigInt(activity.id), 
                    stravaAthleteId,
                    activity.name,
                    activity.distance / 1000, 
                    activity.moving_time,
                    activity.elapsed_time,
                    activity.total_elevation_gain,
                    activity.type,
                    new Date(activity.start_date)
                );
                
                results.push(data);
            }
        }

        return results;

    } catch (error) {
        console.error("Erreur Recent Activities DataLoader:", error);
        throw error;
    }
}