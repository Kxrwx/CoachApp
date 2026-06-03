import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RecordService {
    constructor(private prisma: PrismaService) {}

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