import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { startOfMonth, startOfYear, subMonths, subYears } from 'date-fns';


interface PendingStat {
  type: string;
  periodStart?: Date;
  data: {
    distance: number;
    count: number;
    elevation: number;
  };
}


@Injectable()
export class StravaService {
  constructor(private prisma: PrismaService) {}

  getAuthUrl() {
    const rootUrl = 'https://www.strava.com/oauth/authorize';
    if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_REDIRECT_URI) {
      throw new Error("DÉFAUT CRITIQUE : Les variables d'environnement STRAVA_CLIENT_ID et STRAVA_REDIRECT_URI sont requises.");
    }
    const options = {
      client_id: process.env.STRAVA_CLIENT_ID,
      redirect_uri: process.env.STRAVA_REDIRECT_URI, 
      response_type: 'code',
      approval_prompt: 'auto',
      scope: 'read,activity:read_all,profile:read_all',
    };

    const qs = new URLSearchParams(options);
    return `${rootUrl}?${qs.toString()}`;
  }

  async linkAccount(userId: string, code: string) {
    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      });

      const { access_token, refresh_token, expires_at, athlete } = response.data;

      return await this.prisma.$transaction(async (tx) => {
        const integration = await tx.integration.upsert({
          where: { userId_provider: { userId, provider: 'STRAVA' } },
          create: {
            userId,
            provider: 'STRAVA',
            externalUserId: athlete.id.toString(),
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresAt: new Date(expires_at * 1000),
          },
          update: {
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresAt: new Date(expires_at * 1000),
          },
        });

        await tx.usersStrava.upsert({
          where: { stravaAuth: athlete.id.toString() },
          create: {
            integrationId: integration.id,
            stravaAuth: athlete.id.toString(),
            firstname: athlete.firstname,
            lastname: athlete.lastname,
            profilePicture: athlete.profile,
            city: athlete.city,
            state: athlete.state,
            country: athlete.country,
            sex: athlete.sex,
          },
          update: {
            firstname: athlete.firstname,
            lastname: athlete.lastname,
            profilePicture: athlete.profile,
          },
        });
        this.syncStatsStrava(athlete.id);
        return { success: true };
      });
    } catch (error) {
      throw new BadRequestException("Échec de la liaison avec Strava");
    }
  }

async unlinkAccount(userId: string) {
  try {
    await this.prisma.$transaction(async (tx) => {

      const integration = await tx.integration.findUnique({
        where: { userId_provider: { userId, provider: 'STRAVA' } },
        include: { usersStrava: true } 
      });

      if (!integration || !integration.usersStrava) {
        throw new BadRequestException("Compte Strava non lié");
      }

      const userStravaId = integration.usersStrava.id;

      await tx.stravaActivity.deleteMany({
        where: { userStravaId: userStravaId }
      });

      await tx.stravaStats.deleteMany({
        where: { userId: userStravaId },
      });

      await tx.usersStrava.delete({
        where: { id: userStravaId },
      });

      await tx.integration.delete({
        where: { id: integration.id },
      });
    });

    return { success: true };
  } catch (error) {
    console.error(error);
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException("Échec de la déliaison avec Strava");
  }
}

