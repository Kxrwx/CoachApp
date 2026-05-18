
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { startOfMonth, startOfYear, subMonths, subYears, subDays } from 'date-fns';
import { R2Service } from '../r2/r2.service';
import { Prisma, StorageSource } from '@prisma/client';

type UsersStravaWithIntegration = Prisma.UsersStravaGetPayload<{
  include: { integration: true };
}>;

type StravaRawActivity = {
  id: string;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  start_date: string;
  device_watts?: boolean;
  average_watts?: number;
};

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
  constructor(private prisma: PrismaService, private r2Service: R2Service, private logger: Logger) {}

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
        this.cleanIncompleteActivities(userId);
        return { success: true };
      });
    } catch (error) {
    
      throw new BadRequestException("Échec de la liaison avec Strava");
    }
  }

async unlinkAccount(userId: string) {
  try {
    // 1. Récupérer l'intégration et le compte Strava associé
    const integration = await this.prisma.integration.findUnique({
      where: { userId_provider: { userId, provider: 'STRAVA' } },
      include: { usersStrava: true },
    });

    if (!integration?.usersStrava) {
      throw new BadRequestException("Compte Strava non lié");
    }

    const usersStravaId = integration.usersStrava.id;

    // =========================================================
    // 🔥 NETTOYAGE CLOUDFLARE R2 : Récupération et suppression des fichiers
    // =========================================================
    // On cible toutes les métadonnées de stockage Strava liées aux activités de cet utilisateur
    const stravaStorageMetadatas = await this.prisma.storageMetadata.findMany({
      where: {
        source: StorageSource.STRAVA,
        activity: {
          userId: userId,
        },
      },
      select: { id: true, r2Key: true },
    });

    // Suppression physique des fichiers texte sur R2
    if (stravaStorageMetadatas.length > 0) {
      this.logger.log(`[Déliaison] Suppression de ${stravaStorageMetadatas.length} polylines sur R2 pour l'utilisateur ${userId}`);
      for (const meta of stravaStorageMetadatas) {
        await this.r2Service.deleteFile(meta.r2Key);
      }
    }

    // =========================================================
    // TRANSACTION PRISMA : Nettoyage complet de la BDD
    // =========================================================
    await this.prisma.$transaction(async (tx) => {
      // a. On supprime d'abord les lignes de métadonnées maintenant que R2 est propre
      if (stravaStorageMetadatas.length > 0) {
        await tx.storageMetadata.deleteMany({
          where: { id: { in: stravaStorageMetadatas.map((m) => m.id) } },
        });
      }

      // b. Supprimer les détails d'activités Strava en BDD
      await tx.stravaActivity.deleteMany({
        where: { userStravaId: usersStravaId },
      });

      // c. Supprimer les statistiques accumulées
      await tx.stravaStats.deleteMany({
        where: { userId: usersStravaId },
      });

      // d. Rompre le lien avec la table générique des activités de l'utilisateur
      await tx.activity.updateMany({
        where: { 
          userId: userId,
          idStrava: { not: null } 
        },
        data: { idStrava: null },
      });

      // e. Supprimer le profil utilisateur Strava
      await tx.usersStrava.delete({
        where: { id: usersStravaId },
      });

      // f. Supprimer l'intégration d'authentification OAuth
      await tx.integration.delete({
        where: { id: integration.id },
      });
    });

    // Nettoyage final des activités qui n'ont plus ni Strava ni Upload manuel
    this.cleanIncompleteActivities(userId);

    this.logger.log(`[Déliaison] Compte Strava délié avec succès pour l'utilisateur ${userId}`);
    return { success: true };
  } catch (error) {
    // Gestion propre du log de l'erreur avec notre Logger
    const errorMessage = error instanceof Error ? error.stack : String(error);
    this.logger.error(`Échec de la déliaison avec Strava pour l'utilisateur ${userId}`, errorMessage);
    
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
      const userId = userStrava.integration.userId;
      const { accessToken, externalUserId } = userStrava.integration;

      // =====================================
      // 1. FETCH ALL ACTIVITIES (PAGINATION)
      // =====================================
      const allActivities: any[] = []; 
      let page = 1;
      const fiveYearsAgo = subYears(new Date(), 5);
      const afterTimestamp = Math.floor(fiveYearsAgo.getTime() / 1000);

      while (true) {
        const { data } = await axios.get(
          `https://www.strava.com/api/v3/athlete/activities`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { per_page: 200, page, after: afterTimestamp },
          }
        );
        if (!data.length) break;
        allActivities.push(...data);
        if (data.length < 200) break;
        page++;
      }

      if (allActivities.length === 0) return;

    const { data: stravaApiData } = await axios.get(
      `https://www.strava.com/api/v3/athletes/${externalUserId}/stats`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

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

    const statsToSave: PendingStat[] = [];

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

    await this.updatePersonalRecords(
       userId,
        allActivities,
      );

    const thirtyDaysAgo = subDays(now, 30);
      const recentActivities = allActivities.filter(
        (activity) => new Date(activity.start_date).getTime() >= thirtyDaysAgo.getTime()
      );

      // 🔥 NOUVEAU : Récupération des métadonnées R2 pour les activités Strava obsolètes avant suppression
      const oldStorageMetadata = await this.prisma.storageMetadata.findMany({
        where: {
          source: StorageSource.STRAVA,
          activity: {
            userId: userId,
            stravaDetail: { startDate: { lt: thirtyDaysAgo } },
          },
        },
      });

      // Suppression physique des fichiers sur Cloudflare R2
      for (const meta of oldStorageMetadata) {
        await this.r2Service.deleteFile(meta.r2Key);
      }

      // Suppression des lignes de métadonnées associées
      if (oldStorageMetadata.length > 0) {
        await this.prisma.storageMetadata.deleteMany({
          where: { id: { in: oldStorageMetadata.map((m) => m.id) } },
        });
      }

      // ÉTAPE DE SÉCURITÉ BDD : On casse le lien pour les activités de plus de 30 jours
      await this.prisma.activity.updateMany({
        where: {
          userId: userId,
          idStrava: { not: null },
          stravaDetail: { startDate: { lt: thirtyDaysAgo } },
        },
        data: { idStrava: null },
      });

      await this.prisma.stravaActivity.deleteMany({
        where: {
          userStravaId: userStrava.id,
          startDate: { lt: thirtyDaysAgo },
        },
      });

      await this.upsertStravaActivities(userStrava, recentActivities);
      
    } catch (error) {
      console.error(`[Strava First Sync Error]`, error);
    }
  }

  private async upsertStravaActivities(
    userStrava: UsersStravaWithIntegration,
    activities: any[]
  ) {
    if (!activities?.length) return;

    const userId = userStrava.integration.userId;

    // 1. CHARGEMENT DE L'EXISTANT
    const existing = await this.prisma.activity.findMany({
      where: { userId },
      select: { id: true, idStrava: true, startDate: true },
    });

    const byStravaId = new Map<string, typeof existing[number]>();
    const byDate = new Map<string, typeof existing[number]>();

    for (const a of existing) {
      if (a.idStrava) byStravaId.set(a.idStrava, a);
      const key = new Date(a.startDate).toISOString().slice(0, 10);
      byDate.set(key, a);
    }

    const toCreateActivities: any[] = [];
    const linkUpdates: any[] = [];
    const stravaWrites: any[] = [];

    for (const rawAct of activities) {
      if (!rawAct?.id || !rawAct?.start_date) continue;
      const stravaId = String(rawAct.id);
      const dateKey = new Date(rawAct.start_date).toISOString().slice(0, 10);

      const byId = byStravaId.get(stravaId);
      const byDateMatch = byDate.get(dateKey);

      stravaWrites.push({ id: stravaId, act: rawAct });

      if (byId) continue;

      if (byDateMatch) {
        linkUpdates.push({ activityId: byDateMatch.id, stravaId });
      } else {
        toCreateActivities.push({
          userId,
          idStrava: stravaId,
          startDate: new Date(rawAct.start_date),
        });
      }
    }

    // 🔥 ÉTAPE A : UPSERT STRAVA ACTIVITY (LE PARENT)
    await this.prisma.$transaction(
      stravaWrites.map((w) =>
        this.prisma.stravaActivity.upsert({
          where: { id: w.id },
          update: {
            name: w.act.name,
            distance: w.act.distance,
            movingTime: w.act.moving_time,
            elapsedTime: w.act.elapsed_time,
            totalElevationGain: w.act.total_elevation_gain,
            type: w.act.type,
            startDate: new Date(w.act.start_date),
            hasPower: !!w.act.device_watts,
            avgWatts: w.act.average_watts ?? 0,
          },
          create: {
            id: w.id,
            userStravaId: userStrava.id,
            name: w.act.name,
            distance: w.act.distance,
            movingTime: w.act.moving_time,
            elapsedTime: w.act.elapsed_time,
            totalElevationGain: w.act.total_elevation_gain,
            type: w.act.type,
            startDate: new Date(w.act.start_date),
            hasPower: !!w.act.device_watts,
            avgWatts: w.act.average_watts ?? 0,
          },
        })
      )
    );

    // 🔥 ÉTAPE B : CREATE MISSING ACTIVITIES
    if (toCreateActivities.length > 0) {
      await this.prisma.activity.createMany({
        data: toCreateActivities,
        skipDuplicates: true,
      });
    }

    // 🔥 ÉTAPE C : APPLY LINKS
    if (linkUpdates.length > 0) {
      await this.prisma.$transaction(
        linkUpdates.map((l) =>
          this.prisma.activity.update({
            where: { id: l.activityId },
            data: { idStrava: l.stravaId },
          })
        )
      );
    }

    // =====================================
    // 🔥 ÉTAPE D : EXTRACTION ET UPSERT DE LA POLYLINE DANS CLOUDFLARE R2
    // =====================================
    // On récupère toutes les activités liées pour avoir l'ID interne de notre table générique 'Activity'
    const finalLinkedActivities = await this.prisma.activity.findMany({
      where: {
        userId,
        idStrava: { in: stravaWrites.map((w) => w.id) },
      },
      select: { id: true, idStrava: true },
    });

    const activityIdByStravaId = new Map<string, string>();
    for (const fa of finalLinkedActivities) {
      if (fa.idStrava) activityIdByStravaId.set(fa.idStrava, fa.id);
    }

    // On boucle sur nos écritures pour pousser uniquement la polyline sur R2
    for (const w of stravaWrites) {
      const activityId = activityIdByStravaId.get(w.id);
      if (!activityId) continue;

      // 1. Extraction de la polyline textuelle de l'objet map de Strava
      const polyline = w.act.map?.summary_polyline;
      
      // Si Strava n'a pas généré de carte pour cette activité (ex: saisie manuelle sans GPS), on skip
      if (!polyline) {
        this.logger.warn(`Aucune polyline trouvée pour l'activité Strava ID : ${w.id}. Stockage R2 ignoré.`);
        continue;
      }

      // 2. Définition d'une clé R2 propre avec l'extension .txt
      const r2Key = `users/${userId}/strava/${w.id}_polyline.txt`;
      
      // Conversion de la chaîne de caractères brute en Buffer (encodé en UTF-8)
      const fileBuffer = Buffer.from(polyline, 'utf-8');

      // 3. Envoi vers R2 sous le type MIME 'text/plain' (écrase si déjà existant)
      await this.r2Service.uploadOrUpdateFile(r2Key, fileBuffer, 'text/plain');

      // 4. Enregistrement / Mise à jour des métadonnées de stockage dans PostgreSQL
      await this.prisma.storageMetadata.upsert({
        where: { r2Key },
        update: {
          fileSize: fileBuffer.length,
          mimeType: 'text/plain',
        },
        create: {
          r2Key,
          mimeType: 'text/plain',
          fileSize: fileBuffer.length,
          source: StorageSource.STRAVA,
          activityId: activityId,
        },
      });
    }
  }

