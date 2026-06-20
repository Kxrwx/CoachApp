import { Controller, Post, Get, Body, Param, Req, UseGuards, Delete, Patch } from '@nestjs/common';
import { CoachingService } from './coaching.service';
import { AuthGuard } from '../auth/auth.guard';

// 1. Définir une interface pour éviter de répéter le type
interface PermissionsDto {
  shareActivities: boolean;
  sharePhysiology: boolean;
  shareRecords: boolean;
  shareObjectives: boolean;
  shareAnalytics: boolean;
}

@Controller('coaching')
@UseGuards(AuthGuard)
export class CoachingController {
  constructor(private readonly coachingService: CoachingService) {}

  @Post('invitations')
  async createInvitation(@Req() req) {
    return this.coachingService.generateInvitation(req.user.sub);
  }

  @Get('invitations/:token')
  async getInvitation(@Param('token') token: string) {
    return this.coachingService.getInvitationDetails(token);
  }

  @Post('invitations/consume')
  async consumeInvitation(
    @Req() req, 
    @Body() body: { token: string } & PermissionsDto 
  ) {
    return this.coachingService.consumeInvitation(req.user.sub, body);
  }

  @Get('my-coach')
  async getMyCoach(@Req() req) {
    return this.coachingService.getMyCoach(req.user.sub);
  }

  @Get('my-athletes')
  async getMyAthletes(@Req() req) {
    return this.coachingService.getMyAthletes(req.user.sub);
  }

  @Delete('link/:id')
  async terminateCoaching(@Req() req, @Param('id') id: string) {
    return this.coachingService.terminateCoachingLink(id, req.user.sub);
  }

  @Patch('link/:id/permissions')
  async updatePermissions(
    @Req() req, 
    @Param('id') id: string, 
    @Body() body: PermissionsDto
  ) {
    return this.coachingService.updatePermissions(id, req.user.sub, body);
  }


  @Get('my-athletes-summary')
  async getAthletesSummary(@Req() req: any) {
    return this.coachingService.getAthletesSummary(req.user.sub);
  }

  @Get('athletes/:id/overview')
  async getAthleteOverview(@Req() req, @Param('id') athleteId: string) {
    return this.coachingService.getAthleteOverview(req.user.sub, athleteId);
  }

  @Get('athletes/:id/physio')
  async getAthletePhysio(@Req() req, @Param('id') athleteId: string) {
    return this.coachingService.getAthletePhysio(req.user.sub, athleteId);
  }

  @Get('athletes/:id/analytics')
  async getAthleteAnalytics(@Req() req, @Param('id') athleteId: string) {
    return this.coachingService.getAthleteAnalytics(req.user.sub, athleteId);
  }

  @Get('athletes/:id/objectives')
  async getAthleteObjectives(@Req() req, @Param('id') athleteId: string) {
    return this.coachingService.getAthleteObjectives(req.user.sub, athleteId);
  }

  @Get('athletes/:id/records')
  async getAthleteRecords(@Req() req, @Param('id') athleteId: string) {
    return this.coachingService.getAthleteRecords(req.user.sub, athleteId);
  }

  @Get('athletes/:id/activities')
  async getAthleteActivities(@Req() req, @Param('id') athleteId: string) {
    return this.coachingService.getAthleteActivities(req.user.sub, athleteId);
  }

  @Get('athletes/:id/planning')
  async getAthletePlanning(@Req() req, @Param('id') athleteId: string) {
    return this.coachingService.getAthletePlanning(req.user.sub, athleteId);
  }

  @Get('athletes/:athleteId/activities/:activityId')
async getAthleteActivity(
  @Req() req, 
  @Param('athleteId') athleteId: string, 
  @Param('activityId') activityId: string
) {
  return this.coachingService.getAthleteActivityDetail(req.user.sub, athleteId, activityId);
}

@Post('athletes/:id/training-proposal')
  async proposeTraining(
    @Req() req,
    @Param('id') athleteId: string,
    @Body() body: { title: string; scheduledDate: string; activityType: string; description?: string }
  ) {
    const coachId = req.user.sub;
    return this.coachingService.proposeTrainingSession(coachId, athleteId, body);
  }

  @Post('athletes/:id/goal-proposal')
  async proposeGoal(
    @Req() req,
    @Param('id') athleteId: string,
    @Body() body: { 
      name: string; 
      type: string;
      startDate: string;
      endDate: string; 
      description?: string;
      targets?: { metricId: string; targetValue: number }[];
    }
  ) {
    const coachId = req.user.sub;
    return this.coachingService.proposeGoal(coachId, athleteId, body);
  }
}