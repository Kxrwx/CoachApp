import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalInput, EvaluateTemplateInput } from './goals.controller';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async createGoal(userId: string, data: CreateGoalInput) {
    return this.prisma.goal.create({
      data: {
        userId,
        name: data.name,
        type: data.type,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isActive: data.isActive ?? true,
        targets: {
          create: data.targets.map((t) => ({
            metricId: t.metricId,
            targetValue: t.targetValue,
          })),
        },
      },
      include: { targets: { include: { metric: true } } },
    });
  }

  async getUserGoals(userId: string) {
    return this.prisma.goal.findMany({
      where: { userId },
      include: { targets: { include: { metric: true } } },
      orderBy: { startDate: 'desc' },
    });
  }

  async updateGoal(userId: string, id: string, data: CreateGoalInput) {
    // Vérification de l'existence et propriété
    const existingGoal = await this.prisma.goal.findFirst({
      where: { id, userId },
    });
    if (!existingGoal) throw new NotFoundException('Objectif introuvable.');

    // Nettoyage et recréation des cibles associées
    await this.prisma.goalTarget.deleteMany({ where: { goalId: id } });

    return this.prisma.goal.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isActive: data.isActive,
        targets: {
          create: data.targets.map((t) => ({
            metricId: t.metricId,
            targetValue: t.targetValue,
          })),
        },
      },
      include: { targets: { include: { metric: true } } },
    });
  }

  async toggleGoalActive(userId: string, id: string, isActive: boolean) {
    const existingGoal = await this.prisma.goal.findFirst({
      where: { id, userId },
    });
    if (!existingGoal) throw new NotFoundException('Objectif introuvable.');

    return this.prisma.goal.update({
      where: { id },
      data: { isActive },
    });
  }

  async deleteGoal(userId: string, id: string) {
    const existingGoal = await this.prisma.goal.findFirst({
      where: { id, userId },
    });
    if (!existingGoal) throw new NotFoundException('Objectif introuvable.');

    // Les cascades configurées au niveau de Prisma nettoieront goalTarget automatiquement
    return this.prisma.goal.delete({ where: { id } });
  }

  async evaluateTemplate(userId: string, config: EvaluateTemplateInput) {
    const { templateType, metricId } = config;

    if (templateType === 'pr_percentage') {
      const percentage = config.percentage || 100;

      const personalRecord = await this.prisma.personalRecord.findFirst({
        where: { userId, metricId },
        orderBy: { value: 'desc' },
      });

      if (!personalRecord) {
        throw new NotFoundException("Aucun record personnel enregistré pour cette métrique.");
      }

      const calculatedValue = Math.round((personalRecord.value * (percentage / 100)) * 10) / 10;

      return {
        suggestedValue: calculatedValue,
        context: `Calculé sur la base de votre record personnel (${personalRecord.value}) à ${percentage}%.`,
      };
    }

    if (templateType === 'yearly_remaining_rides') {
      const totalTarget = config.totalYearlyTarget || 50;
      const currentYear = new Date().getFullYear().toString();

      const metric = await this.prisma.metric.findUnique({
        where: { id: metricId },
      });
      if (!metric) throw new NotFoundException('Métrique introuvable.');

      const computed = await this.prisma.computedMetric.findFirst({
        where: {
          userId,
          metricKey: metric.key,
          period: currentYear,
        },
      });

      const currentCount = computed ? computed.value : 0;
      const remaining = totalTarget - currentCount;
      const suggestedValue = remaining > 0 ? remaining : 0;

      return {
        suggestedValue,
        context: `Effectué : ${currentCount} sortie(s) sur un total visé de ${totalTarget}. Il vous reste ${suggestedValue} sorties à faire cette année.`,
      };
    }

    throw new BadRequestException('Type de template non pris en charge.');
  }
}