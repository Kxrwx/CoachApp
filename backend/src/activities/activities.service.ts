// src/activities/activities.service.ts
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../r2/r2.service';

const FitParser = require('fit-file-parser').default;

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    private prisma: PrismaService,
    private r2Service: R2Service,
  ) {}

  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur de l'app
   * @return {*} => recupere tout les activitées de l'utilisateur (startDate, idStrava, idUpload, etc.) et les retourne dans un tableau
   * @memberof ActivitiesService
   */
  async findAll(userId: string) {
    return this.prisma.activity.findMany({
      where: { userId },
      select: {
        id: true,
        startDate: true,
        idStrava: true,
        idUpload: true,
        stravaDetail: {
          select: {
            name: true,
            type: true,
            distance: true,
          },
        },
        uploadDetail: {
          select: {
            name: true,
            type: true,
            distance: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur de l'app
   * @param {string} id => l'id de l'activité a recupere
   * @return {*} => retourne tout les données de l'activité de maniere detaille
   * @memberof ActivitiesService
   */
  async findOne(userId: string, id: string) {
    const activity = await this.prisma.activity.findFirst({
      where: { id, userId },
      include: {
        stravaDetail: true,
        uploadDetail: true,
        storage: true,
      },
    });

    if (!activity) {
      throw new NotFoundException('Activité introuvable.');
    }

    let decodedFileData: any = null;
    let stravaPolylineContent: string | null = null;

    const uploadFile = activity.storage.find(
      (s) => s.source === 'UPLOAD',
    );

    if (uploadFile) {
      try {
        const buffer = await this.r2Service.getFile(uploadFile.r2Key);

        decodedFileData = await this.parseFitBuffer(buffer);
      } catch (e) {
        this.logger.error('Erreur parsing FIT', e);
      }
    }

    const polylineFile = activity.storage.find(
      (s) => s.source === 'STRAVA',
    );

    if (polylineFile) {
      try {
        const polyBuffer = await this.r2Service.getFile(
          polylineFile.r2Key,
        );

        stravaPolylineContent = polyBuffer.toString('utf-8');
      } catch (e) {
        this.logger.error('Erreur récupération polyline', e);
      }
    }

    return {
      ...activity,

      displayInfo: {
        name:
          activity.stravaDetail?.name ||
          'Activité manuelle',

        distance:
          activity.stravaDetail?.distance || 0,

        movingTime:
          activity.stravaDetail?.movingTime || 0,

        elevation:
          activity.stravaDetail?.totalElevationGain || 0,

        type:
          activity.stravaDetail?.type || 'Workout',
      },

      decodedFileData,
      stravaPolylineContent,
    };
  }

  /**
   *
   *
   * @private
   * @param {Buffer} buffer => fichier a traiter
   * @return {*} => traite un fichier fit et retourne les données décodées (laps, records, stats, etc.)
   * @memberof ActivitiesService
   */
  private async parseFitBuffer(
  buffer: Buffer,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const fitParser = new FitParser({
      force: true,

      speedUnit: 'm/s',

      lengthUnit: 'm',

      mode: 'list',
    });

    fitParser.parse(
      buffer,
      (error: any, data: any) => {
        if (error) {
          console.error(error);
          return reject(error);
        }

        const session =
          data.sessions?.[0] || {};

        const records =
          data.records || [];

        const laps =
          data.laps || [];


        const totalDistance =
          session.total_distance ??
          records.at(-1)?.distance ??
          0;

        const avgHeartRate =
          session.avg_heart_rate ??
          average(
            records
              .map((r) => r.heart_rate)
              .filter(Boolean),
          );

        const maxHeartRate =
          session.max_heart_rate ??
          max(
            records.map(
              (r) => r.heart_rate,
            ),
          );

        const avgPower =
          session.avg_power ??
          average(
            records
              .map((r) => r.power)
              .filter(Boolean),
          );

        const maxPower =
          session.max_power ??
          max(
            records.map((r) => r.power),
          );

        const avgSpeedMs =
          session.enhanced_avg_speed ??
          session.avg_speed ??
          average(
            records
              .map((r) => r.speed)
              .filter(Boolean),
          );

        const maxSpeedMs =
          session.enhanced_max_speed ??
          session.max_speed ??
          max(
            records.map((r) => r.speed),
          );

        resolve({
          file_ids: data.file_ids || [],

          laps,
          records,
          stats: {
            sport:
              session.sport ||
              data.sport ||
              'unknown',

            total_distance:
              totalDistance || 0,

            total_timer_time:
              session.total_timer_time ||
              0,

            total_elapsed_time:
              session.total_elapsed_time ||
              0,

            avg_speed:
              avgSpeedMs
                ? avgSpeedMs * 3.6
                : null,

            max_speed:
              maxSpeedMs
                ? maxSpeedMs * 3.6
                : null,

            avg_power: avgPower || null,

            max_power: maxPower || null,

            avg_heart_rate:
              avgHeartRate || null,

            max_heart_rate:
              maxHeartRate || null,

            avg_cadence:
              session.avg_cadence || null,

            max_cadence:
              session.max_cadence || null,

            total_ascent:
              session.total_ascent || 0,

            total_descent:
              session.total_descent || 0,

            total_calories:
              session.total_calories || 0,
          },
        });
      },
    );
  });
}
}

/**
 *
 *
 * @param {number[]} arr => tableau de nombre a traiter
 * @return {*} => retourne la moyenne des nombres du tableau ou null si le tableau est vide
 */
function average(arr: number[]) {
  if (!arr.length) return null;

  return (
    arr.reduce((a, b) => a + b, 0) /
    arr.length
  );
}

/**
 *
 *
 * @param {number[]} arr => tableau de nombre a traiter
 * @return {*} => retourne la valeur maximale du tableau ou null si le tableau est vide
 */
function max(arr: number[]) {
  if (!arr.length) return null;

  return Math.max(...arr);
}