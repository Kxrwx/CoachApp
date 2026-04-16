import { Module } from '@nestjs/common';
import { StravaService } from './strava.service';
import { StravaController } from './strava.controller';

@Module({
  providers: [StravaService],
  controllers: [StravaController]
})
export class StravaModule {}
