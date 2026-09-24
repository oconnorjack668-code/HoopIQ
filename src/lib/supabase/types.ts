// src/lib/supabase/types.ts
// Database schema type definitions for HoopIQ

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'player' | 'owner' | 'admin';
export type PlanType = 'free' | 'pro' | 'owner';
export type AgeBracket = 'under-14' | '14-17' | '18-22' | '23-30' | '30+';
export type BasketballPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C' | 'G' | 'F' | 'multi';
export type DominantHand = 'left' | 'right' | 'ambidextrous';
export type PlayingLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite' | 'college_pro';

export type SessionType =
  | 'shooting'
  | 'ball-handling'
  | 'footwork'
  | 'scrimmage'
  | 'pickup'
  | 'skills'
  | 'game'
  | 'mixed';

export type DrillCategory =
  | 'shooting'
  | 'ball-handling'
  | 'finishing'
  | 'footwork'
  | 'defense'
  | 'conditioning'
  | 'passing'
  | 'other';

export type ShotZone =
  | 'paint'
  | 'free-throw'
  | 'mid-left-corner'
  | 'mid-left-wing'
  | 'mid-center'
  | 'mid-right-wing'
  | 'mid-right-corner'
  | 'three-left-corner'
  | 'three-left-wing'
  | 'three-top'
  | 'three-right-wing'
  | 'three-right-corner'
  | 'deep-three'
  | 'all-around';

export type ShotType =
  | 'catch-and-shoot'
  | 'off-the-dribble'
  | 'step-back'
  | 'free-throw'
  | 'floater'
  | 'pull-up'
  | 'spot-up';

export type WorkoutType =
  | 'strength'
  | 'power_plyos'
  | 'mobility'
  | 'recovery'
  | 'conditioning'
  | 'testing'
  | 'mixed';

export type ExerciseCategory =
  | 'legs'
  | 'upper_body_push'
  | 'upper_body_pull'
  | 'core'
  | 'plyometrics'
  | 'mobility'
  | 'conditioning'
  | 'recovery'
  | 'warmup';

export type PerformanceTestType =
  | 'standing_vertical'
  | 'approach_vertical'
  | 'sprint_three_quarter'
  | 'sprint_40yd'
  | 'lane_agility'
  | 'pro_agility_5_10_5'
  | 'standing_broad_jump'
  | 'custom';

export type GoalType =
  | 'weekly_training_days'
  | 'weekly_makes'
  | 'shooting_pct'
  | 'strength_days'
  | 'iq_study_items'
  | 'custom';

export type StudyCategory =
  | 'shooting_mechanics'
  | 'finishing'
  | 'ball_handling'
  | 'pick_and_roll'
  | 'defense'
  | 'spacing_and_movement'
  | 'transition'
  | 'film_study';

export type VideoCaptureAngle =
  | 'fixed_side_right'
  | 'fixed_side_left'
  | 'fixed_front'
  | 'fixed_45_angle';

export type VideoDrillType =
  | 'catch_and_shoot'
  | 'free_throw'
  | 'pull_up_jumper'
  | 'form_shooting'
  | 'custom';

