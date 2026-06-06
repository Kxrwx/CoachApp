import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';



@Injectable()
export class CoachingService {
  constructor(private prisma: PrismaService) {}

  

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

  async getAthleteDetails(coachId: string, athleteId: string): Promise<{
    athlete: { id: string; email: string };
    permissions: { shareActivities: boolean; sharePhysiology: boolean };
    stats: {
      weeklyDistance: number;
      weeklyDuration: string | null;
      activitiesCount: number;
      lastActivityDate: Date | null; // On autorise Date | null
      lastActivity: any | null;
      physio: { 
        ftp: number | null; 
        restingHr: number | null; 
        maxHr: number | null; 
        weight: number | null; 
        state: string; 
        stateMessage: string | null; 
      } | null; // On autorise l'objet physioData | null
    };
  }> {
    const link = await this.prisma.coachingLink.findUnique({
      where: { coachId_athleteId: { coachId, athleteId } },
      include: { athlete: { select: { id: true, email: true } } }
    });

    if (!link || link.status !== 'ACTIVE') {
      throw new ForbiddenException("Accès non autorisé.");
    }

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() === 0 ? 6 : startOfWeek.getDay() - 1));
    startOfWeek.setHours(0, 0, 0, 0);

    let weeklyDistance = 0;
    let lastActivityDate: Date | null = null;
    let physioData: { ftp: number | null; restingHr: number | null; maxHr: number | null; weight: number | null; state: string; stateMessage: string | null } | null = null;

    if (link.shareActivities) {
      const weeklyActivities = await this.prisma.activity.findMany({
        where: { userId: athleteId, startDate: { gte: startOfWeek }, idUpload: { not: null } },
        include: { uploadDetail: true }
      });
      weeklyDistance = weeklyActivities.reduce((acc, curr) => acc + (curr.uploadDetail?.distance || 0), 0);

      const lastActivity = await this.prisma.activity.findFirst({
        where: { userId: athleteId, idUpload: { not: null } },
        orderBy: { startDate: 'desc' },
        select: { startDate: true }
      });
      lastActivityDate = lastActivity?.startDate || null;
    }

    if (link.sharePhysiology) {
      const physio = await this.prisma.userPhysiology.findUnique({
        where: { userId: athleteId }
      });
      if (physio) {
        physioData = {
          ftp: physio.ftp,
          restingHr: physio.restingHr,
          maxHr: physio.maxHr,
          weight: physio.weight,
          state: physio.state,
          stateMessage: null 
        };
      }
    }

    return {
      athlete: link.athlete,
      permissions: {
        shareActivities: link.shareActivities,
        sharePhysiology: link.sharePhysiology,
      },
      stats: {
        weeklyDistance: parseFloat(weeklyDistance.toFixed(1)),
        weeklyDuration: null,
        activitiesCount: 0,
        lastActivityDate,
        lastActivity: null,
        physio: physioData
      }
    };
  }
}