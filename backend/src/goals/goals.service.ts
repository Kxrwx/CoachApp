// src/goals/goals.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalInput, EvaluateTemplateInput } from './goals.controller';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur de l'app
   * @param {CreateGoalInput} data => datas de l'objectif a mettre dans la db 
   * @return {*} => creer un objectif dans la db
   * @memberof GoalsService
   */
  async createGoal(userId: string, data: CreateGoalInput) {
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

    return this.prisma.goal.create({
      data: {
        userId,
        name: data.name,
        type: 'free',
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isActive: data.isActive ?? true,
      },
      include: { targets: { include: { metric: true } } }, 
    });
  }

  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur de l'app
   * @return {*} => recupere tout les objectifs de l'utilisateur dans la db
   * @memberof GoalsService
   */
  async getUserGoals(userId: string) {
    const goals = await this.prisma.goal.findMany({
      where: { userId },
      include: { targets: { include: { metric: true } } },
      orderBy: { startDate: 'desc' },
    });

    if (goals.length === 0) return goals;

    const metricIds = Array.from(new Set(goals.flatMap((goal) => goal.targets.map((target) => target.metricId))));
    const metricKeys = Array.from(new Set(goals.flatMap((goal) => goal.targets.map((target) => target.metric?.key || '')))).filter(Boolean);

    const personalRecords = metricIds.length > 0 
      ? await this.prisma.personalRecord.findMany({
          where: { userId, metricId: { in: metricIds } },
          orderBy: { value: 'desc' },
        })
      : [];

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const computedMetrics = metricKeys.length > 0
      ? await this.prisma.computedMetric.findMany({
          where: { userId, metricKey: { in: metricKeys }, period: currentMonth },
        })
      : [];

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

  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur de l'ap
   * @param {string} id => l'id de l'objectif a modifier
   * @param {CreateGoalInput} data => les nouvelles datas de l'objectif a mettre dans la db
   * @return {*} => met à jour un objectif dans la db
   * @memberof GoalsService
   */
  async updateGoal(userId: string, id: string, data: CreateGoalInput) {
    const existingGoal = await this.prisma.goal.findFirst({ where: { id, userId } });
    if (!existingGoal) throw new NotFoundException('Objectif introuvable.');

    await this.prisma.goalTarget.deleteMany({ where: { goalId: id } });

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

      return this.prisma.goal.update({
        where: { id },
        data: {
          name: data.name,
          type: 'template',
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          isActive: data.isActive,
          targets: { create: [{ metricId: template.metricId, targetValue }] },
        },
        include: { targets: { include: { metric: true } } },
      });
    }

    if (data.targets && data.targets.length > 0) {
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

    return this.prisma.goal.update({
      where: { id },
      data: {
        name: data.name,
        type: 'free',
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isActive: data.isActive,
      },
      include: { targets: { include: { metric: true } } },
    });
  }

  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur de l'app
   * @param {string} id => l'id de l'objectif a modifier
   * @param {boolean} isActive => le nouveau statut d'activation de l'objectif
   * @return {*} => active ou désactive un objectif dans la db
   * @memberof GoalsService
   */
  async toggleGoalActive(userId: string, id: string, isActive: boolean) {
    const existingGoal = await this.prisma.goal.findFirst({ where: { id, userId } });
    if (!existingGoal) throw new NotFoundException('Objectif introuvable.');

    return this.prisma.goal.update({ where: { id }, data: { isActive } });
  }

  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur de l'app
   * @param {string} id => l'id de l'objectif a supprimer
   * @return {*} => supprime un objectif dans la db
   * @memberof GoalsService
   */ 
  async deleteGoal(userId: string, id: string) {
    const existingGoal = await this.prisma.goal.findFirst({ where: { id, userId } });
    if (!existingGoal) throw new NotFoundException('Objectif introuvable.');

    return this.prisma.goal.delete({ where: { id } });
  }

  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur de l'app
   * @param {EvaluateTemplateInput} config => la configuration pour l'évaluation du template (type de template, métrique ciblée, etc.)
   * @return {*} => retourne une évaluation du template avec une valeur suggérée pour la cible et un contexte explicatif
   * @memberof GoalsService
   */
  async evaluateTemplate(userId: string, config: EvaluateTemplateInput) {
    let mergedConfig = { ...config } as any;
    
    if (config.templateId) {
      const templates = await this.getAvailableTemplates(userId);
      const selectedTemplate = templates.find((t) => t.id === config.templateId);
      if (selectedTemplate) {
        mergedConfig = { ...selectedTemplate, ...mergedConfig };
      }
    }

    const { templateType, metricId } = mergedConfig;
    const metric = await this.prisma.metric.findUnique({ where: { id: metricId } });
    if (!metric) throw new NotFoundException('Métrique introuvable.');

    if (templateType === 'user_defined') {
      const pr = await this.prisma.personalRecord.findFirst({
        where: { userId, metricId: metric.id },
        orderBy: { value: 'desc' },
      });
      const recordValue = pr ? pr.value : 0;

      const isVolumeMetric = ['ride_count', 'distance_km', 'elevation_gain', 'duration_hours', 'calories'].includes(metric.key);

      if (isVolumeMetric) {
        const now = new Date();
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
        
        const prevComputed = await this.prisma.computedMetric.findFirst({
          where: { userId, metricKey: metric.key, period: previousMonth },
        });

        const lastMonthValue = prevComputed ? prevComputed.value : 0;

        const suggestedValue = lastMonthValue > 0 ? Math.round(lastMonthValue * 1.05) : 0;

        return {
          suggestedValue,
          metricId,
          context: `Mois dernier : ${lastMonthValue} ${metric.unit || ''}. Objectif suggéré (+5%) : ${suggestedValue} ${metric.unit || ''}.`,
        };
      } else {

        const suggestedValue = recordValue > 0 ? Math.round(recordValue * 1.02) : 0;
        
        const contextMsg = recordValue > 0 
          ? `Votre record absolu (PR) est de ${recordValue} ${metric.unit || ''}. L'objectif suggéré est de le battre : ${suggestedValue} ${metric.unit || ''}.`
          : `Aucun record enregistré pour le moment. Saisissez votre première cible !`;

        return {
          suggestedValue,
          metricId,
          context: contextMsg,
        };
      }
    }

    throw new Error('Type de template non pris en charge.');
  }

  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur de l'app
   * @return {*} => recupere tout les templates de la db 'Metric'
   * @memberof GoalsService
   */
  async getAvailableTemplates(userId: string) {
    const targetKeys = [
      'ride_count', 'distance_km', 'elevation_gain', 'duration_hours',
      'ride_max_distance_km', 'ride_max_elevation_gain', 'ride_max_duration_hours',
      'power_3s', 'power_30s', 'power_1min', 'power_2min', 'power_5min',
      'power_10min', 'power_20min', 'power_1h', 'power_2h', 'power_4h',
      'hr_avg', 'cadence_avg', 'calories'
    ];

    const metrics = await this.prisma.metric.findMany({
      where: { key: { in: targetKeys } },
    });

    const templates: any[] = [];

    const addTemplate = (key: string, id: string, name: string, description: string) => {
      const foundMetric = metrics.find((m) => m.key === key);
      if (foundMetric) {
        templates.push({
          id,
          name,
          description,
          templateType: 'user_defined',
          metricId: foundMetric.id,
          metricName: key,
        });
      }
    };

    addTemplate('ride_count', 't_ride_count', 'Volume : Nombre de sorties', 'Cumulez un nombre cible de sessions sur la période.');
    addTemplate('distance_km', 't_distance_km', 'Volume : Distance totale (km)', 'Fixez un cap de kilomètres global à franchir.');
    addTemplate('elevation_gain', 't_elevation_gain', 'Volume : Dénivelé total (m)', 'Cumulez du dénivelé positif à travers vos sorties.');
    addTemplate('duration_hours', 't_duration_hours', 'Volume : Temps d\'entraînement (h)', 'Planifiez votre volume horaire total sur le vélo.');

    addTemplate('ride_max_distance_km', 't_ride_max_distance_km', 'Record : Sortie la plus longue (km)', 'Ciblez la distance maximale à réaliser en une seule et unique sortie.');
    addTemplate('ride_max_elevation_gain', 't_ride_max_elevation_gain', 'Record : Plus gros dénivelé sur une sortie (m)', 'Relevez le défi du plus grand dénivelé positif gravi en une seule fois.');
    addTemplate('ride_max_duration_hours', 't_ride_max_duration_hours', 'Record : Plus longue durée sur une sortie (h)', 'Fixez le nombre d\'heures maximales à tenir sur une seule session de selle.');

    addTemplate('power_3s', 't_power_3s', 'Puissance Maximale - Pmax (3s)', 'Ciblez votre pic de puissance pure pour les sprints courts.');
    addTemplate('power_30s', 't_power_30s', 'Puissance Sprint (30s)', 'Maintenez une puissance explosive sur un effort de type fin de bosse.');
    addTemplate('power_1min', 't_power_1min', 'Puissance Anaérobie (1min)', 'Travaillez votre résistance lactique maximale.');
    addTemplate('power_2min', 't_power_2min', 'Puissance PMAS (2min)', 'Optimisez votre puissance maximale aérobie courte.');
    addTemplate('power_5min', 't_power_5min', 'Puissance PAM / VO2max (5min)', 'Développez votre consommation maximale d\'oxygène.');
    addTemplate('power_10min', 't_power_10min', 'Puissance Seuil Haut (10min)', 'Améliorez votre puissance sur les efforts de contre-la-montre courts.');
    addTemplate('power_20min', 't_power_20min', 'Puissance Seuil / FTP (20min)', 'Le test de référence pour évaluer et faire évoluer votre FTP.');
    addTemplate('power_1h', 't_power_1h', 'Puissance Maximale continue (1h)', 'Maintenez une puissance constante et solide lors d\'un effort long.');
    addTemplate('power_2h', 't_power_2h', 'Puissance d\'Endurance Rythmée (2h)', 'Mesurez votre régularité et gestion de l\'allure sur sortie moyenne.');
    addTemplate('power_4h', 't_power_4h', 'Puissance d\'Endurance Longue (4h)', 'Suivez votre puissance moyenne sur les sorties d\'endurance fondamentale majeures.');

    addTemplate('hr_avg', 't_hr_avg', 'Physio : Fréquence Cardiaque Moyenne', 'Gérez l\'intensité cardiaque globale de vos entraînements.');
    addTemplate('cadence_avg', 't_cadence_avg', 'Technique : Cadence de pédalage moyenne', 'Travaillez votre vélocité ou votre force (RPM cible).');
    addTemplate('calories', 't_calories', 'Énergie : Dépense Énergétique (kcal)', 'Suivez la charge énergétique totale brûlée.');

    return templates;
  }
}