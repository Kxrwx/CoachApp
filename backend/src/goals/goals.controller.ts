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
} from '@nestjs/common';
import { GoalsService } from './goals.service';
import { AuthGuard } from '../auth/auth.guard';

export interface GoalTargetInput {
  metricId: string;
  targetValue: number;
}

export interface CreateGoalInput {
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  targets: GoalTargetInput[];
}

export interface EvaluateTemplateInput {
  templateType: 'pr_percentage' | 'yearly_remaining_rides';
  metricId: string;
  percentage?: number;
  totalYearlyTarget?: number;
}

@Controller('goals')
@UseGuards(AuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  async createGoal(@Request() req: any, @Body() createDto: CreateGoalInput) {
    return this.goalsService.createGoal(req.user.sub, createDto);
  }

  @Get()
  async getUserGoals(@Request() req: any) {
    return this.goalsService.getUserGoals(req.user.sub);
  }

  @Post('templates/evaluate')
  async evaluateTemplate(
    @Request() req: any,
    @Body() body: EvaluateTemplateInput,
  ) {
    return this.goalsService.evaluateTemplate(req.user.sub, body);
  }

  @Put(':id')
  async updateGoal(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: CreateGoalInput,
  ) {
    return this.goalsService.updateGoal(req.user.sub, id, updateDto);
  }

  @Put(':id/toggle')
  async toggleGoalActive(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.goalsService.toggleGoalActive(req.user.sub, id, body.isActive);
  }

  @Delete(':id')
  async deleteGoal(@Request() req: any, @Param('id') id: string) {
    return this.goalsService.deleteGoal(req.user.sub, id);
  }
}