private round(val: number, decimals: number = 2): number {
    return Math.round(val * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

private async syncStatsStrava(stravaAthleteId: string | number) {
  try {
    const now = new Date();

    const userStrava = await this.prisma.usersStrava.findFirst({
      where: {
        integration: {
          externalUserId: String(stravaAthleteId),
          provider: 'STRAVA',
        },
      },
      include: { integration: true },
    });

    if (!userStrava?.integration) return;

    const { accessToken, externalUserId } = userStrava.integration;

    // =====================================
    // 1. FETCH ALL ACTIVITIES (PAGINATION)
    // =====================================
    const allActivities: any[] = [];
    let page = 1;

    while (true) {
      const { data } = await axios.get(
        `https://www.strava.com/api/v3/athlete/activities`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { per_page: 200, page },
        }
      );

      if (!data.length) break;

      allActivities.push(...data);
      page++;
    }

    if (allActivities.length === 0) return;

    // =====================================
    // 2. FETCH GLOBAL STATS (API)
    // =====================================
    const { data: stravaApiData } = await axios.get(
      `https://www.strava.com/api/v3/athletes/${externalUserId}/stats`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    // =====================================
    // 3. AGGREGATION IN MEMORY
    // =====================================
    const statsMap = new Map<
      string,
      { distance: number; elevation: number; count: number }
    >();

    const ensure = (key: string) => {
      if (!statsMap.has(key)) {
        statsMap.set(key, { distance: 0, elevation: 0, count: 0 });
      }
      return statsMap.get(key)!;
    };

    for (const act of allActivities) {
      if (!['Ride', 'VirtualRide'].includes(act.type)) continue;

      const d = new Date(act.start_date);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;

      const yearKey = `year_${year}`;
      const monthKey = `month_${year}_${month}`;

      const targets = [ensure(yearKey), ensure(monthKey)];

      for (const t of targets) {
        t.distance += act.distance || 0;
        t.elevation += act.total_elevation_gain || 0;
        t.count += 1;
      }
    }

    // =====================================
    // 4. BUILD STATS
    // =====================================
    const statsToSave: PendingStat[] = [];

    // ALL TIME (API)
    statsToSave.push({
      type: 'ride_all',
      data: {
        distance: this.round((stravaApiData.all_ride_totals.distance || 0) / 1000),
        count: stravaApiData.all_ride_totals.count || 0,
        elevation: this.round(stravaApiData.all_ride_totals.elevation_gain || 0),
      },
    });

    // CURRENT YEAR (API)
    statsToSave.push({
      type: `year_${now.getFullYear()}`,
      periodStart: startOfYear(now),
      data: {
        distance: this.round((stravaApiData.ytd_ride_totals.distance || 0) / 1000),
        count: stravaApiData.ytd_ride_totals.count || 0,
        elevation: this.round(stravaApiData.ytd_ride_totals.elevation_gain || 0),
      },
    });

    // LAST 13 MONTHS
    for (let i = 0; i < 13; i++) {
      const date = subMonths(now, i);
      const key = `month_${date.getFullYear()}_${date.getMonth() + 1}`;
      const stat = statsMap.get(key);

      statsToSave.push({
        type: key,
        periodStart: startOfMonth(date),
        data: {
          distance: this.round((stat?.distance || 0) / 1000),
          count: stat?.count || 0,
          elevation: this.round(stat?.elevation || 0),
        },
      });
    }

    // LAST 5 YEARS
    for (let i = 1; i < 5; i++) {
      const date = subYears(now, i);
      const key = `year_${date.getFullYear()}`;
      const stat = statsMap.get(key);

      statsToSave.push({
        type: key,
        periodStart: startOfYear(date),
        data: {
          distance: this.round((stat?.distance || 0) / 1000),
          count: stat?.count || 0,
          elevation: this.round(stat?.elevation || 0),
        },
      });
    }

    // =====================================
    // 5. SAVE STATS
    // =====================================
    await this.prisma.$transaction(
      statsToSave.map((stat) =>
        this.prisma.stravaStats.upsert({
          where: { id: `${userStrava.id}_${stat.type}` },
          update: {
            distance: stat.data.distance,
            count: stat.data.count,
            elevation: stat.data.elevation,
            periodStart: stat.periodStart || null,
            updatedAt: new Date(),
          },
          create: {
            id: `${userStrava.id}_${stat.type}`,
            userId: userStrava.id,
            periodType: stat.type,
            periodStart: stat.periodStart || null,
            distance: stat.data.distance,
            count: stat.data.count,
            elevation: stat.data.elevation,
          },
        })
      )
    );

    // =====================================
    // 6. KEEP ONLY LAST 50 ACTIVITIES
    // =====================================
    const latest = allActivities
      .sort(
        (a, b) =>
          new Date(b.start_date).getTime() -
          new Date(a.start_date).getTime()
      )
      .slice(0, 50);

    await this.prisma.$transaction([
      this.prisma.stravaActivity.deleteMany({
        where: { userStravaId: userStrava.id },
      }),
      ...latest.map((activity) =>
        this.prisma.stravaActivity.create({
          data: {
            id: String(activity.id),
            userStravaId: userStrava.id,
            name: activity.name,
            distance: activity.distance,
            movingTime: activity.moving_time,
            elapsedTime: activity.elapsed_time,
            totalElevationGain: activity.total_elevation_gain,
            type: activity.type,
            startDate: new Date(activity.start_date),
            hasPower: activity.device_watts || false,
            avgWatts: activity.average_watts || 0,
          },
        })
      ),
    ]);

  } catch (error) {
    console.error(`[Strava First Sync Error]`, error);
  }
}
}
