// src/stats/stats.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StatsService } from './stats.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('stats')
@UseGuards(AuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('dashboard')
  async getDashboard(@Request() req: any) {
    return this.statsService.getUserDashboardStats(req.user.sub);
  }

  @Get('year')
  async getYearly(@Request() req: any, @Query('y') year: string) {
    return this.statsService.getYearlyStats(req.user.sub, parseInt(year, 10));
  }

  @Get('month')
  async getMonthly(
    @Request() req: any, 
    @Query('y') year: string, 
    @Query('m') month: string
  ) {
    return this.statsService.getMonthlyStats(req.user.sub, parseInt(year, 10), parseInt(month, 10));
  }
}