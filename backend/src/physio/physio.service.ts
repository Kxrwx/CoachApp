import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ajuste le chemin selon ton projet

@Injectable()
export class UserPhysiologyService {
  constructor(private prisma: PrismaService) {}

  async getPhysiology(userId: string) {
    return this.prisma.userPhysiology.findUnique({
      where: { userId },
    });
  }

  async upsertPhysiology(userId: string, data: any) {
    return this.prisma.userPhysiology.upsert({
      where: { userId },
      update: {
        restingHr: data.restingHr,
        maxHr: data.maxHr,
        ftp: data.ftp,
        weight: data.weight,
        height: data.height,
      },
      create: {
        userId,
        restingHr: data.restingHr,
        maxHr: data.maxHr,
        ftp: data.ftp,
        weight: data.weight,
        height: data.height,
      },
    });
  }
}