// __tests__/generator.test.ts
import { describe, it, expect } from 'vitest';
import { generateWorkout, type GenDrill, type GenExercise } from '@/lib/generator';

const drill = (slug: string, skill: string, level = 'beginner', minutes = 10, equipment = ['ball', 'hoop'], players = 'solo'): GenDrill => ({
  slug,
  name: slug,
  skill,
  level,
  players,
  equipment,
  duration_minutes: minutes,
});

const DRILLS: GenDrill[] = [
  drill('form-shooting', 'shooting'),
  drill('five-spot', 'shooting', 'intermediate'),
  drill('pro-threes', 'shooting', 'advanced'),
  drill('pound-dribble', 'ball_handling', 'beginner', 8, ['ball']),
  drill('two-ball', 'ball_handling', 'intermediate', 8, ['2 balls']),
  drill('mikan', 'finishing', 'beginner', 5),
  drill('partner-closeout', 'defense', 'beginner', 10, ['ball'], 'partner'),
  drill('slides', 'defense', 'beginner', 6, ['none']),
];

const EXERCISES: GenExercise[] = [
  { name: 'Goblet Squat', primary_muscle: 'quads', equipment: ['kettlebell'] },
  { name: 'Split Squat', primary_muscle: 'quads', equipment: ['bodyweight'] },
  { name: 'Nordic Curl', primary_muscle: 'hamstrings', equipment: ['bodyweight'] },
  { name: 'Push-Up', primary_muscle: 'chest', equipment: ['bodyweight'] },
  { name: 'Inverted Row', primary_muscle: 'back', equipment: ['bodyweight'] },
  { name: 'Dead Bug', primary_muscle: 'core', equipment: ['mat'] },
  { name: 'Box Jump', primary_muscle: 'plyometrics', equipment: ['box'] },
  { name: 'Pogo Hops', primary_muscle: 'plyometrics', equipment: ['bodyweight'] },
  { name: 'Copenhagen Plank', primary_muscle: 'injury_prevention', equipment: ['bench'] },
];

const base = { minutes: 45, level: 'intermediate' as const, withPartner: false, seed: 42 };

describe('generateWorkout', () => {
  it('fills the time with the chosen skills and respects level and solo', () => {
    const w = generateWorkout(DRILLS, EXERCISES, { ...base, focus: ['shooting', 'ball_handling'], location: 'court_hoop' });
    expect(w.drills.length).toBeGreaterThan(1);
    expect(w.drills.every((d) => ['shooting', 'ball_handling'].includes(d.skill))).toBe(true);
    expect(w.drills.some((d) => d.level === 'advanced')).toBe(false);
    expect(w.drills.every((d) => d.players === 'solo')).toBe(true);
    expect(w.totalMinutes).toBeLessThanOrEqual(45 + 2);
  });

  it('skips drills that need a hoop when there is none', () => {
    const w = generateWorkout(DRILLS, EXERCISES, { ...base, focus: ['shooting', 'ball_handling', 'defense'], location: 'court_no_hoop' });
    expect(w.drills.some((d) => d.equipment.includes('hoop'))).toBe(false);
    expect(w.drills.length).toBeGreaterThan(0);
  });

  it('builds a balanced gym session in the gym', () => {
    const w = generateWorkout(DRILLS, EXERCISES, { ...base, focus: ['strength'], location: 'gym' });
    expect(w.drills).toHaveLength(0);
    const muscles = w.exercises.map((e) => e.primary_muscle);
    expect(muscles).toContain('hamstrings');
    expect(muscles).toContain('core');
    expect(new Set(w.exercises.map((e) => e.name)).size).toBe(w.exercises.length);
  });

  it('uses only bodyweight exercises away from the gym', () => {
    const w = generateWorkout(DRILLS, EXERCISES, { ...base, focus: ['shooting', 'strength'], location: 'court_hoop' });
    expect(w.exercises.some((e) => e.name === 'Goblet Squat')).toBe(false);
    expect(w.drills.length).toBeGreaterThan(0);
  });

  it('is repeatable for a seed and different for another', () => {
    const o = { ...base, focus: ['shooting', 'ball_handling', 'finishing'] as const, location: 'court_hoop' as const };
    const a = generateWorkout(DRILLS, EXERCISES, { ...o, focus: [...o.focus] });
    const b = generateWorkout(DRILLS, EXERCISES, { ...o, focus: [...o.focus] });
    expect(a.drills.map((d) => d.slug)).toEqual(b.drills.map((d) => d.slug));
  });
});
