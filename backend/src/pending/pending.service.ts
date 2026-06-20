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
      
      case 'TRAINING_PROPOSAL' as PendingActionType: 
        await this.handleTrainingProposal(userId, payload);
        break;

      case 'GOAL_PROPOSAL' as PendingActionType:
        await this.handleGoalProposal(userId, payload);
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

  private async handleTrainingProposal(userId: string, payload: any) {
    const { 
      title, 
      scheduledDate, 
      activityType, 
      description, 
      coachId,
      startTime,
      duration,
      isRecurring,
      recurrenceRule,
      color 
    } = payload;

    if (!title || !scheduledDate || !activityType) {
      throw new BadRequestException("Payload invalide pour TRAINING_PROPOSAL");
    }

    await this.prisma.plannedWorkout.create({
      data: {
        userId,
        title,
        description: description || null,
        type: activityType,                 
        startDate: new Date(scheduledDate), 
        startTime: startTime || null,
        duration: duration ? parseInt(duration) : null,
        isRecurring: isRecurring || false,
        rrule: recurrenceRule || null,
        color: color || "#6366f1",
      }
    });

    this.logger.log(`[Training Proposal] Séance '${title}' acceptée et planifiée pour l'user ${userId} (par le coach ${coachId})`);
  }

private async handleGoalProposal(userId: string, payload: any) {

  const { 
    name, 
    type, 
    startDate, 
    endDate, 
    targets, 
    coachId 
  } = payload;

  const goalName = name || payload.title;
  const goalEndDate = endDate || payload.targetDate;
  const goalType = type || 'COACH_PROPOSAL';
  const goalStartDate = startDate ? new Date(startDate) : new Date();

  if (!goalName || !goalEndDate) {
    throw new BadRequestException("Payload invalide pour GOAL_PROPOSAL (Le nom et la date de fin sont requis)");
  }

  await this.prisma.goal.create({
    data: {
      userId,
      name: goalName,
      type: goalType,
      startDate: goalStartDate,
      endDate: new Date(goalEndDate),
      isActive: true, 
      targets: {
        create: targets?.map((t: any) => ({
          metricId: t.metricId,
          targetValue: typeof t.targetValue === 'string' ? parseFloat(t.targetValue) : t.targetValue,
        })) || [],
      },
    },
  });

  this.logger.log(`[Goal Proposal] Objectif '${goalName}' accepté et créé dans la table Goal pour l'user ${userId} (par le coach ${coachId})`);
}
}