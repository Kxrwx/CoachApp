import prisma from "../../../../utils/prisma";
import axios from "axios"
import { upsertActivityStrava } from "../../../../models/strava/data";

export default async function handleStravaWebhook(event: any) {
    const { object_id, aspect_type, owner_id, object_type, updates } = event;

    if (object_type !== 'activity') return;

    try {
        const athleteId = Number(owner_id);

if (aspect_type === 'delete') {
    const activity = await prisma.stravaRecentActivityBike.findUnique({
        where: { id: BigInt(object_id) }
    });

    if (activity) {
        const year = activity.startDate.getFullYear();
        const month = activity.startDate.getMonth() + 1;

        await updateAggregates(
            athleteId, 
            year, 
            month, 
            -activity.distance, 
            -activity.totalElevationGain, 
            -1, 
            -activity.movingTime
        );

        await prisma.stravaRecentActivityBike.delete({ 
            where: { id: BigInt(object_id) } 
        });
    }
    return;
}
        if (aspect_type === 'create') {
            const auth = await prisma.userAuthStrava.findUnique({ where: { stravaAthleteId: String(owner_id) } });
            if (!auth) return;

            const res = await axios.get(`https://www.strava.com/api/v3/activities/${object_id}`, {
                headers: { Authorization: `Bearer ${auth.accessToken}` }
            });
            const act = res.data;

            if (act.type === 'Ride' || act.type === 'VirtualRide') {
                const dist = act.distance / 1000;
                const year = new Date(act.start_date).getFullYear();
                const month = new Date(act.start_date).getMonth() + 1;

                await upsertActivityStrava(BigInt(act.id), athleteId, act.name, dist, act.moving_time, act.elapsed_time, act.total_elevation_gain, act.type, new Date(act.start_date));
                

                await updateAggregates(athleteId, year, month, dist, act.total_elevation_gain, 1, act.moving_time);
            }
        }

        if (aspect_type === 'update' && (updates.distance || updates.total_elevation_gain)) {
        }

    } catch (error) {
        console.error("Erreur Webhook Recalcul:", error);
    }
}


async function updateAggregates(
    athleteId: number, 
    year: number, 
    month: number, 
    dDist: number, 
    dElev: number, 
    dCount: number, 
    dTime: number
) {
    await prisma.stravaAllTimeStatsBike.update({
        where: { stravaAthleteId: athleteId },
        data: {
            totalDistance: { increment: dDist },    
            totalElevation: { increment: dElev },   
            totalCount: { increment: dCount },      
            totalTime: { increment: dTime }        
        }
    });

    await prisma.stravaYearlyStatsBike.upsert({
        where: { stravaAthleteId_year: { stravaAthleteId: athleteId, year } },
        update: {
            distance: { increment: dDist },
            elevation: { increment: dElev },
            count: { increment: dCount }
        },
        create: {
            stravaAthleteId: athleteId,
            year: year,
            month: month, 
            distance: dDist > 0 ? dDist : 0,
            elevation: dElev > 0 ? dElev : 0,
            count: dCount > 0 ? dCount : 0 
}
    });

    await prisma.stravaMonthlyStatsBike.upsert({
        where: { stravaAthleteId_year_month: { stravaAthleteId: athleteId, year, month } },
        update: {
            distance: { increment: dDist },
            elevation: { increment: dElev },
            count: { increment: dCount }
        },
        create: {
            stravaAthleteId: athleteId,
            year: year,
            month: month, 
            distance: dDist > 0 ? dDist : 0,
            elevation: dElev > 0 ? dElev : 0,
            count: dCount > 0 ? dCount : 0 
}
    });
}