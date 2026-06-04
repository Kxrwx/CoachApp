// src/pending-actions/pending.controller.ts
import { 
  Controller, 
  Get, 
  Patch, 
  Param, 
  Body, 
  UseGuards, 
  ParseUUIDPipe, 
  Req 
} from '@nestjs/common';
import { PendingService } from './pending.service';
import { AuthGuard } from '@/auth/auth.guard';
import { ActionStatus } from '@prisma/client';

@Controller('pending-actions')
@UseGuards(AuthGuard) 
export class PendingController {
  constructor(private pendingActionService: PendingService) {}

  @Get()
  async getActions(@Req() req: any) {
    return this.pendingActionService.getPendingActions(req.user.sub);
  }

  @Patch(':id/resolve')
  async resolve( 
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: ActionStatus,
    @Req() req: any
  ) {
    return this.pendingActionService.resolveAction(req.user.sub, id, status);
  }
}