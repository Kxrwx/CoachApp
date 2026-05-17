import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalInput, EvaluateTemplateInput } from './goals.controller';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async createGoal(userId: string, data: CreateGoalInput) {
    // Mode 1: Template-based goal
    if (data.templateId) {
      const templates = await this.getAvailableTemplates(userId);
      const template = templates.find((t) => t.id === data.templateId);
      if (!template) throw new NotFoundException('Template introuvable.');

      // Vérifie si l'utilisateur a fourni une valeur cible manuelle, sinon on évalue le template
      const userTarget = data.targets?.find((t) => t.metricId === template.metricId);
      let targetValue: number;

      if (userTarget && userTarget.targetValue !== undefined) {
        targetValue = userTarget.targetValue;
      } else {
        const evaluation = await this.evaluateTemplate(userId, {
          templateId: data.templateId,
          metricId: template.metricId,
        });
        targetValue = evaluation.suggestedValue;
      }

      // Crée l'objectif avec la valeur finale (calculée ou saisie)
      return this.prisma.goal.create({
        data: {
          userId,
          name: data.name,
          type: 'template',
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          isActive: data.isActive ?? true,
          targets: {
            create: [
              {
                metricId: template.metricId,
                targetValue: targetValue,
              },
            ],
          },
        },
        include: { targets: { include: { metric: true } } },
      });
    }

    // Mode 2: Free goal (objectif sans template)
    if (data.targets && data.targets.length > 0) {
      return this.prisma.goal.create({
        data: {
          userId,
          name: data.name,
          type: 'custom',
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

    throw new BadRequestException('Fournissez soit un templateId, soit des targets libres.');
  }

  async getUserGoals(userId: string) {
    const goals = await this.prisma.goal.findMany({
      where: { userId },
      include: { targets: { include: { metric: true } } },
      orderBy: { startDate: 'desc' },
    });

    if (goals.length === 0) return goals;

    const metricIds = Array.from(new Set(goals.flatMap((goal) => goal.targets.map((target) => target.metricId))));
    const metricKeys = Array.from(new Set(goals.flatMap((goal) => goal.targets.map((target) => target.metric?.key || '')))).filter(Boolean);

    const personalRecords = await this.prisma.personalRecord.findMany({
      where: { userId, metricId: { in: metricIds } },
      orderBy: { value: 'desc' },
    });

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const computedMetrics = await this.prisma.computedMetric.findMany({
      where: { userId, metricKey: { in: metricKeys }, period: currentMonth },
    });

    const bestRecordByMetric = personalRecords.reduce<Record<string, number>>((acc, record) => {
      if (!acc[record.metricId] || acc[record.metricId] < record.value) {
        acc[record.metricId] = record.value;
      }
      return acc;
    }, {});

    return goals.map((goal) => ({
      ...goal,
      targets: goal.targets.map((target) => {
        const metricKey = target.metric?.key;
        const currentValue = metricKey
          ? computedMetrics.find((computed) => computed.metricKey === metricKey)?.value ?? null
          : null;
        const targetValue = target.targetValue || 0;
        const progressPercent = currentValue && targetValue
          ? Math.round((currentValue / targetValue) * 100)
          : null;
        return {
          ...target,
          currentValue,
          progressPercent,
          recordValue: bestRecordByMetric[target.metricId] ?? null,
        };
      }),
    }));
  }

  async updateGoal(userId: string, id: string, data: CreateGoalInput) {
    // Vérification de l'existence et propriété
    const existingGoal = await this.prisma.goal.findFirst({
      where: { id, userId },
    });
    if (!existingGoal) throw new NotFoundException('Objectif introuvable.');

    // Mode 1: Template-based update
    if (data.templateId) {
      const templates = await this.getAvailableTemplates(userId);
      const template = templates.find((t) => t.id === data.templateId);
      if (!template) throw new NotFoundException('Template introuvable.');

      const userTarget = data.targets?.find((t) => t.metricId === template.metricId);
      let targetValue: number;

      if (userTarget && userTarget.targetValue !== undefined) {
        targetValue = userTarget.targetValue;
      } else {
        const evaluation = await this.evaluateTemplate(userId, {
          templateId: data.templateId,
          metricId: template.metricId,
        });
        targetValue = evaluation.suggestedValue;
      }

      await this.prisma.goalTarget.deleteMany({ where: { goalId: id } });

      return this.prisma.goal.update({
        where: { id },
        data: {
          name: data.name,
          type: 'template',
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          isActive: data.isActive,
          targets: {
            create: [
              {
                metricId: template.metricId,
                targetValue: targetValue,
              },
            ],
          },
        },
        include: { targets: { include: { metric: true } } },
      });
    }

    // Mode 2: Free update
    if (data.targets && data.targets.length > 0) {
      await this.prisma.goalTarget.deleteMany({ where: { goalId: id } });

      return this.prisma.goal.update({
        where: { id },
        data: {
          name: data.name,
          type: 'custom',
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

    throw new BadRequestException('Fournissez soit un templateId, soit des targets libres.');
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

    return this.prisma.goal.delete({ where: { id } });
  }

  async evaluateTemplate(userId: string, config: EvaluateTemplateInput) {
    let mergedConfig = { ...config } as any;
    let selectedTemplate: any = null;
    
    if (config.templateId) {
      const templates = await this.getAvailableTemplates(userId);
      selectedTemplate = templates.find((t) => t.id === config.templateId);
      if (selectedTemplate) {
        mergedConfig = { ...selectedTemplate, ...mergedConfig };
      }
    }

    const { templateType, metricId } = mergedConfig;
    const metric = await this.prisma.metric.findUnique({ where: { id: metricId } });
    if (!metric) throw new NotFoundException('Métrique introuvable.');

    const getMonthlyRecords = async (period: string) => {
      return this.prisma.personalRecord.findMany({
        where: { userId, metricId, period },
        orderBy: { value: 'desc' },
      });
    };

    const getPreviousMonth = () => {
      const now = new Date();
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    };

    // Nouveau type de template : Remplissage automatique des structures, valeur saisie par l'utilisateur
    if (templateType === 'user_defined') {
      const previousMonth = getPreviousMonth();
      // Recherche de la métrique calculée du mois précédent pour donner un contexte d'aide à la saisie
      const prevComputed = await this.prisma.computedMetric.findFirst({
        where: { userId, metricKey: metric.key, period: previousMonth },
      });

      const lastMonthValue = prevComputed ? prevComputed.value : 0;

      return {
        suggestedValue: lastMonthValue,
        metricId,
        context: `Mois dernier (${previousMonth}) : ${lastMonthValue} ${metric.unit || 'sortie(s)'}. Indiquez votre nouvel objectif ci-dessous.`,
      };
    }

    if (templateType === 'pr_percentage') {
      const percentage = mergedConfig.percentage || 100;

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
        metricId,
        context: `Basé sur votre record de ${personalRecord.value} ${metric.unit} à ${percentage}% = ${calculatedValue} ${metric.unit}.`,
      };
    }

    if (templateType === 'monthly_growth') {
      const growthPercent = mergedConfig.growthPercent || 10;
      const previousMonth = getPreviousMonth();

      const prevRecords = await getMonthlyRecords(previousMonth);
      if (prevRecords.length === 0) {
        throw new NotFoundException(`Aucune donnée du mois précédent (${previousMonth}) pour calculer la progression.`);
      }

      const avgPrevMonth = prevRecords.reduce((sum, r) => sum + r.value, 0) / prevRecords.length;
      const calculatedValue = Math.round(avgPrevMonth * (1 + growthPercent / 100) * 10) / 10;

      return {
        suggestedValue: calculatedValue,
        metricId,
        context: `Moyenne du mois dernier: ${Math.round(avgPrevMonth * 10) / 10} ${metric.unit}. Avec +${growthPercent}% = ${calculatedValue} ${metric.unit}.`,
      };
    }

    if (templateType === 'quarterly_average_growth') {
      const growthPercent = mergedConfig.growthPercent || 5;
      const now = new Date();
      const months: string[] = [];
      for (let i = 0; i < 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }

      const allRecords = await this.prisma.personalRecord.findMany({
        where: { userId, metricId, period: { in: months } },
      });

      if (allRecords.length === 0) {
        throw new NotFoundException(`Aucune donnée des 3 derniers mois pour cette métrique.`);
      }

      const avgTrimestre = allRecords.reduce((sum, r) => sum + r.value, 0) / allRecords.length;
      const calculatedValue = Math.round(avgTrimestre * (1 + growthPercent / 100) * 10) / 10;

      return {
        suggestedValue: calculatedValue,
        metricId,
        context: `Moyenne trimestre: ${Math.round(avgTrimestre * 10) / 10} ${metric.unit}. Avec +${growthPercent}% = ${calculatedValue} ${metric.unit}.`,
      };
    }

    if (templateType === 'duration_growth_absolute') {
      const growthMinutes = mergedConfig.growthMinutes || 15;
      const previousMonth = getPreviousMonth();

      const prevRecords = await getMonthlyRecords(previousMonth);
      if (prevRecords.length === 0) {
        throw new NotFoundException(`Aucune donnée du mois précédent pour la durée.`);
      }

      const avgPrevMonth = prevRecords.reduce((sum, r) => sum + r.value, 0) / prevRecords.length;
      const growthHours = growthMinutes / 60;
      const calculatedValue = Math.round((avgPrevMonth + growthHours) * 10) / 10;

      return {
        suggestedValue: calculatedValue,
        metricId,
        context: `Durée moyenne mois dernier: ${Math.round(avgPrevMonth * 60)} min. Avec +${growthMinutes} min = ${Math.round(calculatedValue * 60)} min.`,
      };
    }

    throw new BadRequestException('Type de template non pris en charge.');
  }

  async getAvailableTemplates(userId: string) {
    // Récupère les métriques de base, incluant désormais 'ride_count'
    const metrics = await this.prisma.metric.findMany({
      where: { key: { in: ['distance_km', 'duration_hours', 'power_avg', 'power_max', 'ftp', 'ride_count'] } },
    });

    const templates = [
      // Templates Nombre de Sorties
      ...(metrics.find((m) => m.key === 'ride_count')
        ? [
            {
              id: 'rides_monthly_target',
              name: "Nombre de sorties mensuelles",
              description: "Fixez votre nombre cible de sorties pour le mois à venir",
              templateType: 'user_defined' as const,
              metricId: metrics.find((m) => m.key === 'ride_count')!.id,
              metricName: 'ride_count',
            },
          ]
        : []),

      // Templates Distance
      ...(metrics.find((m) => m.key === 'distance_km')
        ? [
            {
              id: 'dist_80_percent_pr',
              name: "80% de votre meilleur enregistrement (distance)",
              description: "Objectif mensuel à 80% de votre record personnelle en km",
              templateType: 'pr_percentage' as const,
              metricId: metrics.find((m) => m.key === 'distance_km')!.id,
              metricName: 'distance_km',
              percentage: 80,
            },
            {
              id: 'dist_monthly_plus_10',
              name: "Distance : +10% vs mois dernier",
              description: "Ajoute 10% à votre moyenne de km du mois précédent",
              templateType: 'monthly_growth' as const,
              metricId: metrics.find((m) => m.key === 'distance_km')!.id,
              metricName: 'distance_km',
              growthPercent: 10,
            },
            {
              id: 'dist_monthly_plus_20',
              name: "Distance : +20% vs mois dernier",
              description: "Ajoute 20% à votre moyenne de km du mois précédent",
              templateType: 'monthly_growth' as const,
              metricId: metrics.find((m) => m.key === 'distance_km')!.id,
              metricName: 'distance_km',
              growthPercent: 20,
            },
            {
              id: 'dist_quarterly_avg_plus_5',
              name: "Distance : moyenne trimestre + 5%",
              description: "Calcule la moyenne des 3 derniers mois puis ajoute 5%",
              templateType: 'quarterly_average_growth' as const,
              metricId: metrics.find((m) => m.key === 'distance_km')!.id,
              metricName: 'distance_km',
              growthPercent: 5,
            },
          ]
        : []),

      // Templates Puissance
      ...(metrics.find((m) => m.key === 'power_max')
        ? [
            {
              id: 'power_80_percent_pr',
              name: "80% de votre puissance maximale",
              description: "Objectif à 80% de votre record de puissance maximale",
              templateType: 'pr_percentage' as const,
              metricId: metrics.find((m) => m.key === 'power_max')!.id,
              metricName: 'power_max',
              percentage: 80,
            },
            {
              id: 'power_90_percent_pr',
              name: "90% de votre puissance maximale",
              description: "Objectif à 90% de votre record de puissance maximale",
              templateType: 'pr_percentage' as const,
              metricId: metrics.find((m) => m.key === 'power_max')!.id,
              metricName: 'power_max',
              percentage: 90,
            },
          ]
        : []),

      // Templates FTP
      ...(metrics.find((m) => m.key === 'ftp')
        ? [
            {
              id: 'ftp_85_percent',
              name: "FTP : 85% (Zone SST)",
              description: "Objectif à 85% de votre FTP - zone d'entraînement stable",
              templateType: 'pr_percentage' as const,
              metricId: metrics.find((m) => m.key === 'ftp')!.id,
              metricName: 'ftp',
              percentage: 85,
            },
            {
              id: 'ftp_95_percent',
              name: "FTP : 95% (Zone VO2)",
              description: "Objectif à 95% de votre FTP - travail aérobie",
              templateType: 'pr_percentage' as const,
              metricId: metrics.find((m) => m.key === 'ftp')!.id,
              metricName: 'ftp',
              percentage: 95,
            },
          ]
        : []),

      // Templates Durée
      ...(metrics.find((m) => m.key === 'duration_hours')
        ? [
            {
              id: 'duration_plus_15',
              name: "Durée : +15 minutes vs mois dernier",
              description: "Ajoute 15 minutes à votre durée moyenne mensuelle",
              templateType: 'duration_growth_absolute' as const,
              metricId: metrics.find((m) => m.key === 'duration_hours')!.id,
              metricName: 'duration_hours',
              growthMinutes: 15,
            },
            {
              id: 'duration_plus_30',
              name: "Durée : +30 minutes vs mois dernier",
              description: "Ajoute 30 minutes à votre durée moyenne mensuelle",
              templateType: 'duration_growth_absolute' as const,
              metricId: metrics.find((m) => m.key === 'duration_hours')!.id,
              metricName: 'duration_hours',
              growthMinutes: 30,
            },
          ]
        : []),
    ];

    return templates;
  }
}