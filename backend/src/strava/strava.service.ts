import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import ca from 'zod/v4/locales/ca.js';

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

}