import axios from "axios";
import { upsertATStrava } from "../../../../../models/strava/data";

export default async function controllerATData(stravaAthleteId: number, accessToken: string) {
    try {
        const response = await axios.get(
            `https://www.strava.com/api/v3/athletes/${stravaAthleteId}/stats`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const rideStats = response.data.all_ride_totals; 

        if (!rideStats) throw new Error("Stats de cyclisme introuvables");

        const totalDistance = rideStats.distance / 1000; 
        const totalElevation = rideStats.elevation_gain; 
        const totalCount = rideStats.count;
        const totalTime = rideStats.moving_time; 

        const data = await upsertATStrava(
            stravaAthleteId, 
            totalDistance, 
            totalElevation, 
            totalCount, 
            totalTime
        );
        
        return data;
    } catch (error) {
        throw error;
    }
}