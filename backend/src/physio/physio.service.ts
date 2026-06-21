//src/physio/physio.service.ts
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

  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur
   * @return {*} => retourne les donnees physiologiques actuelles de l'utilisateur
   * @memberof UserPhysiologyService
   */
  async getPhysiology(userId: string) {
    return this.prisma.userPhysiology.findUnique({
      where: { userId },
    });
  }

  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur
   * @param {any} data => les nouvelles donnees physiologiques a enregistrer
   * @return {*} => met a jour ou cree les donnees physiologiques de l'utilisateur
   * @memberof UserPhysiologyService
   */
  async upsertPhysiology(userId: string, data: any) {
    return this.prisma.userPhysiology.upsert({
      where: { userId },
      update: {
        restingHr: data.restingHr,
        maxHr: data.maxHr,
        ftp: data.ftp,
        weight: data.weight,
        height: data.height,
        state: data.state || 'NORMAL',
      },
      create: {
        userId,
        restingHr: data.restingHr,
        maxHr: data.maxHr,
        ftp: data.ftp,
        weight: data.weight,
        height: data.height,
        state: data.state || 'NORMAL',
      },
    });
  }

  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur
   * @return {*} => recalcule et met a jour les metriques (FC max, FTP, etc.) en se basant sur les fichiers FIT et les stats de performance
   * @memberof UserPhysiologyService
   */
  async calculateMetrics(userId: string) {
    const currentPhysio = await this.prisma.userPhysiology.findUnique({
      where: { userId },
    });

    const uploadActivities = await this.prisma.activity.findMany({
      where: { userId, idUpload: { not: null } },
      include: { storage: { where: { source: 'UPLOAD' } } },
      orderBy: { startDate: 'desc' },
      take: 20,
    });

    const latestPerformanceStats = await this.prisma.performanceStats.findFirst({
      where: { userId },
      orderBy: { periodStart: 'desc' },
    });

    let calcMaxHr: number | null = null;
    let calcFtp: number | null = null;
    let calcWeight: number | null = null;
    let calcRestingHr: number | null = null;

    for (const activity of uploadActivities) {
      const uploadFile = activity.storage?.[0];
      if (!uploadFile) continue;

      try {
        const buffer = await this.r2Service.getFile(uploadFile.r2Key);
        const fitData = await this.parseFitBuffer(buffer);
        
        if (fitData?.stats?.max_heart_rate) {
          const activityMaxHr = Math.round(fitData.stats.max_heart_rate);
          if (activityMaxHr > (calcMaxHr || 0)) calcMaxHr = activityMaxHr;
        }
        
        if (fitData?.stats?.max_power && !calcFtp) {
          calcFtp = fitData.stats.max_power;
        }
      } catch (error) { 
        continue; 
      }
    }

    if (latestPerformanceStats) {
      if (!calcMaxHr && latestPerformanceStats.hrMax) calcMaxHr = latestPerformanceStats.hrMax;
      if (!calcRestingHr && latestPerformanceStats.hrRest) calcRestingHr = latestPerformanceStats.hrRest;
      if (!calcFtp && latestPerformanceStats.ftp) calcFtp = latestPerformanceStats.ftp;
      if (!calcWeight && latestPerformanceStats.weight) calcWeight = latestPerformanceStats.weight;
    }

    const physiologyData = {
      restingHr: calcRestingHr ?? currentPhysio?.restingHr ?? null,
      maxHr: calcMaxHr ?? currentPhysio?.maxHr ?? null,
      ftp: calcFtp ?? currentPhysio?.ftp ?? null,
      weight: calcWeight ?? currentPhysio?.weight ?? null,
      height: currentPhysio?.height ?? null,
      state: currentPhysio?.state ?? 'NORMAL', 
    };

    return this.upsertPhysiology(userId, physiologyData);
  }

  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur
   * @param {number} month => le mois cible (1-12)
   * @param {number} year => l'annee cible
   * @return {*} => recupere les statistiques de performance mensuelles de l'utilisateur
   * @memberof UserPhysiologyService
   */
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

  /**
   *
   *
   * @param {Buffer} buffer => le buffer du fichier FIT a analyser
   * @return {*} => parse le fichier et extrait les statistiques maximales (FC max, puissance max)
   * @memberof UserPhysiologyService
   */
  private async parseFitBuffer(buffer: Buffer): Promise<any> {
    return new Promise((resolve, reject) => {
      const fitParser = new FitParser({ force: true, speedUnit: 'm/s', lengthUnit: 'm', mode: 'list' });
      fitParser.parse(buffer, (error: any, data: any) => {
        if (error) return reject(error);
        
        const session = data.sessions?.[0] || {};
        const records = data.records || [];
        
        const maxHeartRate = Math.max(session.max_heart_rate || 0, ...records.map((r: any) => r.heart_rate || 0));
        const maxPower = Math.max(session.max_power || 0, ...records.map((r: any) => r.power || 0));
        
        resolve({ stats: { max_heart_rate: maxHeartRate || null, max_power: maxPower || null } });
      });
    });
  }
}