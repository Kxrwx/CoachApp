//src/coaching/coaching.module.ts
import { Module } from '@nestjs/common';
import { CoachingController } from './coaching.controller';
import { CoachingService } from './coaching.service';
import { PrismaModule } from '../prisma/prisma.module';
import { R2Module } from '../r2/r2.module';
import { NotificationsModule } from '@/notifications/notifications.module';
@Module({
  imports: [
    PrismaModule,
    R2Module,
    NotificationsModule
  ],
  controllers: [CoachingController],
  providers: [CoachingService]
})
export class CoachingModule {}
