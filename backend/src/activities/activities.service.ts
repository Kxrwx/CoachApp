import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../r2/r2.service';
import { StorageSource } from '@prisma/client';

const FitParser = require('fit-file-parser').default;

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    private prisma: PrismaService,
    private r2Service: R2Service,
  ) {}

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
        }
      },
      uploadDetail: true,
    },
    orderBy: { startDate: 'desc' },
  });
}



  async findOne(userId: string, id: string) {
  const activity = await this.prisma.activity.findFirst({
    where: { id, userId },
    include: {
      stravaDetail: true,
      uploadDetail: true,
      storage: true,
    },
  });

  if (!activity) throw new NotFoundException("Activité introuvable.");

  let decodedFileData: any = null;
  let stravaPolylineContent: string | null = null;

  // Récupération FIT (Source UPLOAD)
  const uploadFile = activity.storage.find(s => s.source === 'UPLOAD');
  if (uploadFile) {
    try {
      const buffer = await this.r2Service.getFile(uploadFile.r2Key);
      decodedFileData = await this.parseFitBuffer(buffer);
    } catch (e) { this.logger.error("Erreur FIT", e); }
  }

  // Récupération Polyline (Source STRAVA)
  const polylineFile = activity.storage.find(s => s.source === 'STRAVA');
  if (polylineFile) {
    try {
      const polyBuffer = await this.r2Service.getFile(polylineFile.r2Key);
      stravaPolylineContent = polyBuffer.toString('utf-8');
    } catch (e) { this.logger.error("Erreur Polyline", e); }
  }

  return {
    ...activity,
    // On "aplatit" les données pour le front
    displayInfo: {
      name: activity.stravaDetail?.name || "Activité manuelle",
      distance: activity.stravaDetail?.distance || 0,
      movingTime: activity.stravaDetail?.movingTime || 0,
      elevation: activity.stravaDetail?.totalElevationGain || 0,
      type: activity.stravaDetail?.type || 'Workout'
    },
    decodedFileData,
    stravaPolylineContent,
  };
}

  private async parseFitBuffer(buffer: Buffer): Promise<any> {
    return new Promise((resolve, reject) => {
      const fitParser = new FitParser({
        force: true,
        speedUnit: 'km/h',
        lengthUnit: 'm',
        mode: 'cascade',
      });

      fitParser.parse(buffer, (error: any, data: any) => {
        if (error) return reject(error);
        resolve({
          sessions: data.sessions || [],
          laps: data.laps || [],
          stats: data.sessions?.[0] || null,
        });
      });
    });
  }
}