import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { PlanningService } from './planning.service';
import { AuthGuard } from '../auth/auth.guard';

// Types locaux pour s'affranchir du fichier DTO externe
export interface CreatePlannedWorkoutInput {
  title: string;
  description?: string;
  type: string;
  duration?: number;
  distance?: number;
  intensity?: string;
  startDate: string;
  startTime?: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  endDate?: string;
  color?: string;
}

export interface UpdatePlannedWorkoutInput {
  title?: string;
  description?: string;
  type?: string;
  duration?: number;
  distance?: number;
  intensity?: string;
  startDate?: string;
  startTime?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  endDate?: string;
  color?: string;
  status?: 'planned' | 'completed' | 'cancelled';
}

@Controller('planning')
@UseGuards(AuthGuard)
export class PlanningController {
  constructor(private planningService: PlanningService) {}

  /**
   * Crée un nouvel entraînement planifié
   */
  @Post('workouts')
  async createWorkout(
    @Request() req: any,
    @Body() createDto: CreatePlannedWorkoutInput,
  ) {
    return this.planningService.createPlannedWorkout(
      req.user.sub,
      createDto,
    );
  }

  /**
   * Récupère les événements du calendrier
   */
  @Get('calendar')
  async getCalendarEvents(
    @Request() req: any,
    @Query() query: any,
  ) {
    return this.planningService.getCalendarEvents(
      req.user.id,
    );
  }

  /**
   * Récupère tous les entraînements planifiés d'un utilisateur
   */
  @Get('workouts')
  async getAllWorkouts(@Request() req: any) {
    return this.planningService.getCalendarEvents(
      req.user.sub,
    );
  }

  /**
   * Met à jour un entraînement planifié
   */
  @Put('workouts/:id')
  async updateWorkout(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdatePlannedWorkoutInput,
  ) {
    return this.planningService.updatePlannedWorkout(
      req.user.sub,
      id,
      updateDto,
    );
  }

  /**
   * Change le statut d'un entraînement
   */
  @Put('workouts/:id/status')
  async updateWorkoutStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { status: 'planned' | 'completed' | 'cancelled' },
  ) {
    return this.planningService.updateWorkoutStatus(
      req.user.id,
      id,
      body.status,
    );
  }

  /**
   * Supprime un entraînement planifié
   */
  @Delete('workouts/:id')
  async deleteWorkout(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.planningService.deletePlannedWorkout(
      req.user.id,
      id,
    );
  }
}