import { z } from 'zod';

// ============ AUTH ============

export const SignupSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  stravastUserId: z.number().optional(),
});

export type SignupInput = z.infer<typeof SignupSchema>;

export const SigninSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

export type SigninInput = z.infer<typeof SigninSchema>;

// ============ STRAVA ============

export const StravaLinkSchema = z.object({
  code: z.string().min(1, 'Authorization code required'),
  scope: z.string().optional(),
  state: z.string().optional(),
});

export type StravaLinkInput = z.infer<typeof StravaLinkSchema>;

// ============ UPLOAD ============

export const UploadSchema = z.object({
  file: z.instanceof(Buffer).or(z.instanceof(File)),
  activityType: z.enum(['ride', 'run', 'swim', 'hike', 'walk']).optional(),
  activityName: z.string().max(255).optional(),
  activityDate: z.string().datetime().optional(),
});

export type UploadInput = z.infer<typeof UploadSchema>;

// ============ ACTIVITIES ============

export const CreateActivitySchema = z.object({
  name: z.string().min(1, 'Activity name required').max(255),
  type: z.enum(['ride', 'run', 'swim', 'hike', 'walk']),
  distance: z.number().positive('Distance must be positive'),
  elevation: z.number().min(0, 'Elevation cannot be negative'),
  duration: z.number().positive('Duration must be positive'),
  startDate: z.string().datetime('Invalid date format'),
  endDate: z.string().datetime('Invalid date format').optional(),
  description: z.string().max(1000).optional(),
  speed: z.number().positive().optional(),
});

export type CreateActivityInput = z.infer<typeof CreateActivitySchema>;

export const UpdateActivitySchema = CreateActivitySchema.partial();
export type UpdateActivityInput = z.infer<typeof UpdateActivitySchema>;

// ============ GOALS ============

export const CreateGoalSchema = z.object({
  title: z.string().min(1, 'Goal title required').max(255),
  description: z.string().max(1000).optional(),
  targetValue: z.number().positive('Target must be positive'),
  targetUnit: z.enum(['km', 'hours', 'activities', 'elevation']),
  category: z.enum(['distance', 'duration', 'frequency', 'elevation']),
  startDate: z.string().datetime('Invalid date format'),
  endDate: z.string().datetime('Invalid date format'),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

export type CreateGoalInput = z.infer<typeof CreateGoalSchema>;

// ============ PLANNING ============

export const CreatePlanSchema = z.object({
  title: z.string().min(1, 'Plan title required').max(255),
  description: z.string().max(1000).optional(),
  activities: z.array(
    z.object({
      type: z.enum(['ride', 'run', 'swim', 'hike', 'walk']),
      distance: z.number().positive().optional(),
      duration: z.number().positive().optional(),
      intensity: z.enum(['easy', 'moderate', 'hard']).optional(),
    })
  ),
  recurrenceRule: z.string().optional(), // rrule format
  startDate: z.string().datetime('Invalid date format'),
  endDate: z.string().datetime('Invalid date format').optional(),
});

export type CreatePlanInput = z.infer<typeof CreatePlanSchema>;

// ============ STATS ============

export const StatsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year', 'all']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(['day', 'week', 'month', 'year']).optional(),
});

export type StatsQueryInput = z.infer<typeof StatsQuerySchema>;

// ============ HELPER FUNCTION ============

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }
  return result.data;
}
