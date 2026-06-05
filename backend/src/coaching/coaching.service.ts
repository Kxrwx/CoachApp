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
    body: { token: string; shareActivities: boolean; sharePhysiology: boolean; shareCalendar: boolean }
  ) {
    const { token, shareActivities, sharePhysiology, shareCalendar } = body;

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
          shareCalendar,
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
    data: { shareActivities: boolean; sharePhysiology: boolean; shareCalendar: boolean }
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
        shareCalendar: data.shareCalendar,
      },
    });
  }
}