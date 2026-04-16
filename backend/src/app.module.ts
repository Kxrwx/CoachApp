import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module'; 
import { AuthModule } from './auth/auth.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SessionCleanupService } from './session-cleanup.service';
import { StravaModule } from './strava/strava.module';
@Module({
  imports: [
    PrismaModule, 
    AuthModule,
    ScheduleModule.forRoot(),
    StravaModule,
  ],
  controllers: [AppController],
  providers: [AppService, SessionCleanupService],
})
export class AppModule {}