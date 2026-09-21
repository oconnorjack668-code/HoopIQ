// src/lib/validation.ts
import { z } from 'zod';

export const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters').max(50),
});

export const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const updatePasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const onboardingSchema = z.object({
  displayName: z.string().min(2, 'Display name is required'),
  ageBracket: z.enum(['under-14', '14-17', '18-22', '23-30', '30+'], {
    errorMap: () => ({ message: 'Please select an age bracket' }),
  }),
  heightCm: z.number().min(120, 'Height must be at least 120 cm').max(240, 'Height must be under 240 cm').nullable().optional(),
  position: z.enum(['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'multi'], {
    errorMap: () => ({ message: 'Please select your primary position' }),
  }),
  dominantHand: z.enum(['left', 'right', 'ambidextrous'], {
    errorMap: () => ({ message: 'Please select your dominant hand' }),
  }),
  playingLevel: z.enum(['beginner', 'intermediate', 'advanced', 'elite', 'college_pro'], {
    errorMap: () => ({ message: 'Please select your playing level' }),
  }),
  goals: z.array(z.string()).min(1, 'Select at least one training goal'),
  strengths: z.array(z.string()).default([]),
  focusAreas: z.array(z.string()).min(1, 'Select at least one focus area'),
  isPublic: z.boolean().default(false),
});

export const sessionSchema = z.object({
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date required (YYYY-MM-DD)'),
  sessionType: z.enum(['shooting', 'ball-handling', 'footwork', 'scrimmage', 'pickup', 'skills', 'game', 'mixed']),
  durationMinutes: z.number().min(5, 'Minimum 5 minutes').max(360, 'Maximum 360 minutes'),
  intensityRpe: z.number().min(1, 'RPE must be 1-10').max(10, 'RPE must be 1-10'),
  perceivedQuality: z.number().min(1, 'Quality must be 1-5').max(5, 'Quality must be 1-5'),
  notes: z.string().max(1000).optional().nullable(),
});

export const shootingEntrySchema = z.object({
  shotZone: z.enum([
    'paint',
    'free-throw',
    'mid-left-corner',
    'mid-left-wing',
    'mid-center',
    'mid-right-wing',
    'mid-right-corner',
    'three-left-corner',
    'three-left-wing',
    'three-top',
    'three-right-wing',
    'three-right-corner',
    'deep-three',
    'all-around',
  ]),
  shotType: z.enum(['catch-and-shoot', 'off-the-dribble', 'step-back', 'free-throw', 'floater', 'pull-up', 'spot-up']).optional().nullable(),
  makes: z.number().min(0, 'Makes cannot be negative'),
  attempts: z.number().min(0, 'Attempts cannot be negative'),
}).refine((data) => data.attempts >= data.makes, {
  message: 'Attempts must be greater than or equal to makes',
  path: ['attempts'],
});

export const workoutSchema = z.object({
  workoutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date required (YYYY-MM-DD)'),
  workoutType: z.enum(['strength', 'power_plyos', 'mobility', 'recovery', 'conditioning', 'testing', 'mixed']),
  durationMinutes: z.number().min(5, 'Minimum 5 minutes').max(240, 'Maximum 240 minutes'),
  rpe: z.number().min(1, 'RPE must be 1-10').max(10, 'RPE must be 1-10'),
  notes: z.string().max(1000).optional().nullable(),
});

export const workoutSetSchema = z.object({
  exerciseName: z.string().min(1, 'Exercise name is required'),
  exerciseCategory: z.string().optional().nullable(),
  setNumber: z.number().min(1),
  reps: z.number().min(0).optional().nullable(),
  weightKg: z.number().min(0).optional().nullable(),
  durationSeconds: z.number().min(0).optional().nullable(),
  distanceMeters: z.number().min(0).optional().nullable(),
  rpe: z.number().min(1).max(10).optional().nullable(),
  isPersonalRecord: z.boolean().default(false),
  notes: z.string().max(500).optional().nullable(),
});

export const performanceTestSchema = z.object({
  testDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date required (YYYY-MM-DD)'),
  testType: z.enum([
    'standing_vertical',
    'approach_vertical',
    'sprint_three_quarter',
    'sprint_40yd',
    'lane_agility',
    'pro_agility_5_10_5',
    'standing_broad_jump',
    'custom',
  ]),
  customTestName: z.string().optional().nullable(),
  value: z.number().positive('Value must be greater than zero'),
  unit: z.enum(['inches', 'cm', 'seconds', 'meters', 'reps']),
  notes: z.string().max(500).optional().nullable(),
});

export const goalSchema = z.object({
  goalType: z.enum(['weekly_training_days', 'weekly_makes', 'shooting_pct', 'strength_days', 'iq_study_items', 'custom']),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  targetValue: z.number().positive('Target must be positive integer'),
  period: z.enum(['weekly', 'monthly', 'season']).default('weekly'),
});

export const notificationPreferencesSchema = z.object({
  reminderEnabled: z.boolean(),
  reminderDays: z.array(z.number().min(0).max(6)),
  reminderTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Valid time format required (HH:MM)'),
  quietHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable().optional(),
  quietHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable().optional(),
  emailReminders: z.boolean(),
  pushEnabled: z.boolean(),
});
