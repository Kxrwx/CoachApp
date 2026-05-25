// src/strava/strava.module.ts
import { Logger, Module } from '@nestjs/common';
import { StravaService } from './strava.service';
import { StravaController } from './strava.controller';
import { PrismaService } from '@/prisma/prisma.service';
import { R2Service } from '@/r2/r2.service';
import { StatsModule } from '@/stats/stats.module';
import { HttpService } from '@/common/services/http.service';

@Module({
  imports: [StatsModule],
  providers: [StravaService, PrismaService, R2Service, Logger, HttpService],
  controllers: [StravaController],
  exports: [StravaService],
})
export class StravaModule {}
