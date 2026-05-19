import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 
import { startOfMonth, startOfYear } from 'date-fns';
import { Prisma } from '@prisma/client';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(private prisma: PrismaService) {}

  async recomputeGlobalStats(userId: string) {
    try {
      this.logger.log(`[Stats] Début du recalcul des statistiques globales pour ${userId}`);

      // 1. On trouve d'abord le profil Strava lié à cet utilisateur global
      const userStrava = await this.prisma.usersStrava.findFirst({
        where: {
          integration: {
            userId: userId,
            provider: 'STRAVA'
          }
        }
      });

      // 2. On récupère les stats Strava en utilisant l'ID du profil Strava (s'il existe)
      const stravaStats = userStrava 
        ? await this.prisma.stravaStats.findMany({
            where: { userId: userStrava.id },
          })
        : [];

      // 3. On récupère les activités manuelles (Upload)
      const manualActivities = await this.prisma.activity.findMany({
        where: { 
          userId, 
          idStrava: null, 
          idUpload: { not: null }
        },
        include: { 
          uploadDetail: true 
        }
      });

      const aggregatedStats = new Map<string, { 
        distance: number; 
        elevation: number; 
        count: number; 
        periodStart: Date | null;
      }>();

      const ensurePeriod = (key: string, date: Date | null) => {
        if (!aggregatedStats.has(key)) {
          aggregatedStats.set(key, { distance: 0, elevation: 0, count: 0, periodStart: date });
        }
        return aggregatedStats.get(key)!;
      };

      for (const stat of stravaStats) {
        const period = ensurePeriod(stat.periodType, stat.periodStart);
        period.distance += stat.distance;
        period.elevation += stat.elevation;
        period.count += stat.count;
      }

      let totalManualDistance = 0;
      let totalManualElevation = 0;
      let totalManualCount = 0;

      for (const act of manualActivities) {
        const distance = 0; 
        const elevation = 0;

        const date = new Date(act.startDate);
        const yearKey = `year_${date.getFullYear()}`;
        const monthKey = `month_${date.getFullYear()}_${date.getMonth() + 1}`;

        const yearTarget = ensurePeriod(yearKey, startOfYear(date));
        yearTarget.distance += distance;
        yearTarget.elevation += elevation;
        yearTarget.count += 1;

        const monthTarget = ensurePeriod(monthKey, startOfMonth(date));
        monthTarget.distance += distance;
        monthTarget.elevation += elevation;
        monthTarget.count += 1;

        totalManualDistance += distance;
        totalManualElevation += elevation;
        totalManualCount += 1;
      }

      if (manualActivities.length > 0) {
        const allTarget = ensurePeriod('ride_all', null);
        allTarget.distance += totalManualDistance;
        allTarget.elevation += totalManualElevation;
        allTarget.count += totalManualCount;
      }

      const upserts: Prisma.PrismaPromise<any>[] = [];

      for (const [periodType, data] of aggregatedStats.entries()) {
        upserts.push(
          this.prisma.stats.upsert({
            where: {
              userId_periodType: { userId, periodType },
            },
            update: {
              distance: data.distance,
              elevation: data.elevation,
              count: data.count,
              periodStart: data.periodStart,
              updatedAt: new Date(),
            },
            create: {
              userId,
              periodType,
              distance: data.distance,
              elevation: data.elevation,
              count: data.count,
              periodStart: data.periodStart,
            },
          })
        );
      }

      if (upserts.length > 0) {
        await this.prisma.$transaction(upserts);
      }

      // 5. Nettoyage des périodes obsolètes (ex: si des mois disparaissent après un Unlink Strava)
      const periodsToKeep = Array.from(aggregatedStats.keys());
      await this.prisma.stats.deleteMany({
        where: {
          userId,
          periodType: { notIn: periodsToKeep }
        }
      });

      this.logger.log(`[Stats] Recalcul terminé. ${upserts.length} périodes mises à jour.`);
    } catch (error) {
      this.logger.error(`[Stats] Erreur lors du recalcul des stats pour ${userId}`, error);
    }
  }

  // ============================================================
  // LOGIQUE DE DELTA (AJOUT / RETRAIT)
  // ============================================================

  /**
   * À appeler AVANT de supprimer le compte Strava dans StravaService
   */
  async subtractStravaStats(userId: string, userStravaId: string) {
    this.logger.log(`[Stats] Soustraction des stats Strava pour l'utilisateur ${userId}`);

    const stravaStats = await this.prisma.stravaStats.findMany({
      where: { userId: userStravaId },
    });

    if (stravaStats.length === 0) return;

    // On prépare les décrémentations
    const updates = stravaStats.map((stat) =>
      this.prisma.stats.updateMany({
        where: { userId, periodType: stat.periodType },
        data: {
          distance: { decrement: stat.distance },
          elevation: { decrement: stat.elevation },
          count: { decrement: stat.count },
        },
      })
    );

    await this.prisma.$transaction(updates);

    // Nettoyage : on supprime les périodes qui tombent à 0 activité
    await this.prisma.stats.deleteMany({
      where: { userId, count: { lte: 0 } },
    });

    this.logger.log(`[Stats] Soustraction terminée. ${stravaStats.length} périodes ajustées.`);
  }

  /**
   * À appeler lors d'un NOUVEL upload dans UploadService
   */
  async addUploadStats(userId: string, distance: number, elevation: number, date: Date) {
    const yearKey = `year_${date.getFullYear()}`;
    const monthKey = `month_${date.getFullYear()}_${date.getMonth() + 1}`;

    const periods = [
      { type: 'ride_all', start: null },
      { type: yearKey, start: startOfYear(date) },
      { type: monthKey, start: startOfMonth(date) },
    ];

    const upserts = periods.map((p) =>
      this.prisma.stats.upsert({
        where: { userId_periodType: { userId, periodType: p.type } },
        update: {
          distance: { increment: distance },
          elevation: { increment: elevation },
          count: { increment: 1 },
          updatedAt: new Date(),
        },
        create: {
          userId,
          periodType: p.type,
          distance,
          elevation,
          count: 1,
          periodStart: p.start,
        },
      })
    );

    await this.prisma.$transaction(upserts);
    this.logger.log(`[Stats] Activité manuelle ajoutée aux stats globales de ${userId}.`);
  }

  /**
   * À appeler lors de la SUPPRESSION d'un upload dans UploadService
   */
  async removeUploadStats(userId: string, distance: number, elevation: number, date: Date) {
    const yearKey = `year_${date.getFullYear()}`;
    const monthKey = `month_${date.getFullYear()}_${date.getMonth() + 1}`;

    const periods = ['ride_all', yearKey, monthKey];

    const updates = periods.map((type) =>
      this.prisma.stats.updateMany({
        where: { userId, periodType: type },
        data: {
          distance: { decrement: distance },
          elevation: { decrement: elevation },
          count: { decrement: 1 },
        },
      })
    );

    await this.prisma.$transaction(updates);

    await this.prisma.stats.deleteMany({
      where: { userId, count: { lte: 0 } },
    });

    this.logger.log(`[Stats] Activité manuelle retirée des stats globales de ${userId}.`);
  }
}