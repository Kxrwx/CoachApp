// src/upload/upload.module.ts
import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { R2Module } from '../r2/r2.module';
import { PrismaModule } from '../prisma/prisma.module'; 
import FitParser from 'fit-file-parser';
import { StatsModule } from '@/stats/stats.module';
import { StravaModule } from '../strava/strava.module';
import { NotificationsModule } from '@/notifications/notifications.module';

@Module({
  imports: [
    PrismaModule, 
    R2Module, 
    FitParser,
    StatsModule,
    StravaModule,
    NotificationsModule
  ],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}