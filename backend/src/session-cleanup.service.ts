import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanSessions() {
    const result = await this.prisma.session.deleteMany({
      where: {
        OR: [
          { expiredAt: { lt: new Date() } },
          { revoked: true },
        ],
      },
    });

    this.logger.log(`Sessions supprimées: ${result.count}`);
  }
}