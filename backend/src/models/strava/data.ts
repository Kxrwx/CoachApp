import stravaUser from "../../controllers/me/user/strava/stravaAuth";
import prisma from "../../utils/prisma";

export async function upsertATStrava(stravaAthleteId: number, totalDistance: number, totalElevation: number, totalCount: number, totalTime: number) {
    const req =  await prisma.stravaAllTimeStatsBike.upsert({
        where: { stravaAthleteId },
        update: {
            totalDistance,
            totalElevation,
            totalCount,
            totalTime,
            updatedAt: new Date() 
        },
        create: {
            stravaAthleteId,
            totalDistance,
            totalElevation,
            totalCount,
            totalTime
        }
    });
    return req
}


export async function upsertYearlyStrava(stravaAthleteId: number, year: number, distance: number, elevation: number, count: number) {
    const req =  await prisma.stravaYearlyStatsBike.upsert({
        where: {
            stravaAthleteId_year: {
                stravaAthleteId,
                year
            }
        },
        update: {
            distance,
            elevation,
            count
        },
        create: {
            stravaAthleteId,
            year,
            distance,
            elevation,
            count
        }
    });
    return req
}



export async function upsertMonthStrava(stravaAthleteId: number, year: number,month : number, distance: number, elevation: number, count: number) {
    const req =  await prisma.stravaMonthlyStatsBike.upsert({
        where: {
            stravaAthleteId_year_month: {
                stravaAthleteId,
                year, 
                month
            }
        },
        update: {
            distance,
            elevation,
            count
        },
        create: {
            stravaAthleteId,
            year,
            month,
            distance,
            elevation,
            count
        }
    });
    return req
}


export async function upsertActivityStrava(id : bigint, stravaAthleteId: number, name: string,distance : number,  movingTime: number, elapsedTime: number, totalElevationGain: number, type : string, startDate : Date) {
    const req =  await prisma.stravaRecentActivityBike.upsert({
        where: {
            id
        },
        update: {
            name,
            distance,
            movingTime,
            elapsedTime,
            totalElevationGain,
            type,
            startDate

        },
        create: {
            id, 
            stravaAthleteId,
            name,
            distance,
            movingTime,
            elapsedTime,
            totalElevationGain,
            type,
            startDate
        }
    });
    return req
}


export async function upsertActivityDetailStrava(activityId: bigint, details: any) {
    return await prisma.stravaActivityDetail.upsert({
        where: { activityId: activityId },
        update: {
            avgWatts: details.average_watts,
            maxWatts: details.max_watts,
            weightedWatts: details.weighted_average_watts,
            kilojoules: details.kilojoules,
            hasPower: details.device_watts || false,
            avgHeartrate: details.average_heartrate,
            maxHeartrate: details.max_heartrate,
            avgCadence: details.average_cadence,
            avgTemp: details.average_temp,
            elevHigh: details.elev_high,
            elevLow: details.elev_low,
            calories: details.calories,
            polyline: details.map?.summary_polyline,
            device: details.device_name,
        },
        create: {
            id: activityId, 
            activityId: activityId,
            avgWatts: details.average_watts,
            maxWatts: details.max_watts,
            weightedWatts: details.weighted_average_watts,
            kilojoules: details.kilojoules,
            hasPower: details.device_watts || false,
            avgHeartrate: details.average_heartrate,
            maxHeartrate: details.max_heartrate,
            avgCadence: details.average_cadence,
            avgTemp: details.average_temp,
            elevHigh: details.elev_high,
            elevLow: details.elev_low,
            calories: details.calories,
            polyline: details.map?.summary_polyline,
            device: details.device_name,
        }
    });
}

export async function upsertRecordsStrava(stravaAthleteId: number, maxDistance: number, maxElevation: number, maxWatts: number, maxHeartrate: number, maxCadence : number) {
    const req =  await prisma.stravaRecord.upsert({
        where: {
            stravaAthleteId
        },
        update: {
            maxDistance,
            maxElevation,
            maxWatts,
            maxHeartrate,
            maxCadence

        },
        create: {
            stravaAthleteId,
            maxDistance,
            maxElevation,
            maxWatts,
            maxHeartrate,
            maxCadence
        }
    });
    return req
}