export type VideoAnalysisStatus =
  | 'uploaded'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'needs_review'
  | 'failed';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          age_bracket: AgeBracket | null;
          height_cm: number | null;
          position: BasketballPosition | null;
          dominant_hand: DominantHand | null;
          playing_level: PlayingLevel | null;
          goals: string[];
          strengths: string[];
          focus_areas: string[];
          onboarding_completed: boolean;
          avatar_url: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          age_bracket?: AgeBracket | null;
          height_cm?: number | null;
          position?: BasketballPosition | null;
          dominant_hand?: DominantHand | null;
          playing_level?: PlayingLevel | null;
          goals?: string[];
          strengths?: string[];
          focus_areas?: string[];
          onboarding_completed?: boolean;
          avatar_url?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          age_bracket?: AgeBracket | null;
          height_cm?: number | null;
          position?: BasketballPosition | null;
          dominant_hand?: DominantHand | null;
          playing_level?: PlayingLevel | null;
          goals?: string[];
          strengths?: string[];
          focus_areas?: string[];
          onboarding_completed?: boolean;
          avatar_url?: string | null;
          is_public?: boolean;
          updated_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: UserRole;
          granted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: UserRole;
          granted_at?: string;
        };
        Update: {
          role?: UserRole;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan_type: PlanType;
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          video_credits_remaining: number;
          ai_credits_remaining: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan_type?: PlanType;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          video_credits_remaining?: number;
          ai_credits_remaining?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan_type?: PlanType;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          video_credits_remaining?: number;
          ai_credits_remaining?: number;
          updated_at?: string;
        };
      };
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          reminder_enabled: boolean;
          reminder_days: number[];
          reminder_time: string;
          quiet_hours_start: string | null;
          quiet_hours_end: string | null;
          email_reminders: boolean;
          push_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reminder_enabled?: boolean;
          reminder_days?: number[];
          reminder_time?: string;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          email_reminders?: boolean;
          push_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          reminder_enabled?: boolean;
          reminder_days?: number[];
          reminder_time?: string;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          email_reminders?: boolean;
          push_enabled?: boolean;
          updated_at?: string;
        };
      };
      training_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_date: string;
          session_type: SessionType;
          duration_minutes: number;
          intensity_rpe: number;
          perceived_quality: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_date: string;
          session_type: SessionType;
          duration_minutes: number;
          intensity_rpe: number;
          perceived_quality: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          session_date?: string;
          session_type?: SessionType;
          duration_minutes?: number;
          intensity_rpe?: number;
          perceived_quality?: number;
          notes?: string | null;
          updated_at?: string;
        };
      };
      session_drills: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          drill_name: string;
          drill_category: DrillCategory;
          duration_minutes: number | null;
          notes: string | null;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          drill_name: string;
          drill_category: DrillCategory;
          duration_minutes?: number | null;
          notes?: string | null;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          drill_name?: string;
          drill_category?: DrillCategory;
          duration_minutes?: number | null;
          notes?: string | null;
          display_order?: number;
        };
      };
      shooting_entries: {
        Row: {
          id: string;
          drill_id: string;
          user_id: string;
          shot_zone: ShotZone;
          shot_type: ShotType | null;
          makes: number;
          attempts: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          drill_id: string;
          user_id: string;
          shot_zone: ShotZone;
          shot_type?: ShotType | null;
          makes?: number;
          attempts: number;
          created_at?: string;
        };
        Update: {
          shot_zone?: ShotZone;
          shot_type?: ShotType | null;
          makes?: number;
          attempts?: number;
        };
      };
      exercise_library: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          category: ExerciseCategory;
          muscle_groups: string[];
          equipment: string[];
          description: string | null;
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          category: ExerciseCategory;
          muscle_groups?: string[];
          equipment?: string[];
          description?: string | null;
          is_system?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          category?: ExerciseCategory;
          muscle_groups?: string[];
          equipment?: string[];
          description?: string | null;
        };
      };
      workouts: {
        Row: {
          id: string;
          user_id: string;
          workout_date: string;
          workout_type: WorkoutType;
          duration_minutes: number;
          rpe: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workout_date: string;
          workout_type: WorkoutType;
          duration_minutes: number;
          rpe: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          workout_date?: string;
          workout_type?: WorkoutType;
          duration_minutes?: number;
          rpe?: number;
          notes?: string | null;
          updated_at?: string;
        };
      };
      workout_sets: {
        Row: {
          id: string;
          workout_id: string;
          user_id: string;
          exercise_id: string | null;
          exercise_name: string;
          exercise_category: string | null;
          set_number: number;
          reps: number | null;
          weight_kg: number | null;
          duration_seconds: number | null;
          distance_meters: number | null;
          rpe: number | null;
          is_personal_record: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_id: string;
          user_id: string;
          exercise_id?: string | null;
          exercise_name: string;
          exercise_category?: string | null;
          set_number: number;
          reps?: number | null;
          weight_kg?: number | null;
          duration_seconds?: number | null;
          distance_meters?: number | null;
          rpe?: number | null;
          is_personal_record?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          exercise_name?: string;
          exercise_category?: string | null;
          set_number?: number;
          reps?: number | null;
          weight_kg?: number | null;
          duration_seconds?: number | null;
          distance_meters?: number | null;
          rpe?: number | null;
          is_personal_record?: boolean;
          notes?: string | null;
        };
      };
      performance_tests: {
        Row: {
          id: string;
          user_id: string;
          test_date: string;
          test_type: PerformanceTestType;
          custom_test_name: string | null;
          value: number;
          unit: string;
          is_personal_record: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          test_date: string;
          test_type: PerformanceTestType;
          custom_test_name?: string | null;
          value: number;
          unit: string;
          is_personal_record?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          test_date?: string;
          test_type?: PerformanceTestType;
          custom_test_name?: string | null;
          value?: number;
          unit?: string;
          is_personal_record?: boolean;
          notes?: string | null;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          goal_type: GoalType;
          target_value: number;
          current_value: number;
          period: string;
          title: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal_type: GoalType;
          target_value: number;
          current_value?: number;
          period?: string;
          title: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          goal_type?: GoalType;
          target_value?: number;
          current_value?: number;
          period?: string;
          title?: string;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      ai_reports: {
        Row: {
          id: string;
          user_id: string;
          report_type: string;
          input_data: Json;
          input_version: string;
          provider: string;
          model: string;
          prompt_version: string;
          output_content: Json;
          confidence_score: number | null;
          status: string;
          source_session_ids: string[];
          correlation_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          report_type: string;
          input_data: Json;
          input_version?: string;
          provider: string;
          model: string;
          prompt_version?: string;
          output_content: Json;
          confidence_score?: number | null;
          status?: string;
          source_session_ids?: string[];
          correlation_id?: string;
          created_at?: string;
        };
        Update: {
          status?: string;
        };
      };
      study_topics: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string;
          category: StudyCategory;
          icon_name: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          description: string;
          category: StudyCategory;
          icon_name?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          title?: string;
          slug?: string;
          description?: string;
          category?: StudyCategory;
          icon_name?: string | null;
          display_order?: number;
          is_active?: boolean;
        };
      };
      study_items: {
        Row: {
          id: string;
          topic_id: string;
          title: string;
          description: string;
          youtube_video_id: string;
          youtube_channel: string;
          duration_minutes: number | null;
          key_takeaways: string[];
          reflection_prompt: string;
          quiz_questions: Json;
          display_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          topic_id: string;
          title: string;
          description: string;
          youtube_video_id: string;
          youtube_channel: string;
          duration_minutes?: number | null;
          key_takeaways?: string[];
          reflection_prompt: string;
          quiz_questions?: Json;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          youtube_video_id?: string;
          youtube_channel?: string;
          duration_minutes?: number | null;
          key_takeaways?: string[];
          reflection_prompt?: string;
          quiz_questions?: Json;
          display_order?: number;
          is_active?: boolean;
        };
      };
      study_progress: {
        Row: {
          id: string;
          user_id: string;
          item_id: string;
          watched: boolean;
          reflection_notes: string | null;
          quiz_score: number | null;
          quiz_answers: Json;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_id: string;
          watched?: boolean;
          reflection_notes?: string | null;
          quiz_score?: number | null;
          quiz_answers?: Json;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          watched?: boolean;
          reflection_notes?: string | null;
          quiz_score?: number | null;
          quiz_answers?: Json;
          completed_at?: string | null;
          updated_at?: string;
        };
      };
      leaderboard_seasons: {
        Row: {
          id: string;
          name: string;
          starts_at: string;
          ends_at: string;
          scoring_rules: Json;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          starts_at: string;
          ends_at: string;
          scoring_rules?: Json;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          starts_at?: string;
          ends_at?: string;
          scoring_rules?: Json;
          is_active?: boolean;
        };
      };
      challenge_completions: {
        Row: {
          id: string;
          user_id: string;
          season_id: string | null;
          challenge_id: string | null;
          challenge_type: string;
          title: string;
          points_earned: number;
          verified: boolean;
          metadata: Json;
          completed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          season_id?: string | null;
          challenge_id?: string | null;
          challenge_type: string;
          title: string;
          points_earned?: number;
          verified?: boolean;
          metadata?: Json;
          completed_at?: string;
          created_at?: string;
        };
        Update: {
          points_earned?: number;
          verified?: boolean;
        };
      };
      reward_events: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          badge_id: string;
          badge_title: string;
          badge_description: string;
          icon_name: string;
          tier: string;
          season_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: string;
          badge_id: string;
          badge_title: string;
          badge_description: string;
          icon_name?: string;
          tier?: string;
          season_id?: string | null;
          created_at?: string;
        };
        Update: {
          badge_title?: string;
          badge_description?: string;
        };
      };
      video_assets: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          storage_path: string;
          file_name: string;
          file_size_bytes: number;
          duration_seconds: number | null;
          mime_type: string;
          capture_angle: VideoCaptureAngle;
          drill_type: VideoDrillType;
          notes: string | null;
          analysis_status: VideoAnalysisStatus;
          consent_given: boolean;
          consent_timestamp: string | null;
          correlation_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          storage_path: string;
          file_name: string;
          file_size_bytes: number;
          duration_seconds?: number | null;
          mime_type: string;
          capture_angle: VideoCaptureAngle;
          drill_type: VideoDrillType;
          notes?: string | null;
          analysis_status?: VideoAnalysisStatus;
          consent_given: boolean;
          consent_timestamp?: string | null;
          correlation_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          storage_path?: string;
          duration_seconds?: number | null;
          notes?: string | null;
          analysis_status?: VideoAnalysisStatus;
          updated_at?: string;
        };
      };
      video_analysis_jobs: {
        Row: {
          id: string;
          video_id: string;
          user_id: string;
          job_status: string;
          idempotency_key: string;
          attempt_count: number;
          max_attempts: number;
          last_error: string | null;
          correlation_id: string;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          video_id: string;
          user_id: string;
          job_status?: string;
          idempotency_key: string;
          attempt_count?: number;
          max_attempts?: number;
          last_error?: string | null;
          correlation_id: string;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          job_status?: string;
          attempt_count?: number;
          last_error?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
        };
      };
      video_measurements: {
        Row: {
          id: string;
          job_id: string;
          video_id: string;
          user_id: string;
          shot_number: number;
          frame_number: number | null;
          timestamp_ms: number | null;
          shot_phase: string | null;
          measurement_type: string;
          value: number;
          unit: string;
          confidence: number;
          landmarks: Json | null;
          shot_outcome: string | null;
          player_confirmed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          video_id: string;
          user_id: string;
          shot_number: number;
          frame_number?: number | null;
          timestamp_ms?: number | null;
          shot_phase?: string | null;
          measurement_type: string;
          value: number;
          unit: string;
          confidence: number;
          landmarks?: Json | null;
          shot_outcome?: string | null;
          player_confirmed?: boolean;
          created_at?: string;
        };
        Update: {
          shot_outcome?: string | null;
          player_confirmed?: boolean;
        };
      };
      quiz_completions: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string;
          score: number;
          total_questions: number;
          percentage: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic_id: string;
          score: number;
          total_questions: number;
          percentage: number;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      challenges: {
        Row: {
          id: string;
          season_id: string | null;
          challenge_type: string;
          title: string;
          description: string;
          points: number;
          start_date: string;
          end_date: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          season_id?: string | null;
          challenge_type: string;
          title: string;
          description: string;
          points?: number;
          start_date?: string;
          end_date: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          points?: number;
          end_date?: string;
          is_active?: boolean;
        };
      };
    };
  };
}
