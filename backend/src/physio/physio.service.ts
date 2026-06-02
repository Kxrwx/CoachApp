import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../r2/r2.service';

const FitParser = require('fit-file-parser').default;

@Injectable()
export class UserPhysiologyService {
  constructor(
    private prisma: PrismaService,
    private r2Service: R2Service,
  ) {}

  async getPhysiology(userId: string) {
    return this.prisma.userPhysiology.findUnique({
      where: { userId },
    });
  }

  async upsertPhysiology(userId: string, data: any) {
    return this.prisma.userPhysiology.upsert({
      where: { userId },
      update: {
        restingHr: data.restingHr,
        maxHr: data.maxHr,
        ftp: data.ftp,
        weight: data.weight,
        height: data.height,
      },
      create: {
        userId,
        restingHr: data.restingHr,
        maxHr: data.maxHr,
        ftp: data.ftp,
        weight: data.weight,
        height: data.height,
      },
    });
  }

  async calculateMetrics(userId: string) {
    // 1. Récupérer les données physiologiques actuelles pour ne rien écraser à tort
    const currentPhysio = await this.prisma.userPhysiology.findUnique({
      where: { userId },
    });

    const uploadActivities = await this.prisma.activity.findMany({
      where: {
        userId,
        idUpload: { not: null },
      },
      include: {
        storage: {
          where: { source: 'UPLOAD' },
        },
      },
      orderBy: { startDate: 'desc' },
      take: 20,
    });

    const latestPerformanceStats = await this.prisma.performanceStats.findFirst({
      where: { userId },
      orderBy: { periodStart: 'desc' },
    });

    // Variables temporaires pour stocker ce qu'on trouve dans l'historique
    let calcMaxHr: number | null = null;
    let calcFtp: number | null = null;
    let calcWeight: number | null = null;
    let calcRestingHr: number | null = null;

    // 2. Chercher dans les fichiers FIT
    for (const activity of uploadActivities) {
      const uploadFile = activity.storage?.[0];
      if (!uploadFile) continue;

      try {
        const buffer = await this.r2Service.getFile(uploadFile.r2Key);
        const fitData = await this.parseFitBuffer(buffer);

        // Extraire maxHr du FIT
        if (fitData?.stats?.max_heart_rate) {
          const activityMaxHr = Math.round(fitData.stats.max_heart_rate);
          if (activityMaxHr > (calcMaxHr || 0)) {
            calcMaxHr = activityMaxHr;
          }
        }

        // Extraire FTP du FIT (basé sur max power)
        if (fitData?.stats?.max_power && !calcFtp) {
          calcFtp = fitData.stats.max_power;
        }
      } catch (error) {
        // Ignorer les erreurs de parsing FIT
        continue;
      }
    }

    // 3. Compléter avec les PerformanceStats si nécessaire
    if (latestPerformanceStats) {
      if (!calcMaxHr && latestPerformanceStats.hrMax) {
        calcMaxHr = latestPerformanceStats.hrMax;
      }
      if (!calcRestingHr && latestPerformanceStats.hrRest) {
        calcRestingHr = latestPerformanceStats.hrRest;
      }
      if (!calcFtp && latestPerformanceStats.ftp) {
        calcFtp = latestPerformanceStats.ftp;
      }
      if (!calcWeight && latestPerformanceStats.weight) {
        calcWeight = latestPerformanceStats.weight;
      }
    }

    // 4. Préparer les données à upsert 
    // On prend la valeur calculée. Si elle est null, on prend la valeur actuelle en DB.
    const physiologyData = {
      restingHr: calcRestingHr ?? currentPhysio?.restingHr ?? null,
      maxHr: calcMaxHr ?? currentPhysio?.maxHr ?? null,
      ftp: calcFtp ?? currentPhysio?.ftp ?? null,
      weight: calcWeight ?? currentPhysio?.weight ?? null,
      height: currentPhysio?.height ?? null, 
    };

    // Mettre à jour le profil physiologique
    return this.upsertPhysiology(userId, physiologyData);
  }

  async getPerformanceStatsForMonth(userId: string, month: number, year: number) {
  const periodStart = new Date(Date.UTC(year, month - 1, 1));

  return this.prisma.performanceStats.findUnique({
    where: {
      userId_periodType_periodStart: {
        userId,
        periodType: 'monthly',
        periodStart,
      },
    },
  });
}



  private async parseFitBuffer(buffer: Buffer): Promise<any> {
    return new Promise((resolve, reject) => {
      const fitParser = new FitParser({
        force: true,
        speedUnit: 'm/s',
        lengthUnit: 'm',
        mode: 'list',
      });

      fitParser.parse(buffer, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        const session = data.sessions?.[0] || {};
        const records = data.records || [];

        const maxHeartRate = Math.max(
          session.max_heart_rate || 0,
          ...records.map((r) => r.heart_rate || 0),
        );

        const maxPower = Math.max(
          session.max_power || 0,
          ...records.map((r) => r.power || 0),
        );

        resolve({
          stats: {
            max_heart_rate: maxHeartRate || null,
            max_power: maxPower || null,
          },
        });
      });
    });
  }

  
}