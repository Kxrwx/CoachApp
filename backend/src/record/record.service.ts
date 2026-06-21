//src/record/record.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RecordService {
  constructor(private prisma: PrismaService) {}

  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur
   * @return {*} => recupere la liste des records personnels de l'utilisateur avec les details de la metrique associee
   * @memberof RecordService
   */
  async getRecord(userId: string) {
    const records = await this.prisma.personalRecord.findMany({
      where: { userId },
      select: {
        id: true,
        value: true,
        achievedAt: true,
        period: true,
        metric: {
          select: {
            id: true,
            key: true,
            name: true,
            unit: true,
          },
        },
      },
    });

    return { records };
  }
}