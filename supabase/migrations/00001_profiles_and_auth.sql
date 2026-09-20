-- 00001_profiles_and_auth.sql
-- Core profiles, roles, subscriptions, and notification preferences

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. PROFILES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  age_bracket text CHECK (age_bracket IN ('under-14', '14-17', '18-22', '23-30', '30+')),
  height_cm numeric CHECK (height_cm IS NULL OR (height_cm > 100 AND height_cm < 250)),
  position text CHECK (position IS NULL OR position IN ('PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'multi')),
  dominant_hand text CHECK (dominant_hand IS NULL OR dominant_hand IN ('left', 'right', 'ambidextrous')),
  playing_level text CHECK (playing_level IS NULL OR playing_level IN ('beginner', 'intermediate', 'advanced', 'elite', 'college_pro')),
  goals text[] DEFAULT '{}',
  strengths text[] DEFAULT '{}',
  focus_areas text[] DEFAULT '{}',
  onboarding_completed boolean NOT NULL DEFAULT false,
  avatar_url text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_is_public ON public.profiles(is_public);

-- =============================================================================
-- 2. USER ROLES (Server-managed only)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('player', 'owner', 'admin')),
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Helper function: check if current user is an owner
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if current user is an admin or owner
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================================
-- 3. SUBSCRIPTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_type text NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'owner')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  video_credits_remaining integer NOT NULL DEFAULT 0,
  ai_credits_remaining integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);

-- =============================================================================
-- 4. NOTIFICATION PREFERENCES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_enabled boolean NOT NULL DEFAULT false,
  reminder_days smallint[] NOT NULL DEFAULT '{1,3,5}', -- 0=Sun, 1=Mon, ..., 6=Sat
  reminder_time time NOT NULL DEFAULT '18:00',
  quiet_hours_start time DEFAULT '22:00',
  quiet_hours_end time DEFAULT '08:00',
  email_reminders boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id ON public.notification_preferences(user_id);

-- =============================================================================
-- 5. AUTO-CREATE PROFILE, SUBSCRIPTION & PREFERENCES ON SIGNUP
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_display_name text;
BEGIN
  v_display_name := COALESCE(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1),
    'Player'
  );

  INSERT INTO public.profiles (id, display_name, created_at, updated_at)
  VALUES (new.id, v_display_name, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.subscriptions (user_id, plan_type, status, ai_credits_remaining, video_credits_remaining)
  VALUES (new.id, 'free', 'active', 3, 0)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.notification_preferences (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'player')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile or public profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR is_public = true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User Roles RLS (Read-only for owner/user; writes are server-only)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Subscriptions RLS (Read-only for user; writes via server/webhooks)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription basic metadata"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Notification Preferences RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);
