// src/planning/planning.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { rrulestr } from 'rrule';
import { CreatePlannedWorkoutInput, UpdatePlannedWorkoutInput } from './planning.controller';

@Injectable()
export class PlanningService {
  constructor(private prisma: PrismaService) {}


  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur de l'app
   * @param {CreatePlannedWorkoutInput} data => les données a insérer dans workout planifié
   * @return {*} => crée un entraînement planifié dans la base de données
   * @memberof PlanningService
   */
  async createPlannedWorkout(
    userId: string,
    data: CreatePlannedWorkoutInput,
  ) {
    const workoutDate = new Date(data.startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0); 

  if (workoutDate < today) {
    throw new BadRequestException("Impossible de planifier un entraînement dans le passé.");
  }
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
   *
   *
   * @param {string} userId => l'id de l'utilisateur de l'app
   * @return {*} => recupere tout les entrainement planifié de l'user
   * @memberof PlanningService
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
   *
   *
   * @private
   * @param {any[]} workouts => les entrainement planifié a potentiellement dupliquer si ils sont récurrent
   * @param {Date} startDate => la date de début de la période d'affichage du calendrier
   * @param {Date} endDate => la date de fin de la période d'affichage du calendrier
   * @return {*} => retourne la liste des entrainement planifié avec les récurrences dupliquées pour les entrainement récurrent
   * @memberof PlanningService
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
        const rule = rrulestr(workout.rrule, {
          dtstart: workout.startDate,
        });

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
   *
   *
   * @param {string} userId => l'id de l'utilisateur de l'app
   * @param {string} id => l'id de l'entrainement a modfier
   * @param {UpdatePlannedWorkoutInput} data => les données de mise à jour pour l'entrainement
   * @return {*} => met à jour un entraînement planifié dans la base de données
   * @memberof PlanningService
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
   *
   *
   * @param {string} userId => l'id de l'utilisateur de l'app
   * @param {string} id => l'id de l'entrainement a supprimer
   * @return {*} => supprime un entraînement planifié de la base de données
   * @memberof PlanningService
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
   *
   *
   * @param {string} userId => l'id de l'utilisateur de l'app
   * @param {string} id => l'id de l'entrainement a modfier
   * @param {('planned' | 'completed' | 'cancelled')} status => le nouveau statut de l'entrainement
   * @return {*} => met à jour le statut d'un entraînement planifié dans la base de données
   * @memberof PlanningService
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