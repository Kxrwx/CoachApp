import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class PendingCleanupService {
  private readonly logger = new Logger(PendingCleanupService.name);

  constructor(private prisma: PrismaService) {}
  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('Lancement du nettoyage des actions en attente expirées...');

    const now = new Date();

    try {
      const deleted = await this.prisma.pendingAction.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      });

      if (deleted.count > 0) {
        this.logger.log(`Nettoyage terminé : ${deleted.count} actions expirées supprimées.`);
      }
    } catch (error) {
      this.logger.error('Erreur lors du nettoyage des actions :', error);
    }
  }
}