import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { rrulestr } from 'rrule';
import { CreatePlannedWorkoutInput, UpdatePlannedWorkoutInput } from './planning.controller';

@Injectable()
export class PlanningService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crée un nouvel entraînement planifié
   */
  async createPlannedWorkout(
    userId: string,
    data: CreatePlannedWorkoutInput,
  ) {
    // Correction ici : On autorise explicitement string ou null
    let rrule: string | null = null;

    if (data.isRecurring && data.recurrenceRule) {
      rrule = data.recurrenceRule;
    }

    return this.prisma.plannedWorkout.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        type: data.type,
        duration: data.duration,
        distance: data.distance,
        intensity: data.intensity,
        startDate: new Date(data.startDate),
        startTime: data.startTime,
        isRecurring: data.isRecurring,
        rrule,
        endDate: data.endDate ? new Date(data.endDate) : null,
        color: data.color || '#6366f1',
        status: 'planned',
      },
    });
  }

  /**
   * Récupère les événements du calendrier (-30 à +30 jours)
   */
  async getCalendarEvents(userId: string) {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);
    
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30);

    const plannedWorkouts = await this.prisma.plannedWorkout.findMany({
      where: {
        userId,
        startDate: {
          gte: startDate,
        },
      },
    });

    const activities = await this.prisma.activity.findMany({
      where: {
        userId,
        startDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        stravaDetail: true,
        uploadDetail: true,
      },
    });

    const expandedEvents = this.expandRecurringEvents(
      plannedWorkouts,
      startDate,
      endDate,
    );

    return {
      plannedWorkouts: expandedEvents,
      activities: activities.map((activity) => ({
        id: activity.id,
        title: activity.stravaDetail?.name || 'Activité importée',
        startDate: activity.startDate,
        type: activity.stravaDetail?.type || 'activity',
        distance: activity.stravaDetail?.distance,
        duration: activity.stravaDetail?.movingTime,
        isCompleted: true,
        color: '#10b981',
      })),
    };
  }

  /**
   * Déplie les événements récurrents selon la règle RRULE
   */
  private expandRecurringEvents(
    workouts: any[],
    startDate: Date,
    endDate: Date,
  ) {
    const expanded: any[] = [];

    workouts.forEach((workout) => {
      if (!workout.isRecurring || !workout.rrule) {
        expanded.push({
          ...workout,
        });
        return;
      }

      try {
        // Correction ici : on ne passe que dtstart à rrulestr
        const rule = rrulestr(workout.rrule, {
          dtstart: workout.startDate,
        });

        // C'est ici que la magie de la limitation de date opère déjà !
        const occurrences = rule.between(startDate, endDate, true);

        occurrences.forEach((occurrence) => {
          expanded.push({
            ...workout,
            startDate: occurrence.toISOString(),
            id: `${workout.id}-${occurrence.getTime()}`,
            isRecurringInstance: true,
          });
        });
      } catch (error) {
        expanded.push({
          ...workout,
        });
      }
    });

    return expanded;
  }

  /**
   * Met à jour un entraînement planifié
   */
  async updatePlannedWorkout(
    userId: string,
    id: string,
    data: UpdatePlannedWorkoutInput,
  ) {
    const workout = await this.prisma.plannedWorkout.findFirst({
      where: { id, userId }
    });

    if (!workout) {
      throw new NotFoundException("Entraînement introuvable ou accès refusé.");
    }

    return this.prisma.plannedWorkout.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        duration: data.duration,
        distance: data.distance,
        intensity: data.intensity,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        startTime: data.startTime,
        isRecurring: data.isRecurring,
        rrule: data.recurrenceRule,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        color: data.color,
        status: data.status,
      },
    });
  }

  /**
   * Supprime un entraînement planifié
   */
  async deletePlannedWorkout(userId: string, id: string) {
    const workout = await this.prisma.plannedWorkout.findFirst({
      where: { id, userId }
    });

    if (!workout) {
      throw new NotFoundException("Entraînement introuvable ou accès refusé.");
    }

    return this.prisma.plannedWorkout.delete({
      where: { id },
    });
  }

  /**
   * Change le statut d'un entraînement
   */
  async updateWorkoutStatus(
    userId: string,
    id: string,
    status: 'planned' | 'completed' | 'cancelled',
  ) {
    const workout = await this.prisma.plannedWorkout.findFirst({
      where: { id, userId }
    });

    if (!workout) {
      throw new NotFoundException("Entraînement introuvable ou accès refusé.");
    }

    return this.prisma.plannedWorkout.update({
      where: { id },
      data: { status } as any,
    });
  }
}