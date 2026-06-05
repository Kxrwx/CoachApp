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
    if (invitation.usedAt) {
      throw new BadRequestException("Ce lien d'invitation a déjà été utilisé.");
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

    // 1. Récupération et vérification de l'invitation
    const invitation = await this.getInvitationDetails(token);

    // 2. Anti Auto-coaching
    if (invitation.coachId === athleteId) {
      throw new BadRequestException("Vous ne pouvez pas vous coacher vous-même.");
    }

    // 3. Vérification des doublons
    const existingLink = await this.prisma.coachingLink.findUnique({
      where: {
        coachId_athleteId: { coachId: invitation.coachId, athleteId },
      },
    });

    if (existingLink) {
      throw new BadRequestException("Vous êtes déjà suivi par ce coach.");
    }

    // 4. Exécution (Transaction)
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
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date() },
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
}