private async cleanIncompleteActivities(userId: string) {
  try {
    const deleted = await this.prisma.activity.deleteMany({
      where: {
        userId : userId,
        AND: [
          { idStrava: null },
          { idUpload: null }
        ]
      },
    });

    if (deleted.count > 0) {
      this.logger.log(`[Clean] ${deleted.count} activités incomplètes supprimées.`);
    }
  } catch (error) {
    this.logger.error(`[Clean] Erreur lors du nettoyage :`, error);
  }
}

private async updatePersonalRecords(
  userId: string,
  allActivities: any[],
) {
  // 1. Sécurité d'entrée
  if (!allActivities?.length) return;

  // 2. On garde tous les types de vélo
  const rideTypes = ['Ride', 'VirtualRide', 'GravelRide', 'MountainBikeRide', 'EBikeRide'];
  const rides = allActivities.filter((a) => rideTypes.includes(a.type));

  if (!rides.length) return;

  // 🔥 TOUS les records possibles du seed
  const METRICS_MAP: Record<string, { extract: (act: any) => number | undefined; convert: (val: number) => number }> = {
    'ride_max_distance_km': {
      extract: (act) => act.distance ? act.distance / 1000 : undefined,
      convert: (val) => this.round(val),
    },
    'ride_max_elevation_gain': {
      extract: (act) => act.total_elevation_gain,
      convert: (val) => this.round(val),
    },
    'ride_max_duration_hours': {
      extract: (act) => act.moving_time ? act.moving_time / 3600 : undefined,
      convert: (val) => this.round(val),
    },
    'ride_max_avg_watts': {
      extract: (act) => act.average_watts,
      convert: (val) => this.round(val),
    },
    'cadence_avg': {
      extract: (act) => act.average_cadence,
      convert: (val) => this.round(val),
    },
    'cadence_max': {
      extract: (act) => act.max_cadence,
      convert: (val) => this.round(val),
    },
    'hr_avg': {
      extract: (act) => act.average_heartrate,
      convert: (val) => this.round(val),
    },
    'hr_max': {
      extract: (act) => act.max_heartrate,
      convert: (val) => this.round(val),
    },
    'speed_avg': {
      extract: (act) => act.average_speed ? act.average_speed * 3.6 : undefined, // m/s -> km/h
      convert: (val) => this.round(val),
    },
    'speed_max': {
      extract: (act) => act.max_speed ? act.max_speed * 3.6 : undefined, // m/s -> km/h
      convert: (val) => this.round(val),
    },
    'kj_total': {
      extract: (act) => act.kilojoules,
      convert: (val) => this.round(val),
    },
  };

  const candidates: Array<{ metricKey: string; value: number; achievedAt: Date }> = [];

  // 3. Extraction et conversion des données de l'API Strava
  for (const act of rides) {
    const date = new Date(act.start_date || act.start_date_local);

    // 🔥 Boucle sur tous les metrics disponibles
    for (const [metricKey, { extract, convert }] of Object.entries(METRICS_MAP)) {
      const rawValue = extract(act);

      // Validation : > 0 et pas NaN
      if (rawValue && !isNaN(rawValue) && rawValue > 0) {
        const convertedValue = convert(rawValue);
        candidates.push({
          metricKey,
          value: convertedValue,
          achievedAt: date,
        });
      }
    }
  }

  if (candidates.length === 0) {
    this.logger.warn(`[PR Sync] Aucune métrique valide à enregistrer`);
    return;
  }

  // 4. Extraction du maximum absolu par métrique (All-Time)
  const bestByMetric = new Map<string, { value: number; date: Date }>();

  for (const pr of candidates) {
    const existing = bestByMetric.get(pr.metricKey);
    if (!existing || pr.value > existing.value) {
      bestByMetric.set(pr.metricKey, {
        value: pr.value,
        date: pr.achievedAt,
      });
    }
  }

  // 5. Récupération des IDs des métriques en BDD
  const metrics = await this.prisma.metric.findMany({
    where: {
      key: { in: Array.from(bestByMetric.keys()) },
    },
    select: { id: true, key: true },
  });

  const metricMap = new Map(metrics.map((m) => [m.key, m.id]));
  const upserts: Prisma.PrismaPromise<any>[] = [];

  // 6. Préparation de la sauvegarde forcée en base de données
  for (const [metricKey, best] of bestByMetric.entries()) {
    const metricId = metricMap.get(metricKey);
    
    if (!metricId) {
      this.logger.warn(`[PR Sync] Métrique '${metricKey}' non trouvée en BDD`);
      continue;
    }

    upserts.push(
      this.prisma.personalRecord.upsert({
        where: {
          userId_metricId_period: {
            userId,
            metricId,
            period: 'all_time',
          },
        },
        update: {
          value: best.value,
          achievedAt: best.date,
          sourceType: 'STRAVA',
        },
        create: {
          userId,
          metricId,
          value: best.value,
          achievedAt: best.date,
          period: 'all_time',
          sourceType: 'STRAVA',
        },
      })
    );
  }

  // 7. Exécution globale et atomique
  if (upserts.length > 0) {
    await this.prisma.$transaction(upserts);
    this.logger.log(`[PR Sync] ${upserts.length} records mis à jour avec succès pour l'utilisateur ${userId}`);
  }
}
}
