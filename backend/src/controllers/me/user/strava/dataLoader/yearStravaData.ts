import axios from "axios";
import { upsertYearlyStrava } from "../../../../../models/strava/data";

export default async function controllerYearlyData(stravaAthleteId: number, accessToken: string) {
    try {
        const currentYear = new Date().getFullYear();
        const afterDate = new Date(`${currentYear - 4}-01-01T00:00:00Z`);
        const afterTimestamp = Math.floor(afterDate.getTime() / 1000);

        const response = await axios.get(
            `https://www.strava.com/api/v3/athlete/activities`,
            { 
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { after: afterTimestamp, per_page: 200 } 
            }
        );

        const activities = response.data;
        if (!Array.isArray(activities)) throw new Error("Format d'activités invalide");

        const yearlyMap = new Map<number, { dist: number, elev: number, count: number }>();

        activities.forEach((activity: any) => {
            if (activity.type === 'Ride') {
                const year = new Date(activity.start_date).getFullYear();
                
                const existing = yearlyMap.get(year) || { dist: 0, elev: 0, count: 0 };
                
                yearlyMap.set(year, {
                    dist: existing.dist + (activity.distance / 1000),
                    elev: existing.elev + activity.total_elevation_gain,
                    count: existing.count + 1
                });
            }
        });

        const results = [];
        
        for (const [year, stats] of yearlyMap.entries()) {
            const data = await upsertYearlyStrava(
                stravaAthleteId,
                year,
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