//src/coaching/coaching.service.ts
import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../r2/r2.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { randomBytes } from 'crypto';

const FitParser = require('fit-file-parser').default;

interface MonthlyBucket {
  label: string;
  year: number;
  month: number;
  distance: number;
  elevation: number;
  count: number;
}

interface WeeklyBucket {
  label: string;
  start: Date;
  end: Date;
  distance: number;
  elevation: number;
  count: number;
}

@Injectable()
export class CoachingService {
  private readonly logger = new Logger(CoachingService.name);
  
  constructor(private prisma: PrismaService, private r2Service: R2Service, private notificationGateway: NotificationsGateway) {}

  /**
   *
   *
   * @param {Buffer} buffer => le buffer du fichier FIT a parser
   * @return {*} => les donnees parsees du fichier FIT
   * @memberof CoachingService
   */
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
          console.error(error);
          return reject(error);
        }

        const session = data.sessions?.[0] || {};
        const records = data.records || [];
        const laps = data.laps || [];

        const totalDistance = session.total_distance ?? records.at(-1)?.distance ?? 0;
        const avgHeartRate = session.avg_heart_rate ?? average(records.map((r) => r.heart_rate).filter(Boolean));
        const maxHeartRate = session.max_heart_rate ?? max(records.map((r) => r.heart_rate));
        const avgPower = session.avg_power ?? average(records.map((r) => r.power).filter(Boolean));
        const maxPower = session.max_power ?? max(records.map((r) => r.power));
        const avgSpeedMs = session.enhanced_avg_speed ?? session.avg_speed ?? average(records.map((r) => r.speed).filter(Boolean));
        const maxSpeedMs = session.enhanced_max_speed ?? session.max_speed ?? max(records.map((r) => r.speed));

        resolve({
          file_ids: data.file_ids || [],
          laps,
          records,
          stats: {
            sport: session.sport || data.sport || 'unknown',
            total_distance: totalDistance || 0,
            total_timer_time: session.total_timer_time || 0,
            total_elapsed_time: session.total_elapsed_time || 0,
            avg_speed: avgSpeedMs ? avgSpeedMs * 3.6 : null,
            max_speed: maxSpeedMs ? maxSpeedMs * 3.6 : null,
            avg_power: avgPower || null,
            max_power: maxPower || null,
            avg_heart_rate: avgHeartRate || null,
            max_heart_rate: maxHeartRate || null,
            avg_cadence: session.avg_cadence || null,
            max_cadence: session.max_cadence || null,
            total_ascent: session.total_ascent || 0,
            total_descent: session.total_descent || 0,
            total_calories: session.total_calories || 0,
          },
        });
      });
    });
  }

  /**
   *
   *
   * @param {string} coachId => l'id du coach
   * @return {*} => generer une invitation de coaching
   * @memberof CoachingService
   */
  async generateInvitation(coachId: string) {
    const userRole = await this.prisma.userRole.findUnique({
      where: { userId_role: { userId: coachId, role: 'COACH' } }
    });

    if (!userRole) {
      throw new ForbiddenException("Vous devez avoir le rôle Coach pour générer une invitation.");
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const token = randomBytes(32).toString('hex');

    return this.prisma.invitation.create({
      data: {
        coachId,
        expiresAt,
        token, 
      },
    });
  }

  /**
   *
   *
   * @param {string} token => le token de l'invitation
   * @return {*} => recuperer les details de l'invitation
   * @memberof CoachingService
   */
  async getInvitationDetails(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: { 
        coach: { 
          select: { id: true, email: true }
        } 
      }
    });

    if (!invitation) {
      throw new NotFoundException("Lien d'invitation introuvable.");
    }
    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException("Ce lien d'invitation a expiré.");
    }

    return invitation;
  }

  /**
   *
   *
   * @param {string} athleteId => l'id de l'athlete
   * @param {object} body => les donnees pour accepter l'invitation et parametrer les partages
   * @return {*} => consommer l'invitation et lier le coach a l'athlete
   * @memberof CoachingService
   */
  async consumeInvitation(
    athleteId: string, 
    body: { 
      token: string; 
      shareActivities: boolean; 
      sharePhysiology: boolean; 
      shareRecords: boolean; 
      shareObjectives: boolean; 
      shareAnalytics: boolean 
    }
  ) {
    const { token, shareActivities, sharePhysiology, shareRecords, shareObjectives, shareAnalytics } = body;

    const invitation = await this.getInvitationDetails(token);

    if (invitation.coachId === athleteId) {
      throw new BadRequestException("Vous ne pouvez pas vous coacher vous-même.");
    }

    const existingLink = await this.prisma.coachingLink.findUnique({
      where: {
        coachId_athleteId: { coachId: invitation.coachId, athleteId },
      },
    });

    if (existingLink) {
      throw new BadRequestException("Vous êtes déjà suivi par ce coach.");
    }

    const [coachingLink] = await this.prisma.$transaction([
      this.prisma.coachingLink.create({
        data: {
          coachId: invitation.coachId,
          athleteId,
          status: 'ACTIVE',
          shareActivities,
          sharePhysiology,
          shareRecords,
          shareObjectives,
          shareAnalytics,
        },
      }),
      this.prisma.invitation.delete({
        where: { id: invitation.id },
      }),
    ]);

    return coachingLink;
  }

  /**
   *
   *
   * @param {string} athleteId => l'id de l'athlete
   * @return {*} => recuperer le coach actuel de l'athlete
   * @memberof CoachingService
   */
  async getMyCoach(athleteId: string) {
    return this.prisma.coachingLink.findFirst({
      where: { 
        athleteId,
        status: 'ACTIVE'
      },
      include: {
        coach: {
          select: { id: true, email: true }
        }
      }
    });
  }

  /**
   *
   *
   * @param {string} coachId => l'id du coach
   * @return {*} => recuperer les athletes lies a un coach
   * @memberof CoachingService
   */
  async getMyAthletes(coachId: string) {
    return this.prisma.coachingLink.findMany({
      where: { 
        coachId,
        status: 'ACTIVE'
      },
      include: {
        athlete: {
          select: { id: true, email: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   *
   *
   * @param {string} linkId => l'id du lien de coaching
   * @param {string} userId => l'id de l'utilisateur (coach ou athlete)
   * @return {*} => rompre le lien de coaching
   * @memberof CoachingService
   */
  async terminateCoachingLink(linkId: string, userId: string) {
    const link = await this.prisma.coachingLink.findUnique({
      where: { id: linkId }
    });

    if (!link) {
      throw new NotFoundException("Lien introuvable.");
    }

    if (link.coachId !== userId && link.athleteId !== userId) {
      throw new ForbiddenException("Vous n'avez pas l'autorisation de supprimer ce lien.");
    }

    return this.prisma.coachingLink.delete({
      where: { id: linkId }
    });
  }

  /**
   *
   *
   * @param {string} linkId => l'id du lien de coaching
   * @param {string} userId => l'id de l'utilisateur (coach ou athlete)
   * @param {object} data => les nouvelles permissions a appliquer
   * @return {*} => mettre a jour les permissions de partage
   * @memberof CoachingService
   */
  async updatePermissions(
    linkId: string, 
    userId: string, 
    data: { 
      shareActivities: boolean; 
      sharePhysiology: boolean; 
      shareRecords: boolean; 
      shareObjectives: boolean; 
      shareAnalytics: boolean 
    }
  ) {
    const link = await this.prisma.coachingLink.findUnique({
      where: { id: linkId }
    });

    if (!link) {
      throw new NotFoundException("Lien de coaching introuvable.");
    }

    if (link.coachId !== userId && link.athleteId !== userId) {
      throw new ForbiddenException("Vous n'avez pas l'autorisation de modifier ce lien.");
    }

    return this.prisma.coachingLink.update({
      where: { id: linkId },
      data: {
        shareActivities: data.shareActivities,
        sharePhysiology: data.sharePhysiology,
        shareRecords: data.shareRecords,
        shareObjectives: data.shareObjectives,
        shareAnalytics: data.shareAnalytics,
      },
    });
  }

  /**
   *
   *
   * @param {string} coachId => l'id du coach
   * @return {*} => recuperer un resume des donnees (activites, physio) de tous les athletes du coach
   * @memberof CoachingService
   */
  async getAthletesSummary(coachId: string) {
    const links = await this.prisma.coachingLink.findMany({
      where: { coachId, status: 'ACTIVE' },
      include: { 
        athlete: {
          select: { id: true, email: true }
        }
      }
    });

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() === 0 ? 6 : startOfWeek.getDay() - 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const athletesSummary = await Promise.all(links.map(async (link) => {
      let weeklyDistance: number | null = null;
      let lastActivityDate: Date | null = null;
      let physioData: { ftp: number | null; restingHr: number | null; weight: number | null; state: string } | null = null;

      if (link.shareActivities) {
        const weeklyActivities = await this.prisma.activity.findMany({
          where: { 
            userId: link.athleteId,
            startDate: { gte: startOfWeek },
            idUpload: { not: null } 
          },
          include: { uploadDetail: true } 
        });

        weeklyDistance = weeklyActivities.reduce((acc, curr) => {
          return acc + (curr.uploadDetail?.distance || 0);
        }, 0);

        const lastActivity = await this.prisma.activity.findFirst({
          where: { 
            userId: link.athleteId,
            idUpload: { not: null }
          },
          orderBy: { startDate: 'desc' },
          select: { startDate: true }
        });
        lastActivityDate = lastActivity?.startDate || null;
      }

      if (link.sharePhysiology) {
        const physio = await this.prisma.userPhysiology.findUnique({
          where: { userId: link.athleteId },
          select: { ftp: true, restingHr: true, weight: true, state: true }
        });
        
        if (physio) {
          physioData = {
            ftp: physio.ftp,
            restingHr: physio.restingHr,
            weight: physio.weight,
            state: physio.state 
          };
        }
      }

      return {
        linkId: link.id,
        athlete: link.athlete,
        permissions: {
          shareActivities: link.shareActivities,
          sharePhysiology: link.sharePhysiology,
        },
        stats: {
          weeklyDistance: weeklyDistance !== null ? parseFloat(weeklyDistance.toFixed(1)) : null,
          lastActivityDate,
          physio: physioData
        }
      };
    }));

    return athletesSummary;
  }

  /**
   *
   *
   * @param {string} coachId => l'id du coach
   * @param {string} athleteId => l'id de l'athlete
   * @return {*} => verifier que le coach a bien l'acces a l'athlete
   * @memberof CoachingService
   */
  private async verifyCoachAccess(coachId: string, athleteId: string) {
    const link = await this.prisma.coachingLink.findUnique({
      where: { coachId_athleteId: { coachId, athleteId } },
      include: { athlete: { select: { id: true, email: true } } }
    });

    if (!link || link.status !== 'ACTIVE') {
      throw new ForbiddenException("Accès non autorisé à cet athlète.");
    }
    return link;
  }

  /**
   *
   *
   * @param {string} coachId => l'id du coach
   * @param {string} athleteId => l'id de l'athlete
   * @return {*} => recuperer l'apercu global (activites, physio, planning, objectifs) d'un athlete
   * @memberof CoachingService
   */
  async getAthleteOverview(coachId: string, athleteId: string) {
    const link = await this.verifyCoachAccess(coachId, athleteId);

    const now = new Date();
    const startOfWeek = new Date();
    startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    let weeklyStats = { distance: 0, duration: 0, count: 0 };
    let recentActivities: any[] | null = null;
    let upcomingPlanning: any[] | null = null;
    let physio: any | null = null;
    let objectives: any[] | null = null;

    if (link.shareActivities) {
      const activities = await this.prisma.activity.findMany({
        where: { 
          userId: athleteId, 
          startDate: { gte: sevenDaysAgo },
          uploadDetail: { isNot: null } 
        },
        include: { uploadDetail: true }, 
        orderBy: { startDate: 'desc' }
      });

      recentActivities = activities.map(act => {
        const distance = act.uploadDetail?.distance ?? 0;
        const elevation = act.uploadDetail?.elevation ?? 0;
        const duration = 0; 
        
        return {
          id: act.id,
          title: 'Activité uploadée',
          date: act.startDate,
          distance,
          elevation,
          duration,
        };
      });

      const thisWeekActivities = recentActivities.filter(act => new Date(act.date) >= startOfWeek);
      
      weeklyStats = {
        distance: parseFloat(thisWeekActivities.reduce((acc, curr) => acc + curr.distance, 0).toFixed(1)),
        duration: thisWeekActivities.reduce((acc, curr) => acc + curr.duration, 0),
        count: thisWeekActivities.length
      };

      upcomingPlanning = await this.prisma.plannedWorkout.findMany({
        where: { userId: athleteId, startDate: { gte: now } },
        take: 3,
        orderBy: { startDate: 'asc' }
      });
    }

    if (link.sharePhysiology) {
      physio = await this.prisma.userPhysiology.findUnique({
        where: { userId: athleteId },
        select: { ftp: true, restingHr: true, maxHr: true, weight: true, height: true, state: true }
      });
    }

    if (link.shareObjectives) {
      objectives = await this.prisma.goal.findMany({
        where: { userId: athleteId, isActive: true, endDate: { gte: now } },
        include: { targets: { include: { metric: true } } },
        take: 3,
        orderBy: { endDate: 'asc' }
      });
    }

    return {
      athlete: link.athlete,
      permissions: {
        shareActivities: link.shareActivities,
        sharePhysiology: link.sharePhysiology,
        shareObjectives: link.shareObjectives,
        shareAnalytics: link.shareAnalytics,
        shareRecords: link.shareRecords,
      },
      weeklyStats,
      recentActivities,
      upcomingPlanning,
      physio,
      objectives,
    };
  }

  /**
   *
   *
   * @param {string} coachId => l'id du coach
   * @param {string} athleteId => l'id de l'athlete
   * @return {*} => recuperer l'historique et les donnees physiologiques de l'athlete
   * @memberof CoachingService
   */
  async getAthletePhysio(coachId: string, athleteId: string) {
    const link = await this.verifyCoachAccess(coachId, athleteId);

    if (!link.sharePhysiology) {
      throw new ForbiddenException("L'athlète n'a pas autorisé le partage de ses données physiologiques.");
    }

    const physio = await this.prisma.userPhysiology.findUnique({
      where: { userId: athleteId }
    });

    const physioHistory = await this.prisma.performanceStats.findMany({
      where: { userId: athleteId },
      orderBy: { periodStart: 'desc' },
      take: 12 
    });

    return { physio, history: physioHistory };
  }

  /**
   *
   *
   * @param {string} coachId => l'id du coach
   * @param {string} athleteId => l'id de l'athlete
   * @return {*} => recuperer les statistiques et analytics completes de l'athlete
   * @memberof CoachingService
   */
  async getAthleteAnalytics(coachId: string, athleteId: string) {
    const link = await this.verifyCoachAccess(coachId, athleteId);

    if (!link.shareAnalytics) {
      throw new ForbiddenException("L'athlète n'a pas autorisé le partage de ses analyses poussées.");
    }

    const now = new Date();

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(now.getMonth() - 11); 
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const activities = await this.prisma.activity.findMany({
      where: {
        userId: athleteId,
        startDate: { gte: twelveMonthsAgo },
        uploadDetail: { isNot: null }
      },
      include: {
        uploadDetail: true
      },
      orderBy: { startDate: 'asc' }
    });

    let totalDistance = 0;
    let totalElevation = 0;
    let totalCount = activities.length;

    const monthlyAnalytics: MonthlyBucket[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      
      monthlyAnalytics.push({
        label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        year: d.getFullYear(),
        month: d.getMonth(),
        distance: 0,
        elevation: 0,
        count: 0
      });
    }

    const weeklyAnalytics: WeeklyBucket[] = [];
    for (let i = 3; i >= 0; i--) {
      const start = new Date();
      start.setDate(now.getDate() - (i * 7) - 6);
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setDate(now.getDate() - (i * 7));
      end.setHours(23, 59, 59, 999);

      const label = i === 0 ? "Cette semaine" : `S -${i}`;

      weeklyAnalytics.push({
        label,
        start,
        end,
        distance: 0,
        elevation: 0,
        count: 0
      });
    }

    activities.forEach(activity => {
      const actDate = new Date(activity.startDate);
      const distance = activity.uploadDetail?.distance ?? 0;
      const elevation = activity.uploadDetail?.elevation ?? 0;

      totalDistance += distance;
      totalElevation += elevation;

      const actYear = actDate.getFullYear();
      const actMonth = actDate.getMonth();
      const monthBucket = monthlyAnalytics.find(m => m.year === actYear && m.month === actMonth);
      if (monthBucket) {
        monthBucket.distance += distance;
        monthBucket.elevation += elevation;
        monthBucket.count += 1;
      }

      const weekBucket = weeklyAnalytics.find(w => actDate >= w.start && actDate <= w.end);
      if (weekBucket) {
        weekBucket.distance += distance;
        weekBucket.elevation += elevation;
        weekBucket.count += 1;
      }
    });

    return {
      totals: {
        distance: parseFloat(totalDistance.toFixed(1)),
        elevation: Math.round(totalElevation),
        count: totalCount
      },
      monthly: monthlyAnalytics.map(({ label, distance, elevation, count }) => ({
        label,
        distance: parseFloat(distance.toFixed(1)),
        elevation: Math.round(elevation),
        count
      })),
      weekly: weeklyAnalytics.map(({ label, distance, elevation, count }) => ({
        label,
        distance: parseFloat(distance.toFixed(1)),
        elevation: Math.round(elevation),
        count
      }))
    };
  }

  /**
   *
   *
   * @param {string} coachId => l'id du coach
   * @param {string} athleteId => l'id de l'athlete
   * @return {*} => recuperer les objectifs en cours de l'athlete
   * @memberof CoachingService
   */
  async getAthleteObjectives(coachId: string, athleteId: string) {
    const link = await this.verifyCoachAccess(coachId, athleteId);

    if (!link.shareObjectives) {
      throw new ForbiddenException("L'athlète n'a pas autorisé le partage de ses objectifs.");
    }

    const goals = await this.prisma.goal.findMany({
      where: { userId: athleteId },
      include: { 
        targets: { 
          include: { metric: true } 
        } 
      },
      orderBy: { endDate: 'asc' }
    });

    if (goals.length === 0) return goals;

    const metricIds = Array.from(new Set(goals.flatMap((goal) => goal.targets.map((target) => target.metricId))));
    const metricKeys = Array.from(new Set(goals.flatMap((goal) => goal.targets.map((target) => target.metric?.key || '')))).filter(Boolean);

    const personalRecords = metricIds.length > 0 
      ? await this.prisma.personalRecord.findMany({
          where: { userId: athleteId, metricId: { in: metricIds } },
          orderBy: { value: 'desc' },
        })
      : [];

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const computedMetrics = metricKeys.length > 0
      ? await this.prisma.computedMetric.findMany({
          where: { userId: athleteId, metricKey: { in: metricKeys }, period: currentMonth },
        })
      : [];

    const bestRecordByMetric = personalRecords.reduce<Record<string, number>>((acc, record) => {
      if (record.sourceType === 'STRAVA') return acc;

      if (!acc[record.metricId] || acc[record.metricId] < record.value) {
        acc[record.metricId] = record.value;
      }
      return acc;
    }, {});

    return goals.map((goal) => ({
      ...goal,
      targets: goal.targets.map((target) => {
        const metricKey = target.metric?.key;
        
        const currentValue = metricKey
          ? computedMetrics.find((computed) => computed.metricKey === metricKey)?.value ?? null
          : null;
          
        const targetValue = target.targetValue || 0;
        
        const progressPercent = currentValue && targetValue
          ? Math.round((currentValue / targetValue) * 100)
          : null;
          
        return {
          ...target,
          currentValue,
          progressPercent,
          recordValue: bestRecordByMetric[target.metricId] ?? null, 
        };
      }),
    }));
  }

  /**
   *
   *
   * @param {string} coachId => l'id du coach
   * @param {string} athleteId => l'id de l'athlete
   * @return {*} => recuperer les records personnels de l'athlete
   * @memberof CoachingService
   */
  async getAthleteRecords(coachId: string, athleteId: string) {
    const link = await this.verifyCoachAccess(coachId, athleteId);

    if (!link.shareRecords) {
      throw new ForbiddenException("L'athlète n'a pas autorisé le partage de ses records.");
    }

    const records = await this.prisma.personalRecord.findMany({
      where: { 
        userId: athleteId,
        OR: [
          { sourceType: null },            
          { sourceType: { not: 'STRAVA' } } 
        ]
      },
      include: { metric: true },
      orderBy: { achievedAt: 'desc' }
    });

    return records;
  }

  /**
   *
   *
   * @param {string} coachId => l'id du coach
   * @param {string} athleteId => l'id de l'athlete
   * @param {number} [page=1] => la page actuelle
   * @param {number} [limit=20] => la limite par page
   * @return {*} => recuperer les activites paginees de l'athlete
   * @memberof CoachingService
   */
  async getAthleteActivities(coachId: string, athleteId: string, page: number = 1, limit: number = 20) {
    const link = await this.verifyCoachAccess(coachId, athleteId);

    if (!link.shareActivities) {
      throw new ForbiddenException("L'athlète n'a pas autorisé le partage de ses activités.");
    }

    const skip = (page - 1) * limit;

    const [activities, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where: { 
          userId: athleteId,
          uploadDetail: { isNot: null } 
        },
        include: { uploadDetail: true }, 
        orderBy: { startDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activity.count({
        where: { userId: athleteId, uploadDetail: { isNot: null } }
      })
    ]);

    const formattedActivities = activities.map(act => ({
      id: act.id,
      startDate: act.startDate,
      source: 'UPLOAD', 
      title: 'Activité manuelle', 
      distance: act.uploadDetail?.distance ?? 0,
      elevation: act.uploadDetail?.elevation ?? 0,
    }));

    return {
      data: formattedActivities,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  /**
   *
   *
   * @param {string} coachId => l'id du coach
   * @param {string} athleteId => l'id de l'athlete
   * @return {*} => recuperer le planning de l'athlete (30 jours avant, 90 jours apres)
   * @memberof CoachingService
   */
  async getAthletePlanning(coachId: string, athleteId: string) {
    const link = await this.verifyCoachAccess(coachId, athleteId);

    if (!link.shareActivities) {
      throw new ForbiddenException("L'athlète n'a pas autorisé l'accès à son planning.");
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); 

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 90); 

    return await this.prisma.plannedWorkout.findMany({
      where: { 
        userId: athleteId,
        startDate: { 
          gte: startDate,
          lte: endDate 
        } 
      },
      orderBy: { startDate: 'asc' }
    });
  }

  /**
   *
   *
   * @param {string} coachId => l'id du coach
   * @param {string} athleteId => l'id de l'athlete
   * @param {string} activityId => l'id de l'activite
   * @return {*} => recuperer les details et donnees (FIT) d'une activite specifique
   * @memberof CoachingService
   */
  async getAthleteActivityDetail(coachId: string, athleteId: string, activityId: string) {
    const link = await this.verifyCoachAccess(coachId, athleteId);
    if (!link.shareActivities) {
      throw new ForbiddenException("L'athlète n'a pas autorisé le partage de ses activités.");
    }

    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, userId: athleteId },
      include: {
        uploadDetail: true, 
        storage: true,      
      },
    });

    if (!activity) {
      throw new NotFoundException('Activité introuvable.');
    }

    let decodedFileData: any = null;
    const uploadFile = activity.storage.find((s) => s.source === 'UPLOAD');

    if (uploadFile) {
      try {
        const buffer = await this.r2Service.getFile(uploadFile.r2Key);
        decodedFileData = await this.parseFitBuffer(buffer);
      } catch (e) {
        this.logger.error('Erreur parsing FIT', e);
      }
    }

    return {
      id: activity.id,
      startDate: activity.startDate,
      source: 'UPLOAD',
      displayInfo: {
        name: 'Activité manuelle',
        distance: activity.uploadDetail?.distance ?? 0,
        elevation: activity.uploadDetail?.elevation ?? 0,
        type: 'Workout', 
      },
      decodedFileData, 
    };
  }

  /**
   *
   *
   * @param {string} coachId => l'id du coach
   * @param {string} athleteId => l'id de l'athlete
   * @param {object} data => les informations de la seance d'entrainement a proposer
   * @return {*} => creer une action en attente pour proposer une seance
   * @memberof CoachingService
   */
  async proposeTrainingSession(
    coachId: string, 
    athleteId: string, 
    data: { 
      title: string; 
      scheduledDate: string; 
      activityType: string; 
      description?: string;
      startTime?: string;
      duration?: number;
      isRecurring?: boolean;
      recurrenceRule?: string;
      color?: string;
    }
  ) {
    try {
      await this.verifyCoachAccess(coachId, athleteId);

      const pendingAction = await this.prisma.pendingAction.create({
        data: {
          userId: athleteId,
          type: 'TRAINING_PROPOSAL',
          payload: {
            coachId, 
            title: data.title,
            description: data.description || null,
            scheduledDate: data.scheduledDate,
            activityType: data.activityType,
            startTime: data.startTime || null,
            duration: data.duration || null,
            isRecurring: data.isRecurring || false,
            recurrenceRule: data.recurrenceRule || null,
            color: data.color || "#6366f1",
          },
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
        }
      });

      this.logger.log(`[Pending System] Coach ${coachId} a proposé une séance à l'athlète ${athleteId}`);

      this.notificationGateway.sendToUser(athleteId, 'NEW_PENDING_ACTION', {
        type: 'TRAINING_PROPOSAL',
        actionId: pendingAction.id,
        title: "Nouvelle proposition d'entraînement"
      });

      return { 
        success: true, 
        message: "Proposition envoyée à l'athlète", 
        action: pendingAction 
      };

    } catch (error) {
      this.logger.error(`[Pending System] Erreur lors de la proposition d'entraînement :`, error);
      throw error; 
    }
  }

  /**
   *
   *
   * @param {string} coachId => l'id du coach
   * @param {string} athleteId => l'id de l'athlete
   * @param {object} data => les informations de l'objectif a proposer
   * @return {*} => creer une action en attente pour proposer un objectif
   * @memberof CoachingService
   */
  async proposeGoal(
    coachId: string, 
    athleteId: string, 
    data: { 
      name: string; 
      type: string;
      startDate: string;
      endDate: string; 
      description?: string;
      targets?: { metricId: string; targetValue: number }[];
    }
  ) {
    try {
      await this.verifyCoachAccess(coachId, athleteId);

      const pendingAction = await this.prisma.pendingAction.create({
        data: {
          userId: athleteId,
          type: 'GOAL_PROPOSAL',
          payload: {
            coachId, 
            name: data.name,
            type: data.type,
            description: data.description || null,
            startDate: data.startDate,
            endDate: data.endDate,
            targets: data.targets || [], 
          },
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
        }
      });

      this.logger.log(`[Pending System] Coach ${coachId} a proposé un objectif à l'athlète ${athleteId}`);

      this.notificationGateway.sendToUser(athleteId, 'NEW_PENDING_ACTION', {
        type: 'GOAL_PROPOSAL',
        actionId: pendingAction.id,
        title: "Nouvelle proposition d'objectif"
      });

      return { 
        success: true, 
        message: "Proposition d'objectif envoyée à l'athlète", 
        action: pendingAction 
      };

    } catch (error) {
      this.logger.error(`[Pending System] Erreur lors de la proposition d'objectif :`, error);
      throw error; 
    }
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