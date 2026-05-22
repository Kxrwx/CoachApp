// src/activities/activities.module.ts
import { Module } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ActivitiesController } from './activities.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { R2Module } from '@/r2/r2.module';

@Module({
  imports: [PrismaModule, R2Module],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
})
export class ActivitiesModule {}