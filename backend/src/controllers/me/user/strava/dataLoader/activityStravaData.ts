import axios from "axios";
import { upsertActivityStrava, upsertActivityDetailStrava } from "../../../../../models/strava/data";

export default async function controllerRecentActivitiesWithDetails(stravaAthleteId: number, accessToken: string) {
    try {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - 30);
        const afterTimestamp = Math.floor(dateLimit.getTime() / 1000);

        const listResponse = await axios.get(
            `https://www.strava.com/api/v3/athlete/activities`,
            { 
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { after: afterTimestamp, per_page: 50 } 
            }
        );

        const activities = listResponse.data;
        if (!Array.isArray(activities)) throw new Error("Format d'activités invalide");

        const results = [];

        for (const activity of activities) {
            if (activity.type === 'Ride' || activity.type === 'VirtualRide') {
                
                const detailResponse = await axios.get(
                    `https://www.strava.com/api/v3/activities/${activity.id}`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                
                const details = detailResponse.data;

                const baseActivity = await upsertActivityStrava(
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

                await upsertActivityDetailStrava(
                    BigInt(activity.id),
                    details
                );
                
                results.push({ ...baseActivity, hasDetails: true });

            }
        }

        return results;

    } catch (error) {
        throw error;
    }
}