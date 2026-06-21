// src/stats/stats.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 
import { startOfMonth, startOfYear } from 'date-fns';
import { Prisma } from '@prisma/client';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Reset la table stats de l'utilisateur et la recalcule uniquement avec les uploads
   * @param userId - l'id de l'utilisateur
   */
  async recomputeStatsFromUploadsOnly(userId: string) {
    try {
      this.logger.log(`[Stats] Recalcul des stats à partir des uploads uniquement pour ${userId}`);

      await this.prisma.stats.deleteMany({ where: { userId } });

      const uploadActivities = await this.prisma.activity.findMany({
        where: {
          userId,
          idUpload: { not: null },
        },
        include: {
          uploadDetail: true,
        },
      });

      if (uploadActivities.length === 0) {
        this.logger.log(`[Stats] Aucune activité uploadée trouvée pour ${userId}`);
        return;
      }

      const aggregatedStats = new Map<
        string,
        { distance: number; elevation: number; count: number; periodStart: Date | null }
      >();

      const ensurePeriod = (key: string, date: Date | null) => {
        if (!aggregatedStats.has(key)) {
          aggregatedStats.set(key, { distance: 0, elevation: 0, count: 0, periodStart: date });
        }
        return aggregatedStats.get(key)!;
      };

      let totalDistance = 0;
      let totalElevation = 0;

      for (const act of uploadActivities) {
        const distance = act.uploadDetail?.distance || 0;
        const elevation = act.uploadDetail?.elevation || 0;

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

        totalDistance += distance;
        totalElevation += elevation;
      }

      const allTarget = ensurePeriod('ride_all', null);
      allTarget.distance = totalDistance;
      allTarget.elevation = totalElevation;
      allTarget.count = uploadActivities.length;

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

      this.logger.log(`[Stats] Recalcul from uploads done. ${upserts.length} periods updated.`);
    } catch (error) {
      this.logger.error(`[Stats] Error recomputing from uploads for ${userId}`, error);
    }
  }

  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur de l'app
   * @return {*} => Recalcule les statistiques globales de l'utilisateur en agrégeant les données de Strava et des activités manuelles (uploads), et met à jour la table stats en conséquence. À appeler lors d'un lien/délien de compte Strava, ou après un upload manuel.
   * @memberof StatsService
   */
  async recomputeGlobalStats(userId: string) {
    try {
      this.logger.log(`[Stats] Début du recalcul des statistiques globales pour ${userId}`);

      const userStrava = await this.prisma.usersStrava.findFirst({
        where: {
          integration: {
            userId: userId,
            provider: 'STRAVA'
          }
        }
      });

      const stravaStats = userStrava 
        ? await this.prisma.stravaStats.findMany({
            where: { userId: userStrava.id },
          })
        : [];

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
        const distance = act.uploadDetail?.distance || 0;
        const elevation = act.uploadDetail?.elevation || 0;

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


  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur de l'app
   * @param {string} userStravaId => l'id strava de l'utilisateur
   * @return {*} => Recalcule les statistique en enlevant les stats de Strava
   * @memberof StatsService
   */
  async subtractStravaStats(userId: string, userStravaId: string) {
    this.logger.log(`[Stats] Soustraction des stats Strava pour l'utilisateur ${userId}`);

    const stravaStats = await this.prisma.stravaStats.findMany({
      where: { userId: userStravaId },
    });

    if (stravaStats.length === 0) return;

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

    await this.prisma.stats.deleteMany({
      where: { userId, count: { lte: 0 } },
    });

    this.logger.log(`[Stats] Soustraction terminée. ${stravaStats.length} périodes ajustées.`);
  }


  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur de l'app
   * @param {number} distance => distance a ajouter
   * @param {number} elevation => elevation a ajouter
   * @param {Date} date => date de l'activité
   * @return {*} => Ajoute les stats d'une activité manuelle (upload) aux stats globales de l'utilisateur, en mettant à jour les périodes ride_all, year_YYYY et month_YYYY_MM correspondantes. À appeler lors de l'ajout d'une activité manuelle.
   * @memberof StatsService
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
   *
   *
   * @param {string} userId => l'id de l'utilisateur
   * @param {number} distance => distance a soustraire
   * @param {number} elevation => elevation a soustrire
   * @param {Date} date => date de l'activité
   * @return {*} => Retire les stats d'une activité manuelle (upload) des stats globales de l'utilisateur, en mettant à jour les périodes ride_all, year_YYYY et month_YYYY correspondantes. À appeler lors de la suppression d'une activité manuelle.
   * @memberof StatsService
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

  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur 
   * @return {*} => recupere les stats globals de l'utilisateur pour le dashboard : stats all_time + stats des 12 derniers mois + stats des 6 derniers mois
   * @memberof StatsService
   */
  async getUserDashboardStats(userId: string) {
    const allStats = await this.prisma.stats.findMany({
      where: { userId },
      orderBy: { periodStart: 'desc' }, 
    });

    const allTime = allStats.find(s => s.periodType === 'ride_all') || { 
      distance: 0, 
      elevation: 0, 
      count: 0 
    };
    
    const yearly = allStats.filter(s => s.periodType.startsWith('year_'));
    const monthly = allStats.filter(s => s.periodType.startsWith('month_'));

    return {
      allTime,
      yearly,
      monthly,
    };
  }

  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur
   * @return {*} => recupere les stats all_time de l'utilisateur
   * @memberof StatsService
   */
  async getAllTimeStats(userId: string) {
    const stats = await this.prisma.stats.findUnique({
      where: {
        userId_periodType: { userId, periodType: 'ride_all' },
      },
    });

    return stats || { distance: 0, elevation: 0, count: 0 };
  }

  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur 
   * @param {number} year => années des stats a recupéré
   * @return {*} => recupere les stats de 'year'
   * @memberof StatsService
   */
  async getYearlyStats(userId: string, year: number) {
    const periodType = `year_${year}`;
    const stats = await this.prisma.stats.findUnique({
      where: {
        userId_periodType: { userId, periodType },
      },
    });

    return stats || { distance: 0, elevation: 0, count: 0, periodType };
  }

  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur 
   * @param {number} year => année des stats a recupéré
   * @param {number} month => mois des stats a recupéré
   * @return {*} => recupere les stats de 'month'
   * @memberof StatsService
   */
  async getMonthlyStats(userId: string, year: number, month: number) {
    const periodType = `month_${year}_${month}`;
    const stats = await this.prisma.stats.findUnique({
      where: {
        userId_periodType: { userId, periodType },
      },
    });

    return stats || { distance: 0, elevation: 0, count: 0, periodType };
  }
}