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
}@Injectable()
export class CoachingService {

  private readonly logger = new Logger(CoachingService.name);
  constructor(private prisma: PrismaService, private r2Service: R2Service, private notificationGateway: NotificationsGateway) {}

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


  // ==========================================
  // 1. GÉNÉRER UNE INVITATION (Réservé au Coach)
  // ==========================================
  async generateInvitation(coachId: string) {
    const userRole = await this.prisma.userRole.findUnique({
      where: { userId_role: { userId: coachId, role: 'COACH' } }
    });

    if (!userRole) {
      throw new ForbiddenException("Vous devez avoir le rôle Coach pour générer une invitation.");
    }

    const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Génère un token aléatoire
  const token = randomBytes(32).toString('hex');

  return this.prisma.invitation.create({
    data: {
      coachId,
      expiresAt,
      token, 
    },
  });
  }

  // ==========================================
  // 2. LIRE L'INVITATION (Pour la page de consentement)
  // ==========================================
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

// ==========================================
  // 3. CONSOMMER L'INVITATION (Validation + Permissions)
  // ==========================================
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

  // ==========================================
  // 4. RÉCUPÉRER MON COACH (Pour l'athlète)
  // ==========================================
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

  // ==========================================
  // 5. RÉCUPÉRER MES ATHLÈTES (Pour le coach)
  // ==========================================
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

  // ==========================================
  // 6. ROMPRE LE SUIVI (Supprimer le lien)
  // ==========================================
  async terminateCoachingLink(linkId: string, userId: string) {
    // 1. On cherche le lien
    const link = await this.prisma.coachingLink.findUnique({
      where: { id: linkId }
    });

    if (!link) {
      throw new NotFoundException("Lien introuvable.");
    }

    // 2. Sécurité : Vérifier que l'utilisateur est soit le coach, soit l'athlète du lien
    if (link.coachId !== userId && link.athleteId !== userId) {
      throw new ForbiddenException("Vous n'avez pas l'autorisation de supprimer ce lien.");
    }

    // 3. Suppression du lien
    return this.prisma.coachingLink.delete({
      where: { id: linkId }
    });
  }

  // ==========================================
  // 7. METTRE À JOUR LES PERMISSIONS
  // ==========================================
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
    // 1. Récupération du lien
    const link = await this.prisma.coachingLink.findUnique({
      where: { id: linkId }
    });

    if (!link) {
      throw new NotFoundException("Lien de coaching introuvable.");
    }

    // 2. Sécurité : seul le coach ou l'athlète concerné peut modifier les permissions
    if (link.coachId !== userId && link.athleteId !== userId) {
      throw new ForbiddenException("Vous n'avez pas l'autorisation de modifier ce lien.");
    }

    // 3. Mise à jour en base
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

