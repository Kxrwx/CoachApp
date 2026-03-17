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


