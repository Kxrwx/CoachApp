import { Controller, Get,  Body, Req, UseGuards, Post } from '@nestjs/common';
import { UserPhysiologyService } from './physio.service';
import { AuthGuard } from '../auth/auth.guard'; 

@Controller('physiology')
@UseGuards(AuthGuard) 
export class UserPhysiologyController {
  constructor(private readonly physiologyService: UserPhysiologyService) {}

  @Get()
  async getPhysiology(@Req() req) {
    return this.physiologyService.getPhysiology(req.user.sub);
  }

  @Post()
  async updatePhysiology(@Req() req, @Body() body: any) {
    return this.physiologyService.upsertPhysiology(req.user.sub, body);
  }

  @Get('calculate')
  async calculatePhysiology(@Req() req) {
    return this.physiologyService.calculateMetrics(req.user.sub);
  }
}