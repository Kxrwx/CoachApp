import { Controller, Get, Put, Body, Req, UseGuards } from '@nestjs/common';
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

  @Put()
  async updatePhysiology(@Req() req, @Body() body: any) {
    return this.physiologyService.upsertPhysiology(req.user.sub, body);
  }
}