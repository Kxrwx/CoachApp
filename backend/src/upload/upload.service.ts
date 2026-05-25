// src/upload/upload.service.ts
import {
  Injectable,
  BadRequestException,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../r2/r2.service';
import { StatsService } from '../stats/stats.service';
import { StorageSource, Prisma } from '@prisma/client';
import * as crypto from 'crypto';

const FitParser = require('fit-file-parser').default;

interface ExtractedActivityMetrics {
  startDate: Date;
  metrics: Record<string, number>;
}

function round(val: number, decimals: number = 2): number {
  return Math.round(val * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private prisma: PrismaService,
    private r2Service: R2Service,
    private statsService: StatsService,
  ) {}


  /**
   *
   *
   * @private
   * @param {Buffer} buffer => fichier a traiter
   * @param {string} extension => extension du fichier a traiter (gpx ou fit)
   * @return {*} => traite un fichier gpx ou fit et retourne les données décodées (date de début, distance, dénivelé, etc.)
   * @memberof UploadService
   */
  private async extractActivityMetrics(
    buffer: Buffer,
    extension: string,
  ): Promise<ExtractedActivityMetrics> {
    if (extension === 'gpx') return this.extractGpxMetrics(buffer);
    if (extension === 'fit') return this.extractFitMetrics(buffer);
    throw new BadRequestException('Format non pris en charge.');
  }


  /**
   *
   *
   * @private
   * @param {Buffer} buffer => fichier a traiter
   * @return {*} => retourne les data du GPX sous forme de valeurs numériques (distance, dénivelé, etc.) et la date de début de l'activité
   * @memberof UploadService
   */
  private extractGpxMetrics(buffer: Buffer): ExtractedActivityMetrics {
    const content = buffer.toString('utf-8');

    const timeMatch = content.match(/<time>(.*?)<\/time>/);
    if (!timeMatch?.[1]) throw new BadRequestException('Date introuvable dans le fichier GPX.');
    const startDate = new Date(timeMatch[1]);

    const trkptMatches = content.matchAll(
      /<trkpt lat="([^"]+)" lon="([^"]+)">.*?<ele>([^<]+)<\/ele>.*?<\/trkpt>/gs,
    );
    const points: Array<{ lat: number; lon: number; ele: number }> = [];
    for (const match of trkptMatches) {
      points.push({ lat: parseFloat(match[1]), lon: parseFloat(match[2]), ele: parseFloat(match[3]) });
    }

    let distance = 0;
    let elevationGain = 0;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      distance += this.haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon);
      const diff = curr.ele - prev.ele;
      if (diff > 0) elevationGain += diff;
    }

    const metrics: Record<string, number> = {};
    if (distance > 0)      metrics['ride_max_distance_km']    = round(distance);
    if (elevationGain > 0) metrics['ride_max_elevation_gain'] = round(elevationGain);

    return { startDate, metrics };
  }



  /**
   *
   *
   * @private
   * @param {Buffer} buffer => fichier a traiter
   * @return {*} => traite un fichier fit et retourne les données décodées (date de début, distance, dénivelé, etc.)
   * @memberof UploadService
   */
  private extractFitMetrics(buffer: Buffer): Promise<ExtractedActivityMetrics> {
    return new Promise((resolve, reject) => {
      const fitParser = new FitParser({ force: true, mode: 'cascade' });

      fitParser.parse(buffer, (error: any, data: any) => {
        if (error) {
          return reject(new BadRequestException('Erreur de lecture du binaire FIT.'));
        }

        const activity = data?.activity;
        const session  = activity?.sessions?.[0];

        if (!session) {
          return reject(new BadRequestException('Aucune session trouvée dans le fichier FIT.'));
        }

        const startRaw =
          session.start_time ??
          activity.timestamp ??
          data?.file_ids?.[0]?.time_created;

        if (!startRaw) {
          return reject(new BadRequestException('Aucune date de début trouvée dans le fichier FIT.'));
        }
        const startDate = new Date(startRaw);

        const metrics: Record<string, number> = {};

        if (session.total_distance > 0) {
          metrics['ride_max_distance_km'] = round(session.total_distance / 1000);
        }

        if (session.total_ascent > 0) {
          metrics['ride_max_elevation_gain'] = round(session.total_ascent);
        }

        if (session.total_elapsed_time > 0) {
          metrics['ride_max_duration_hours'] = round(session.total_elapsed_time / 3600);
        }

        if (session.avg_power > 0) {
          metrics['ride_max_avg_watts'] = round(session.avg_power);
        }

        if (session.avg_cadence > 0) metrics['cadence_avg'] = round(session.avg_cadence);
        if (session.max_cadence > 0) metrics['cadence_max'] = round(session.max_cadence);

        if (session.avg_heart_rate > 0) metrics['hr_avg'] = round(session.avg_heart_rate);
        if (session.max_heart_rate > 0) metrics['hr_max'] = round(session.max_heart_rate);

        if (session.avg_speed > 0) metrics['speed_avg'] = round(session.avg_speed * 3.6);
        if (session.max_speed > 0) metrics['speed_max'] = round(session.max_speed * 3.6);

        if (session.total_work > 0) {
          metrics['kj_total'] = round(session.total_work / 1000);
        } else if (session.kilojoules > 0) {
          metrics['kj_total'] = round(session.kilojoules);
        }

        this.logger.log(
          `[FIT] Métriques extraites — début: ${startDate.toISOString()} | ${JSON.stringify(metrics)}`,
        );

        resolve({ startDate, metrics });
      });
    });
  }

  /**
   *
   *
   * @private
   * @param {number} lat1 => latitude du point 1
   * @param {number} lon1 => longitude du point 1
   * @param {number} lat2 => latitude du point 2
   * @param {number} lon2 => longitude du point 2
   * @return {*} => retourne la distance en kilomètres entre les deux points géographiques
   * @memberof UploadService
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }


  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur de l'app
   * @param {Express.Multer.File} file => fichier uploadé par l'utilisateur
   * @return {*} => traite le fichier uploadé, extrait les données, les stocke, crée ou met à jour l'activité correspondante, et met à jour les records personnels et stats de l'utilisateur
   * @memberof UploadService
   */
  async handleFileUpload(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fichier manquant');

    const extension = file.originalname.split('.').pop()?.toLowerCase();
    if (!extension || !['gpx', 'fit'].includes(extension)) {
      throw new BadRequestException('Format invalide (.gpx/.fit uniquement).');
    }

    const mimeType = extension === 'gpx' ? 'application/gpx+xml' : 'application/octet-stream';
    const parsedData = await this.extractActivityMetrics(file.buffer, extension);
    const dataId = crypto.randomUUID();
    const r2Key = `users/${userId}/uploads/${dataId}.${extension}`;

    const fileDistance = parsedData.metrics['ride_max_distance_km'] || 0;
    const fileElevation = parsedData.metrics['ride_max_elevation_gain'] || 0;

    try {
      await this.r2Service.uploadOrUpdateFile(r2Key, file.buffer, mimeType);

      const result = await this.prisma.$transaction(async (tx) => {
        const uploadDetail = await tx.uploadActivity.create({
          data: {
            dataId,
            distance: fileDistance,
            elevation: fileElevation,
          },
        });

        let activity = await tx.activity.findFirst({
          where: {
            userId,
            startDate: {
              gte: new Date(parsedData.startDate.getTime() - 60_000),
              lte: new Date(parsedData.startDate.getTime() + 60_000),
            },
          },
        });

        if (activity) {
          activity = await tx.activity.update({
            where: { id: activity.id },
            data: { idUpload: uploadDetail.id },
          });
        } else {
          activity = await tx.activity.create({
            data: { userId, idUpload: uploadDetail.id, startDate: parsedData.startDate },
          });
        }

        await tx.storageMetadata.create({
          data: {
            r2Key,
            mimeType,
            fileSize: file.size,
            source: StorageSource.UPLOAD,
            activityId: activity.id,
          },
        });

        return { activityId: activity.id, dataId, startDate: parsedData.startDate };
      });

      await this.updatePersonalRecords(userId, parsedData.metrics, parsedData.startDate);
      await this.statsService.addUploadStats(userId, fileDistance, fileElevation, parsedData.startDate);

      return result;
    } catch (error) {
      this.logger.error(`Erreur upload pour user ${userId}`, error);
      throw new InternalServerErrorException("Erreur lors de l'enregistrement de l'activité.");
    }
  }


  /**
   *
   *
   * @private
   * @param {string} userId => l'id de l'utilisateur de l'app
   * @param {Record<string, number>} incomingMetrics => les métriques extraites du fichier uploadé (distance, dénivelé, etc.)
   * @param {Date} achievedAt => la date de début de l'activité uploadée
   * @return {*} => compare les métriques extraites du fichier avec les records personnels existants de l'utilisateur, et met à jour les records si les nouvelles valeurs sont meilleures
   * @memberof UploadService
   */
  private async updatePersonalRecords(
    userId: string,
    incomingMetrics: Record<string, number>,
    achievedAt: Date,
  ) {
    const metricKeys = Object.keys(incomingMetrics);
    if (metricKeys.length === 0) {
      this.logger.warn(`[PR Upload] Aucune métrique extraite du fichier pour ${userId}`);
      return;
    }

    try {

      const dbMetrics = await this.prisma.metric.findMany({
        where: { key: { in: metricKeys } },
        select: { id: true, key: true },
      });
      const metricMap = new Map(dbMetrics.map((m) => [m.key, m.id]));

      for (const key of metricKeys) {
        if (!metricMap.has(key)) {
          this.logger.warn(`[PR Upload] Clé métrique absente du seed : ${key}`);
        }
      }

      const currentRecords = await this.prisma.personalRecord.findMany({
        where: {
          userId,
          metricId: { in: Array.from(metricMap.values()) },
          period: 'all_time',
        },
      });

      const upserts: Prisma.PrismaPromise<any>[] = [];

      for (const [key, value] of Object.entries(incomingMetrics)) {
        const metricId = metricMap.get(key);
        if (!metricId) continue;

        const existing = currentRecords.find((r) => r.metricId === metricId);

        if (!existing || value > existing.value) {
          upserts.push(
            this.prisma.personalRecord.upsert({
              where: { userId_metricId_period: { userId, metricId, period: 'all_time' } },
              update:  { value, achievedAt, sourceType: 'UPLOAD' },
              create:  { userId, metricId, value, achievedAt, period: 'all_time', sourceType: 'UPLOAD' },
            }),
          );
        }
      }

      if (upserts.length > 0) {
        await this.prisma.$transaction(upserts);
        this.logger.log(`[PR Upload] ${upserts.length} record(s) mis à jour pour ${userId}`);
      } else {
        this.logger.log(
          `[PR Upload] Aucun nouveau record pour ${userId} (valeurs inférieures aux records existants)`,
        );
      }
    } catch (error) {
      this.logger.error(`[PR Upload] Erreur lors de la mise à jour des records :`, error);
    }
  }



  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur de l'app
   * @param {string} activityId => l'id de l'activité de l'upload a delete
   * @return {*} => supprime une actité de R2
   * @memberof UploadService
   */
  async deleteUpload(userId: string, activityId: string) {
    try {
      const activity = await this.prisma.activity.findFirst({
        where: { id: activityId, userId },
        include: {
          uploadDetail: true,
          storage: { where: { source: StorageSource.UPLOAD } },
        },
      });

      if (!activity?.uploadDetail) {
        throw new NotFoundException("Activité ou fichier d'upload introuvable.");
      }

      // Récupérer les stats avant suppression pour les enlever
      const uploadDistance = activity.uploadDetail.distance || 0;
      const uploadElevation = activity.uploadDetail.elevation || 0;

      for (const file of activity.storage) {
        await this.r2Service.deleteFile(file.r2Key);
        this.logger.log(`[Delete] Fichier R2 supprimé : ${file.r2Key}`);
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.storageMetadata.deleteMany({ where: { activityId, source: StorageSource.UPLOAD } });
        await tx.activity.update({ where: { id: activityId }, data: { idUpload: null } });
        await tx.uploadActivity.delete({ where: { id: activity.idUpload! } });
      });

      // Enlever les stats de l'upload
      await this.statsService.removeUploadStats(userId, uploadDistance, uploadElevation, activity.startDate);

      await this.cleanIncompleteActivities(userId);
      return { success: true };
    } catch (error) {
      this.logger.error(`Erreur suppression upload ${activityId}`, error);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Échec de la suppression.');
    }
  }


  /**
   *
   *
   * @private
   * @param {string} userId => l'id de l'utilisateur de l'app
   * @return {*} => supprime les activités orphelines (sans idStrava ni idUpload) de l'utilisateur, généralement après une suppression d'upload
   * @memberof UploadService
   */
  private async cleanIncompleteActivities(userId: string) {
    try {
      const deleted = await this.prisma.activity.deleteMany({
        where: { userId, AND: [{ idStrava: null }, { idUpload: null }] },
      });
      if (deleted.count > 0) {
        this.logger.log(`[Clean] ${deleted.count} activité(s) orpheline(s) supprimée(s).`);
      }
    } catch (error) {
      this.logger.error(`[Clean] Erreur nettoyage :`, error);
    }
  }
}