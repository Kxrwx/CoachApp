import axios from "axios";
import { upsertMonthStrava } from "../../../../../models/strava/data";

export default async function controllerMonthlyData(stravaAthleteId: number, accessToken: string) {
    try {
        const dateLimit = new Date();
        dateLimit.setMonth(dateLimit.getMonth() - 13);
        const afterTimestamp = Math.floor(dateLimit.getTime() / 1000);

        const response = await axios.get(
            `https://www.strava.com/api/v3/athlete/activities`,
            { 
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { after: afterTimestamp, per_page: 200 } 
            }
        );

        const activities = response.data;
        if (!Array.isArray(activities)) throw new Error("Format d'activités invalide");

        const monthlyMap = new Map<string, { year: number, month: number, dist: number, elev: number, count: number }>();

        activities.forEach((activity: any) => {
            if (activity.type === 'Ride' || activity.type === 'VirtualRide') {
                const startDate = new Date(activity.start_date);
                const year = startDate.getFullYear();
                const month = startDate.getMonth() + 1;
                const key = `${year}-${month}`;

                const existing = monthlyMap.get(key) || { year, month, dist: 0, elev: 0, count: 0 };
                
                monthlyMap.set(key, {
                    year,
                    month,
                    dist: existing.dist + (activity.distance / 1000),
                    elev: existing.elev + activity.total_elevation_gain,
                    count: existing.count + 1
                });
            }
        });

        const results = [];
        
        for (const stats of monthlyMap.values()) {
            const data = await upsertMonthStrava(
                stravaAthleteId,
                stats.year,
                stats.month,
                stats.dist,
                stats.elev,
                stats.count
            );
            results.push(data);
        }

        return results;

    } catch (error) {
        throw error;
    }
}