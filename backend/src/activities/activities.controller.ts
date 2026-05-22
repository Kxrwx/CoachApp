// src/activities/activities.controller.ts
import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  async getActivities(@Req() req: any) {
    return this.activitiesService.findAll(req.user.sub);
  }

  @Get(':id')
  async getActivity(@Param('id') id: string, @Req() req: any) {
    return this.activitiesService.findOne(req.user.sub, id);
  }
}