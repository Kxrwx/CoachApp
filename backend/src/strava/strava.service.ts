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
      });

      if (!integration) {
        throw new BadRequestException("Compte Strava non lié");
      }

      await tx.usersStrava.deleteMany({
        where: { integrationId: integration.id },
      });

      await tx.stravaStats.deleteMany({
        where: { userId: integration.userId },
      });

      await tx.integration.delete({
        where: { id: integration.id },
      });
    });

    return { success: true };
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException("Échec de la déliaison avec Strava");
  }
}

private async syncStatsStrava(stravaAthleteId: string | number) {
  try {
    const userStrava = await this.prisma.usersStrava.findFirst({
      where: { 
        integration: { 
          externalUserId: String(stravaAthleteId), 
          provider: 'STRAVA' 
        } 
      },
      include: { integration: true },
    });

    if (!userStrava || !userStrava.integration) return;

    const statsToSave: PendingStat[] = [];

    // --- ALL TIME (API Strava) ---
    const { data: stravaApiData } = await axios.get(
      `https://www.strava.com/api/v3/athletes/${userStrava.integration.externalUserId}/stats`,
      { headers: { Authorization: `Bearer ${userStrava.integration.accessToken}` } }
    );

    statsToSave.push({
      type: 'ride_all',
      data: {
        distance: stravaApiData.all_ride_totals.distance || 0,
        count: stravaApiData.all_ride_totals.count || 0,
        elevation: stravaApiData.all_ride_totals.elevation_gain || 0,
      }
    });

    // --- 13 DERNIERS MOIS (Agrégation DB) ---
    for (let i = 0; i < 13; i++) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = i === 0 ? new Date() : startOfMonth(subMonths(date, -1));

      const aggregate = await this.prisma.stravaActivity.aggregate({
        where: {
          userStravaId: userStrava.id,
          type: 'Ride',
          startDate: { gte: start, lt: end },
        },
        _sum: { distance: true, totalElevationGain: true },
        _count: { id: true },
      });

      statsToSave.push({
        type: `month_${start.getFullYear()}_${start.getMonth() + 1}`,
        periodStart: start,
        data: {
          distance: aggregate._sum.distance || 0,
          count: aggregate._count.id || 0,
          elevation: aggregate._sum.totalElevationGain || 0,
        }
      });
    }

    // --- 5 DERNIÈRES ANNÉES (Agrégation DB) ---
    for (let i = 0; i < 5; i++) {
      const date = subYears(new Date(), i);
      const start = startOfYear(date);
      const end = i === 0 ? new Date() : startOfYear(subYears(date, -1));

      const aggregate = await this.prisma.stravaActivity.aggregate({
        where: {
          userStravaId: userStrava.id,
          type: 'Ride',
          startDate: { gte: start, lt: end },
        },
        _sum: { distance: true, totalElevationGain: true },
        _count: { id: true },
      });

      statsToSave.push({
        type: `year_${start.getFullYear()}`,
        periodStart: start,
        data: {
          distance: aggregate._sum.distance || 0,
          count: aggregate._count.id || 0,
          elevation: aggregate._sum.totalElevationGain || 0,
        }
      });
    }

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

    await this.prisma.usersStrava.update({
      where: { id: userStrava.id },
      data: { syncedAt: new Date() },
    });

  } catch (error) {
    console.error(`[StravaStats] Erreur:`, error);
  }
}
}