  // ==========================================
  // 1. DONNÉES GLOBALES (Overview)
  // ==========================================
async getAthleteOverview(coachId: string, athleteId: string) {
  const link = await this.verifyCoachAccess(coachId, athleteId);

  const now = new Date();
  const startOfWeek = new Date();
  startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  startOfWeek.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  // 1. DÉCLARATION DES VARIABLES
  let weeklyStats = { distance: 0, duration: 0, count: 0 };
  let recentActivities: any[] | null = null;
  let upcomingPlanning: any[] | null = null;
  let physio: any | null = null;
  let objectives: any[] | null = null;

  // A. Activités (Stats et 7 derniers jours - Basé sur la présence de l'upload)
  if (link.shareActivities) {
    const activities = await this.prisma.activity.findMany({
      where: { 
        userId: athleteId, 
        startDate: { gte: sevenDaysAgo },
        uploadDetail: { isNot: null } // On prend tant qu'il y a un upload (même s'il y a aussi un idStrava)
      },
      include: { uploadDetail: true }, // Inclut les infos du fichier d'origine
      orderBy: { startDate: 'desc' }
    });

    recentActivities = activities.map(act => {
      // Extraction stricte des métriques depuis l'upload local
      const distance = act.uploadDetail?.distance ?? 0;
      const elevation = act.uploadDetail?.elevation ?? 0;
      const duration = 0; // Reste à 0 en attendant l'ajout de la durée dans UploadActivity
      
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

    // Planning à venir (3 prochains)
    upcomingPlanning = await this.prisma.plannedWorkout.findMany({
      where: { userId: athleteId, startDate: { gte: now } },
      take: 3,
      orderBy: { startDate: 'asc' }
    });
  }

  // B. Physiologie
  if (link.sharePhysiology) {
    physio = await this.prisma.userPhysiology.findUnique({
      where: { userId: athleteId },
      select: { ftp: true, restingHr: true, maxHr: true, weight: true, height: true, state: true }
    });
  }

  // C. Objectifs (3 prochains objectifs actifs)
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

  // ==========================================
  // 2. PROFIL PHYSIO COMPLET
  // ==========================================
  async getAthletePhysio(coachId: string, athleteId: string) {
    const link = await this.verifyCoachAccess(coachId, athleteId);

    if (!link.sharePhysiology) {
      throw new ForbiddenException("L'athlète n'a pas autorisé le partage de ses données physiologiques.");
    }

    // Profil de base
    const physio = await this.prisma.userPhysiology.findUnique({
      where: { userId: athleteId }
    });

    // Historique des performances physiologiques (ex: évolution du FTP, Poids, etc.)
    const physioHistory = await this.prisma.performanceStats.findMany({
      where: { userId: athleteId },
      orderBy: { periodStart: 'desc' },
      take: 12 // Par exemple les 12 dernières périodes
    });

    return { physio, history: physioHistory };
  }

  // ==========================================
  // 3. ANALYSE POUSSÉE (Performance & Computed Metrics)
  // ==========================================


async getAthleteAnalytics(coachId: string, athleteId: string) {
  const link = await this.verifyCoachAccess(coachId, athleteId);

  if (!link.shareAnalytics) {
    throw new ForbiddenException("L'athlète n'a pas autorisé le partage de ses analyses poussées.");
  }

  const now = new Date();

  // 1. Borne de départ (il y a 12 mois)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(now.getMonth() - 11); 
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  // 2. Récupération Prisma
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

  // Variables pour les totaux globaux (sur les 12 derniers mois) 🚀
  let totalDistance = 0;
  let totalElevation = 0;
  let totalCount = activities.length;

  // 3. Initialisation pour les 12 derniers mois
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

  // 4. Initialisation pour les 4 dernières semaines
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

  // 5. Ventilation des données et calcul des totaux globaux
  activities.forEach(activity => {
    const actDate = new Date(activity.startDate);
    const distance = activity.uploadDetail?.distance ?? 0;
    const elevation = activity.uploadDetail?.elevation ?? 0;

    // On cumule les totaux globaux sur la période complète 📈
    totalDistance += distance;
    totalElevation += elevation;

    // Répartition Mensuelle
    const actYear = actDate.getFullYear();
    const actMonth = actDate.getMonth();
    const monthBucket = monthlyAnalytics.find(m => m.year === actYear && m.month === actMonth);
    if (monthBucket) {
      monthBucket.distance += distance;
      monthBucket.elevation += elevation;
      monthBucket.count += 1;
    }

    // Répartition Hebdomadaire
    const weekBucket = weeklyAnalytics.find(w => actDate >= w.start && actDate <= w.end);
    if (weekBucket) {
      weekBucket.distance += distance;
      weekBucket.elevation += elevation;
      weekBucket.count += 1;
    }
  });

  // 6. Payload final enrichi
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

  // ==========================================
  // 4. OBJECTIFS
  // ==========================================
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

  // ==========================================
  // 5. RECORDS (PRs)
  // ==========================================
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

  // ==========================================
  // 6. HISTORIQUE DES ACTIVITÉS COMPLET (Paginé)
  // ==========================================
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

  // ==========================================
  // 7. PLANNING (Entraînements à venir et passés)
  // ==========================================
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