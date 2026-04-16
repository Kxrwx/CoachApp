import { Controller, Get, Query, Req, UseGuards, Res, Delete } from '@nestjs/common';
import { StravaService } from './strava.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('strava')
export class StravaController {
  constructor(private readonly stravaService: StravaService) {}

  @UseGuards(AuthGuard)
  @Get('connect')
  async connect() {
    return { url: this.stravaService.getAuthUrl() };
  }

  @UseGuards(AuthGuard)
  @Get('callback')
  async callback(@Query('code') code: string, @Req() req: any) {
    const userId = req.user.sub;
    await this.stravaService.linkAccount(userId, code);
    
    return { message: "Compte Strava lié avec succès" };
  }

  @UseGuards(AuthGuard)
  @Delete('disconnect')
  async disconnect(@Req() req: any) {
    const userId = req.user.sub;
    await this.stravaService.unlinkAccount(userId);
    
    return { message: "Compte Strava délié avec succès" };
  }

}