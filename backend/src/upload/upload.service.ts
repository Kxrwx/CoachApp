import { Injectable, BadRequestException, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../r2/r2.service';
import { StorageSource, Prisma } from '@prisma/client';
import * as crypto from 'crypto';

const FitParser = require('fit-file-parser').default;

interface ExtractedMetrics {
  startDate: Date;
  distance?: number;
  totalElevationGain?: number;
  movingTime?: number;
  averageWatts?: number;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private prisma: PrismaService,
    private r2Service: R2Service,
  ) {}

  private async extractStartDate(buffer: Buffer, extension: string): Promise<Date> {
    if (extension === 'gpx') {
      const content = buffer.toString('utf-8');
      const match = content.match(/<time>(.*?)<\/time>/);
      if (match && match[1]) return new Date(match[1]);
      throw new BadRequestException("Date introuvable dans le fichier GPX.");
    }

    if (extension === 'fit') {
      return new Promise((resolve, reject) => {
        const fitParser = new FitParser({ force: true, mode: 'cascade' });
        fitParser.parse(buffer, (error: any, data: any) => {
          if (error) return reject(new BadRequestException("Erreur de lecture du binaire FIT."));
          const startTime = data?.activity?.timestamp || data?.sessions?.[0]?.start_time || data?.records?.[0]?.timestamp || data?.file_ids?.[0]?.time_created;
          if (startTime) resolve(new Date(startTime));
          else reject(new BadRequestException("Aucune date de début trouvée dans le fichier FIT."));
        });
      });
    }
    throw new BadRequestException("Format non pris en charge.");
  }

  private async extractActivityMetrics(buffer: Buffer, extension: string): Promise<ExtractedMetrics> {
    if (extension === 'gpx') {
      const content = buffer.toString('utf-8');
      
      // Extraction de la date
      const timeMatch = content.match(/<time>(.*?)<\/time>/);
      if (!timeMatch || !timeMatch[1]) {
        throw new BadRequestException("Date introuvable dans le fichier GPX.");
      }
      const startDate = new Date(timeMatch[1]);

      // 🔥 Extraction des points de trace pour calculer distance et dénivelé
      const trkptMatches = content.matchAll(/<trkpt lat="([^"]+)" lon="([^"]+)">.*?<ele>([^<]+)<\/ele>.*?<\/trkpt>/gs);
      const points: Array<{ lat: number; lon: number; ele: number }> = [];
      
      for (const match of trkptMatches) {
        points.push({
          lat: parseFloat(match[1]),
          lon: parseFloat(match[2]),
          ele: parseFloat(match[3]),
        });
      }

      let distance = 0;
      let totalElevationGain = 0;

      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        
        // Haversine pour calculer la distance entre deux points
        distance += this.haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon);

        // Dénivelé positif
        const elevDiff = curr.ele - prev.ele;
        if (elevDiff > 0) {
          totalElevationGain += elevDiff;
        }
      }

      return {
        startDate,
        distance: distance > 0 ? distance : undefined, // en kilomètres
        totalElevationGain: totalElevationGain > 0 ? totalElevationGain : undefined, // en mètres
      };
    }

    if (extension === 'fit') {
      return new Promise((resolve, reject) => {
        const fitParser = new FitParser({ force: true, mode: 'cascade' });
        fitParser.parse(buffer, (error: any, data: any) => {
          if (error) {
            this.logger.error(`[FIT Parse] Erreur parsing FIT:`, error);
            return reject(new BadRequestException("Erreur de lecture du binaire FIT."));
          }
          
          // 🔥 LOG LA STRUCTURE COMPLÈTE POUR DEBUG
          this.logger.log(`[FIT Parse] Structure FIT complète:`, JSON.stringify(data, null, 2));
          this.logger.log(`[FIT Parse] Keys au niveau root:`, Object.keys(data || {}));
          if (data?.activity) this.logger.log(`[FIT Parse] Keys activity:`, Object.keys(data.activity));
          if (data?.sessions && data.sessions[0]) this.logger.log(`[FIT Parse] Keys sessions[0]:`, Object.keys(data.sessions[0]));
          if (data?.records && data.records[0]) this.logger.log(`[FIT Parse] Keys records[0]:`, Object.keys(data.records[0]));

          const startTime = data?.activity?.timestamp || data?.sessions?.[0]?.start_time || data?.records?.[0]?.timestamp;
          if (!startTime) {
            this.logger.warn(`[FIT Parse] Aucune date trouvée`);
            return reject(new BadRequestException("Aucune date de début trouvée dans le fichier FIT."));
          }

          const startDate = new Date(startTime);
          const session = data?.sessions?.[0];
          const activity = data?.activity;

          // 🔥 MEILLEURE EXTRACTION : essayer plusieurs chemins pour les données
          let distance = session?.total_distance ?? activity?.total_distance;
          let totalElevationGain = session?.total_ascent ?? activity?.total_ascent ?? session?.elevation_gain ?? activity?.elevation_gain;
          let movingTime = session?.total_elapsed_time ?? session?.total_timer_time ?? activity?.total_elapsed_time ?? activity?.total_timer_time;
          let averageWatts = session?.avg_power ?? activity?.avg_power ?? session?.average_power ?? activity?.average_power;

          this.logger.log(`[FIT Parse] Session raw:`, session);
          this.logger.log(`[FIT Parse] Activity raw:`, activity);

          // Conversion des distances (FIT = mètres)
          if (distance && distance > 0) {
            distance = distance / 1000; // mètres -> km
          }

          this.logger.log(`[FIT Parse] Métriques finales extraites:`, { distance, totalElevationGain, movingTime, averageWatts });

          const metrics: ExtractedMetrics = {
            startDate,
            distance: distance && distance > 0 ? distance : undefined,
            totalElevationGain: totalElevationGain && totalElevationGain > 0 ? totalElevationGain : undefined,
            movingTime: movingTime && movingTime > 0 ? movingTime : undefined,
            averageWatts: averageWatts && averageWatts > 0 ? averageWatts : undefined,
          };

          resolve(metrics);
        });
      });
    }

    throw new BadRequestException("Format non pris en charge.");
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async handleFileUpload(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fichier manquant');
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    if (!extension || !['gpx', 'fit'].includes(extension)) {
      throw new BadRequestException('Format invalide (.gpx/.fit uniquement).');
    }

    const mimeType = extension === 'gpx' ? 'application/gpx+xml' : 'application/octet-stream';
    const metrics = await this.extractActivityMetrics(file.buffer, extension);
    const dataId = crypto.randomUUID();
    const r2Key = `users/${userId}/uploads/${dataId}.${extension}`;

    try {
      await this.r2Service.uploadOrUpdateFile(r2Key, file.buffer, mimeType);

      const result = await this.prisma.$transaction(async (tx) => {
        const uploadDetail = await tx.uploadActivity.create({ data: { dataId } });

        let activity = await tx.activity.findFirst({
          where: {
            userId: userId,
            startDate: {
              gte: new Date(metrics.startDate.getTime() - 60000),
              lte: new Date(metrics.startDate.getTime() + 60000),
            },
          }
        });

        if (activity) {
          activity = await tx.activity.update({
            where: { id: activity.id },
            data: { idUpload: uploadDetail.id }
          });
        } else {
          activity = await tx.activity.create({
            data: { userId, idUpload: uploadDetail.id, startDate: metrics.startDate }
          });
        }

        await tx.storageMetadata.create({
          data: { r2Key, mimeType, fileSize: file.size, source: StorageSource.UPLOAD, activityId: activity.id }
        });

        return { activityId: activity.id, dataId, startDate: metrics.startDate, metrics };
      });

      // 🔥 Mise à jour des records personnels après l'upload
      await this.updatePersonalRecords(userId, metrics);

      return { activityId: result.activityId, dataId: result.dataId, startDate: result.startDate };
    } catch (error) {
      this.logger.error(`Erreur upload pour user ${userId}`, error);
      throw new InternalServerErrorException("Erreur lors de l'enregistrement de l'activité.");
    }
  }

  async deleteUpload(userId: string, activityId: string) {
    try {
      const activity = await this.prisma.activity.findFirst({
        where: { id: activityId, userId },
        include: { 
          uploadDetail: true,
          storage: { where: { source: StorageSource.UPLOAD } } 
        }
      });

      if (!activity || !activity.uploadDetail) {
        throw new NotFoundException("Activité ou fichier d'upload introuvable.");
      }

      for (const file of activity.storage) {
        await this.r2Service.deleteFile(file.r2Key);
        this.logger.log(`[Delete] Fichier R2 supprimé : ${file.r2Key}`);
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.storageMetadata.deleteMany({
          where: { activityId, source: StorageSource.UPLOAD }
        });


        await tx.activity.update({
          where: { id: activityId },
          data: { idUpload: null }
        });

        await tx.uploadActivity.delete({
          where: { id: activity.idUpload! }
        });
      });

      await this.cleanIncompleteActivities(userId);

      return { success: true };
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression de l'upload ${activityId}`, error);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Échec de la suppression.");
    }
  }

  private async cleanIncompleteActivities(userId: string) {
    try {
      const deleted = await this.prisma.activity.deleteMany({
        where: {
          userId: userId,
          idStrava: null,
          idUpload: null
        },
      });
      if (deleted.count > 0) this.logger.log(`[Clean] ${deleted.count} activités vides supprimées.`);
    } catch (error) {
      this.logger.error(`[Clean] Erreur lors du nettoyage :`, error);
    }
  }

  private async updatePersonalRecords(userId: string, metrics: ExtractedMetrics) {
    try {
      if (!metrics || !metrics.distance) {
        this.logger.warn(`[PR Upload] Impossible de MAJ les records : pas assez de données (distance manquante)`);
        return;
      }

      // 🔥 TOUS les records possibles du seed
      const METRICS_MAP: Record<string, { extract: (m: ExtractedMetrics) => number | undefined; convert: (val: number) => number }> = {
        'ride_max_distance_km': {
          extract: (m) => m.distance,
          convert: (val) => this.round(val),
        },
        'ride_max_elevation_gain': {
          extract: (m) => m.totalElevationGain,
          convert: (val) => this.round(val),
        },
        'ride_max_duration_hours': {
          extract: (m) => m.movingTime ? m.movingTime / 3600 : undefined,
          convert: (val) => this.round(val),
        },
        'ride_max_avg_watts': {
          extract: (m) => m.averageWatts,
          convert: (val) => this.round(val),
        },
      };

      const candidates: Array<{ metricKey: string; value: number; achievedAt: Date }> = [];

      // Extraction de tous les metrics disponibles
      for (const [metricKey, { extract, convert }] of Object.entries(METRICS_MAP)) {
        const rawValue = extract(metrics);

        if (rawValue && !isNaN(rawValue) && rawValue > 0) {
          const convertedValue = convert(rawValue);
          candidates.push({
            metricKey,
            value: convertedValue,
            achievedAt: metrics.startDate,
          });
        }
      }

      if (candidates.length === 0) {
        this.logger.warn(`[PR Upload] Aucune métrique valide à enregistrer`);
        return;
      }

      // Récupération des IDs des métriques
      const dbMetrics = await this.prisma.metric.findMany({
        where: {
          key: { in: candidates.map((c) => c.metricKey) },
        },
        select: { id: true, key: true },
      });

      const metricMap = new Map(dbMetrics.map((m) => [m.key, m.id]));
      const upserts: Prisma.PrismaPromise<any>[] = [];

      for (const candidate of candidates) {
        const metricId = metricMap.get(candidate.metricKey);
        if (!metricId) {
          this.logger.warn(`[PR Upload] Métrique '${candidate.metricKey}' non trouvée en BDD`);
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
              value: candidate.value,
              achievedAt: candidate.achievedAt,
              sourceType: 'UPLOAD',
            },
            create: {
              userId,
              metricId,
              value: candidate.value,
              achievedAt: candidate.achievedAt,
              period: 'all_time',
              sourceType: 'UPLOAD',
            },
          })
        );
      }

      if (upserts.length > 0) {
        await this.prisma.$transaction(upserts);
        this.logger.log(`[PR Upload] ${upserts.length} records mis à jour pour l'utilisateur ${userId}`);
      }
    } catch (error) {
      this.logger.error(`[PR Upload] Erreur lors de la mise à jour des records :`, error);
    }
  }

  private round(val: number, decimals: number = 2): number {
    return Math.round(val * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }
}