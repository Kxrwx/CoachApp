// src/app.module.ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module'; 
import { AuthModule } from './auth/auth.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SessionCleanupService } from './session-cleanup.service';
import { StravaModule } from './strava/strava.module';
import { R2Module } from './r2/r2.module';
import { UploadModule } from './upload/upload.module';
import { ActivitiesService } from './activities/activities.service';
import { ActivitiesModule } from './activities/activities.module';
import { PlanningModule } from './planning/planning.module';
import { GoalsModule } from './goals/goals.module';
import { StatsController } from './stats/stats.controller';
import { StatsModule } from './stats/stats.module';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { UserPhysiologyModule } from './physio/physio.module';

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport: process.env.NODE_ENV === 'production'
          ? undefined
          : {
              target: 'pino-pretty',
              options: {
                colorize: true,
                singleLine: false,
                translateTime: 'SYS:standard',
              },
            },
      },
    }),

    HealthModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests par minute par défaut
      },
    ]),

    // Core modules
    PrismaModule, 
    AuthModule,
    ScheduleModule.forRoot(),
    StravaModule,
    R2Module,
    UploadModule,
    ActivitiesModule,
    PlanningModule,
    GoalsModule,
    StatsModule,
    UserPhysiologyModule,
  ],
  controllers: [AppController, StatsController],
  providers: [AppService, SessionCleanupService, ActivitiesService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}