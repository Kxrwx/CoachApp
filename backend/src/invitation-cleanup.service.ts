import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class InvitationCleanupService {
  private readonly logger = new Logger(InvitationCleanupService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCleanup() {
    this.logger.log('Lancement du nettoyage des invitations expirées...');

    try {
      const result = await this.prisma.invitation.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(), 
          },
        },
      });

      if (result.count > 0) {
        this.logger.log(`${result.count} invitations expirées ont été supprimées.`);
      } else {
        this.logger.log('Aucune invitation expirée à supprimer.');
      }
    } catch (error) {
      this.logger.error('Erreur lors du nettoyage des invitations', error);
    }
  }
}