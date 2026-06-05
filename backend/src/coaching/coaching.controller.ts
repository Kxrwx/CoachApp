import { Controller, Post, Get, Body, Param, Req, UseGuards } from '@nestjs/common';
import { CoachingService } from './coaching.service';
import { AuthGuard } from '../auth/auth.guard';

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
    @Body() body: { token: string; shareActivities: boolean; sharePhysiology: boolean; shareCalendar: boolean }
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
}