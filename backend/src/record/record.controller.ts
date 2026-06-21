//src/record/record.controller.ts
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { RecordService } from './record.service';
import { AuthGuard } from '../auth/auth.guard'; 

@Controller('record')
@UseGuards(AuthGuard) 
export class RecordController {
  constructor(private readonly recordService: RecordService) {}

  @Get()
  async getRecord(@Req() req) {
    if (!req.user || !req.user.sub) {
      throw new Error("Payload de l'utilisateur introuvable dans la requête");
    }
    
    return this.recordService.getRecord(req.user.sub);
  }
}