import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PendingActionType, ActionStatus } from '@prisma/client';

@Injectable()
export class PendingService {
  private readonly logger = new Logger(PendingService.name);

  constructor(private prisma: PrismaService) {}

  async getPendingActions(userId: string) {
    return this.prisma.pendingAction.findMany({
      where: { userId, status: ActionStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveAction(userId: string, actionId: string, status: ActionStatus) {
    const action = await this.prisma.pendingAction.findFirst({
      where: { id: actionId, userId },
    });

    if (!action) throw new NotFoundException("Action introuvable.");
    if (action.status !== ActionStatus.PENDING) throw new BadRequestException("Cette action a déjà été traitée.");

    if (status === ActionStatus.ACCEPTED) {
      await this.executeActionLogic(userId, action.type, action.payload);
    }

    return this.prisma.pendingAction.update({
      where: { id: actionId },
      data: { status },
    });
  }

  private async executeActionLogic(userId: string, type: PendingActionType, payload: any) {
    switch (type) {
      case PendingActionType.PHYSIOLOGY_UPDATE:
        await this.handlePhysiologyUpdate(userId, payload);
        break;
      
      default:
        this.logger.warn(`Aucune logique d'exécution définie pour le type : ${type}`);
    }
  }

  private async handlePhysiologyUpdate(userId: string, payload: any) {
    const { metric, newValue } = payload; 
    
    if (!metric || newValue === undefined) {
      throw new BadRequestException("Payload invalide pour PHYSIOLOGY_UPDATE");
    }

    await this.prisma.userPhysiology.upsert({
      where: { userId },
      update: { [metric]: newValue },
      create: { userId, [metric]: newValue },
    });

    this.logger.log(`[Physio Update] ${metric} mis à jour à ${newValue} pour l'user ${userId}`);
  }
}