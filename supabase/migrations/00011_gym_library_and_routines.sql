-- 00011_gym_library_and_routines.sql
-- Gym redesign: exercises organised by muscle group (with coaching cues), saved
-- routines, and favourite exercises. The expanded system exercise list is added
-- at the end of this file. Safe to re-run.

-- =============================================================================
-- 1. EXERCISE LIBRARY: muscle group, cues, basketball flag
-- =============================================================================
ALTER TABLE public.exercise_library ADD COLUMN IF NOT EXISTS primary_muscle text;
ALTER TABLE public.exercise_library ADD COLUMN IF NOT EXISTS cues text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.exercise_library ADD COLUMN IF NOT EXISTS is_basketball_specific boolean NOT NULL DEFAULT false;

ALTER TABLE public.exercise_library DROP CONSTRAINT IF EXISTS exercise_library_primary_muscle_check;
ALTER TABLE public.exercise_library ADD CONSTRAINT exercise_library_primary_muscle_check CHECK (
  primary_muscle IS NULL OR primary_muscle IN (
    'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
    'quads', 'hamstrings', 'glutes', 'calves', 'core', 'full_body',
    'plyometrics', 'mobility', 'conditioning', 'injury_prevention'
  )
);

CREATE INDEX IF NOT EXISTS idx_exercise_library_muscle ON public.exercise_library(primary_muscle);

-- Classify the original 25 system exercises from seed.sql
UPDATE public.exercise_library AS e SET
  primary_muscle = m.primary_muscle,
  is_basketball_specific = m.is_basketball_specific,
  cues = CASE WHEN cardinality(e.cues) = 0 THEN m.cues ELSE e.cues END
FROM (VALUES
  ('Trap Bar Deadlift', 'glutes', true, ARRAY['Hips back, chest proud', 'Push the floor away', 'Lock out with glutes, not lower back']),
  ('Barbell Back Squat', 'quads', false, ARRAY['Brace before you descend', 'Knees track over toes', 'Drive up through mid-foot']),
  ('Bulgarian Split Squat', 'quads', true, ARRAY['Front shin close to vertical', 'Drop the back knee straight down', 'Drive through the front heel']),
  ('Dumbbell Romanian Deadlift', 'hamstrings', false, ARRAY['Soft knees, hinge at hips', 'Dumbbells slide down the thighs', 'Stop when hamstrings are stretched']),
  ('Tibialis Raises', 'injury_prevention', true, ARRAY['Heels planted, back to wall', 'Pull toes up hard', 'Lower slowly for 2 seconds']),
  ('Nordic Hamstring Curl', 'hamstrings', true, ARRAY['Straight line knees to shoulders', 'Lower as slowly as you can', 'Catch with hands, push back up']),
  ('Single-Leg Calf Raises', 'calves', true, ARRAY['Full stretch at the bottom', 'Rise onto the big toe', 'Pause 1 second at the top']),
  ('Depth Jumps', 'plyometrics', true, ARRAY['Step off, do not jump off', 'Minimal ground contact', 'Explode straight up']),
  ('Box Jumps', 'plyometrics', true, ARRAY['Arm swing drives the jump', 'Land soft and quiet', 'Step down, never jump down']),
  ('Lateral Bound & Stick', 'plyometrics', true, ARRAY['Push off the outside leg', 'Stick the landing 2 seconds', 'Knee stays over toes']),
  ('Pogo Hops', 'plyometrics', true, ARRAY['Stiff ankles, quick bounces', 'Stay on the balls of your feet', 'Minimal knee bend']),
  ('Medicine Ball Rotational Scoop Toss', 'core', true, ARRAY['Load the back hip', 'Rotate hips before arms', 'Throw through the wall']),
  ('Dumbbell Floor Press', 'chest', false, ARRAY['Elbows at 45 degrees', 'Pause when triceps touch floor', 'Press up and slightly back']),
  ('Push-Ups (Tempo)', 'chest', false, ARRAY['Body in one straight line', '3 seconds down', 'Push the floor away']),
  ('Overhead Dumbbell Push Press', 'shoulders', true, ARRAY['Short dip with the legs', 'Drive up with hips then arms', 'Lock out over the ears']),
  ('Single-Arm Dumbbell Row', 'back', false, ARRAY['Flat back, neck neutral', 'Pull elbow to hip pocket', 'Control the lowering']),
  ('Neutral Grip Pull-Ups', 'back', false, ARRAY['Start from a dead hang', 'Chest to the bar', 'No kipping or swinging']),
  ('Band Face Pulls', 'shoulders', false, ARRAY['Pull toward your forehead', 'Elbows high and wide', 'Squeeze shoulder blades']),
  ('Pallof Press', 'core', true, ARRAY['Brace like taking a hit', 'Press straight out, no rotation', 'Hips square to the front']),
  ('Hanging Leg Raises', 'core', false, ARRAY['No swinging', 'Curl the pelvis up', 'Lower with control']),
  ('Dead Bug (Contralateral)', 'core', false, ARRAY['Low back pressed to the floor', 'Opposite arm and leg move', 'Exhale as you extend']),
  ('90/90 Hip Switches', 'mobility', true, ARRAY['Sit tall', 'Rotate from the hips', 'Move slowly, no hands if you can']),
  ('Couch Stretch (Hip Flexor / Quad)', 'mobility', true, ARRAY['Squeeze the back glute', 'Tuck the pelvis under', 'Breathe slowly for 60 seconds']),
  ('Thoracic Spine Rotations (Open Books)', 'mobility', false, ARRAY['Knees stacked and still', 'Follow your hand with your eyes', 'Exhale at full rotation']),
  ('Ankle Dorsiflexion Knee-to-Wall', 'injury_prevention', true, ARRAY['Heel stays down', 'Knee tracks over middle toes', 'Hold end range 2 seconds'])
) AS m(name, primary_muscle, is_basketball_specific, cues)
WHERE e.is_system = true AND e.name = m.name AND e.primary_muscle IS NULL;

-- =============================================================================
-- 2. ROUTINES (saved workout templates)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.workout_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workout_routines_user ON public.workout_routines(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.routine_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id uuid NOT NULL REFERENCES public.workout_routines(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES public.exercise_library(id) ON DELETE SET NULL,
  exercise_name text NOT NULL,
  target_sets smallint NOT NULL DEFAULT 3 CHECK (target_sets BETWEEN 1 AND 20),
  display_order integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine ON public.routine_exercises(routine_id, display_order);

-- =============================================================================
-- 3. FAVOURITE EXERCISES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.exercise_favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercise_library(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, exercise_id)
);

-- Fast "previous sets" lookups when logging
CREATE INDEX IF NOT EXISTS idx_workout_sets_user_exercise_recent
  ON public.workout_sets(user_id, exercise_name, created_at DESC);

-- =============================================================================
-- 4. ROW LEVEL SECURITY + API ACCESS
-- =============================================================================
ALTER TABLE public.workout_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own routines" ON public.workout_routines;
CREATE POLICY "Users manage own routines" ON public.workout_routines
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own routine exercises" ON public.routine_exercises;
CREATE POLICY "Users manage own routine exercises" ON public.routine_exercises
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own favorite exercises" ON public.exercise_favorites;
CREATE POLICY "Users manage own favorite exercises" ON public.exercise_favorites
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- This project does not auto-grant new tables to the API roles (see 00008)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_routines, public.routine_exercises, public.exercise_favorites TO authenticated;
GRANT ALL ON public.workout_routines, public.routine_exercises, public.exercise_favorites TO service_role;
REVOKE ALL ON public.workout_routines, public.routine_exercises, public.exercise_favorites FROM anon;

-- =============================================================================
-- 5. EXPANDED SYSTEM EXERCISE LIBRARY
-- =============================================================================
INSERT INTO public.exercise_library
  (name, category, primary_muscle, muscle_groups, equipment, description, cues, is_basketball_specific, is_system)
SELECT v.name, v.category, v.primary_muscle, v.muscle_groups, v.equipment, v.description, v.cues, v.is_basketball_specific, true
FROM (VALUES
  -- CHEST
  ('Barbell Bench Press', 'upper_body_push', 'chest', ARRAY['chest','triceps','front_delts'], ARRAY['barbell','bench'], 'Classic horizontal press that builds upper-body strength for holding position through contact.', ARRAY['Shoulder blades pinned back and down','Lower bar to mid-chest under control','Drive feet into the floor as you press'], false),
  ('Dumbbell Bench Press', 'upper_body_push', 'chest', ARRAY['chest','triceps','front_delts'], ARRAY['dumbbells','bench'], 'Dumbbell press that builds balanced pushing strength and evens out left-right differences.', ARRAY['Elbows about 45 degrees from torso','Lower until a light stretch in the chest','Press up and slightly together'], false),
  ('Incline Dumbbell Press', 'upper_body_push', 'chest', ARRAY['chest','front_delts','triceps'], ARRAY['dumbbells','bench'], 'Incline press that targets the upper chest and shoulders for stronger finishes through contact.', ARRAY['Set bench to 30-45 degrees','Keep wrists stacked over elbows','Lower under control for 2 seconds'], false),
  ('Cable Chest Fly', 'upper_body_push', 'chest', ARRAY['chest','front_delts'], ARRAY['cable_machine'], 'Cable fly that keeps constant tension on the chest through a full range of motion.', ARRAY['Soft bend in the elbows throughout','Hug a big tree as hands come together','Stop before shoulders roll forward'], false),
  ('Dumbbell Chest Fly', 'upper_body_push', 'chest', ARRAY['chest','front_delts'], ARRAY['dumbbells','bench'], 'Isolation move that stretches and strengthens the chest with light dumbbells.', ARRAY['Light weight, slight elbow bend','Lower wide to a gentle chest stretch','Squeeze chest to bring weights up'], false),
  ('Decline Push-Ups', 'upper_body_push', 'chest', ARRAY['chest','front_delts','triceps','core'], ARRAY['bodyweight','bench'], 'Feet-elevated push-up that shifts load to the upper chest and shoulders with no gym needed.', ARRAY['Feet on bench, hands under shoulders','Straight line from head to heels','Lower chest just short of the floor'], false),
  ('Plyometric Push-Ups', 'upper_body_push', 'chest', ARRAY['chest','triceps','front_delts'], ARRAY['bodyweight'], 'Explosive push-up that builds upper-body power for strong passes and holding off defenders.', ARRAY['Push hard so hands leave the floor','Land softly with bent elbows','Keep hips in line with shoulders'], true),
  ('Chest Dips', 'upper_body_push', 'chest', ARRAY['chest','triceps','front_delts'], ARRAY['dip_station'], 'Bodyweight dip with a forward lean to load the chest and triceps.', ARRAY['Lean torso slightly forward','Lower until shoulders reach elbow height','Stop if you feel shoulder pinching'], false),
  ('Machine Chest Press', 'upper_body_push', 'chest', ARRAY['chest','triceps','front_delts'], ARRAY['machine'], 'Guided pressing movement that lets you push hard safely without a spotter.', ARRAY['Set handles level with mid-chest','Keep shoulder blades against the pad','Press out without slamming elbows locked'], false),
  ('Medicine Ball Chest Pass', 'upper_body_push', 'chest', ARRAY['chest','triceps','front_delts','core'], ARRAY['medicine_ball','wall'], 'Explosive two-hand chest pass into a wall that builds passing power and upper-body speed.', ARRAY['Ball at chest, thumbs behind it','Step in and snap arms out fast','Follow through with thumbs pointing down'], true),

  -- BACK
  ('Pull-Ups', 'upper_body_pull', 'back', ARRAY['lats','upper_back','biceps'], ARRAY['pull_up_bar'], 'Overhand bodyweight pull that builds lat and grip strength for rebounding and finishing through contact.', ARRAY['Start from a full dead hang','Pull elbows down toward your ribs','Chest to bar, then lower under control'], false),
  ('Chin-Ups', 'upper_body_pull', 'back', ARRAY['lats','biceps','upper_back'], ARRAY['pull_up_bar'], 'Underhand pull-up that builds back and biceps strength together.', ARRAY['Palms facing you, shoulder-width grip','Drive elbows down and back','No swinging or kipping'], false),
  ('Lat Pulldown', 'upper_body_pull', 'back', ARRAY['lats','biceps','rear_delts'], ARRAY['cable_machine'], 'Cable pulldown that builds lat strength and scales well toward your first pull-ups.', ARRAY['Slight lean back, chest up','Pull the bar to your upper chest','Control the bar on the way up'], false),
  ('Seated Cable Row', 'upper_body_pull', 'back', ARRAY['upper_back','lats','biceps'], ARRAY['cable_machine'], 'Horizontal cable row that strengthens the upper back for better posture and shoulder health.', ARRAY['Sit tall with a neutral spine','Squeeze shoulder blades at the finish','Do not rock your torso to move weight'], false),
  ('Barbell Bent-Over Row', 'upper_body_pull', 'back', ARRAY['upper_back','lats','lower_back','biceps'], ARRAY['barbell'], 'Hinged barbell row that builds a strong upper back and trunk for physical play.', ARRAY['Hinge to about 45 degrees, flat back','Pull the bar to your lower ribs','Keep torso still, no jerking'], false),
  ('Chest-Supported Dumbbell Row', 'upper_body_pull', 'back', ARRAY['upper_back','lats','rear_delts'], ARRAY['dumbbells','bench'], 'Incline-bench row that isolates the upper back without stressing the lower back.', ARRAY['Chest stays on the pad','Drive elbows back toward your hips','Pause and squeeze at the top'], false),
  ('Inverted Row', 'upper_body_pull', 'back', ARRAY['upper_back','lats','biceps','core'], ARRAY['barbell','squat_rack'], 'Bodyweight row under a fixed bar that builds pulling strength and is easy to scale.', ARRAY['Body rigid like a plank','Pull your chest to the bar','Walk feet in to make it easier'], false),
  ('Straight-Arm Cable Pulldown', 'upper_body_pull', 'back', ARRAY['lats','core'], ARRAY['cable_machine'], 'Straight-arm pulldown that trains the lats to link arm and trunk power.', ARRAY['Arms long with a soft elbow bend','Sweep hands down to your thighs','Keep ribs down, no arching'], false),
  ('Resistance Band Row', 'upper_body_pull', 'back', ARRAY['upper_back','lats','biceps'], ARRAY['resistance_band'], 'Band row you can do anywhere to build upper-back strength and posture.', ARRAY['Anchor band at chest height','Pull elbows back past your torso','Squeeze shoulder blades together'], false),
  ('Renegade Row', 'upper_body_pull', 'back', ARRAY['lats','upper_back','core'], ARRAY['dumbbells'], 'Plank-position row that trains the back while the core resists rotation.', ARRAY['Feet wide for a stable base','Keep hips square to the floor','Row one dumbbell at a time, slowly'], false),
  ('Kettlebell Gorilla Row', 'upper_body_pull', 'back', ARRAY['lats','upper_back','hamstrings'], ARRAY['kettlebell'], 'Alternating hinged row between two kettlebells that builds back strength and hinge endurance.', ARRAY['Hinge with a flat back over the bells','Row one bell while pressing into the other','Keep hips level throughout'], false),
  ('Band Pull-Aparts', 'upper_body_pull', 'back', ARRAY['upper_back','rear_delts'], ARRAY['resistance_band'], 'Light band drill for the upper back and rear shoulders that supports healthy shooting shoulders.', ARRAY['Arms straight at shoulder height','Spread arms to pull band to chest','Keep shoulders down away from ears'], false),

  -- SHOULDERS
  ('Standing Barbell Overhead Press', 'upper_body_push', 'shoulders', ARRAY['shoulders','triceps','core'], ARRAY['barbell'], 'Standing overhead press that builds shoulder strength and full-body stability.', ARRAY['Squeeze glutes and brace your core','Press the bar straight up overhead','Move head back, then through at the top'], false),
  ('Seated Dumbbell Shoulder Press', 'upper_body_push', 'shoulders', ARRAY['shoulders','triceps'], ARRAY['dumbbells','bench'], 'Seated press that isolates the shoulders with a supported back.', ARRAY['Back flat against the bench','Start with dumbbells at ear height','Press up without clanking at the top'], false),
  ('Dumbbell Lateral Raise', 'upper_body_push', 'shoulders', ARRAY['side_delts'], ARRAY['dumbbells'], 'Isolation raise that builds the side delts for stronger, more resilient shoulders.', ARRAY['Slight bend in the elbows','Raise to shoulder height, no higher','Lead with elbows, not hands'], false),
  ('Cable Lateral Raise', 'upper_body_push', 'shoulders', ARRAY['side_delts'], ARRAY['cable_machine'], 'Single-arm cable raise that keeps tension on the side delt through the full range.', ARRAY['Stand side-on to a low pulley','Raise arm out to shoulder height','Lower slowly for 2-3 seconds'], false),
  ('Landmine Press', 'upper_body_push', 'shoulders', ARRAY['shoulders','chest','triceps','core'], ARRAY['barbell','landmine'], 'Angled single-arm press that is shoulder-friendly and trains pushing from the ground up.', ARRAY['Staggered stance, brace your core','Press up and slightly forward','Reach at the top, keep ribs down'], false),
  ('Arnold Press', 'upper_body_push', 'shoulders', ARRAY['shoulders','triceps'], ARRAY['dumbbells'], 'Rotating dumbbell press that works all three heads of the shoulder.', ARRAY['Start palms facing you at chin height','Rotate palms out as you press up','Reverse the rotation on the way down'], false),
  ('Pike Push-Ups', 'upper_body_push', 'shoulders', ARRAY['shoulders','triceps','upper_chest'], ARRAY['bodyweight'], 'Bodyweight overhead pressing pattern that builds shoulder strength without equipment.', ARRAY['Hips high in an upside-down V','Lower head toward floor ahead of hands','Press back up through your palms'], false),
  ('Reverse Dumbbell Fly', 'upper_body_push', 'shoulders', ARRAY['rear_delts','upper_back'], ARRAY['dumbbells'], 'Bent-over fly that strengthens the rear delts to balance all the pushing and shooting.', ARRAY['Hinge forward with a flat back','Lift arms out wide with soft elbows','Squeeze shoulder blades at the top'], false),
  ('Half-Kneeling Single-Arm Kettlebell Press', 'upper_body_push', 'shoulders', ARRAY['shoulders','triceps','core'], ARRAY['kettlebell'], 'Half-kneeling press that builds shoulder strength while challenging hip and core stability.', ARRAY['Down knee under hip, squeeze that glute','Press the bell straight overhead','Do not lean away from the bell'], false),
  ('Prone Y-T-W Raises', 'upper_body_push', 'shoulders', ARRAY['rear_delts','upper_back','rotator_cuff'], ARRAY['bodyweight','mat'], 'Face-down arm raises that strengthen the small shoulder stabilizers used in shooting.', ARRAY['Lie face down, thumbs pointing up','Lift arms into Y, T, then W shapes','Neck long, lift from shoulder blades'], false),

  -- BICEPS
  ('Barbell Curl', 'upper_body_pull', 'biceps', ARRAY['biceps','forearms'], ARRAY['barbell'], 'Standard barbell curl for building biceps strength.', ARRAY['Elbows pinned to your sides','Curl without swinging your torso','Lower all the way under control'], false),
  ('Dumbbell Hammer Curl', 'upper_body_pull', 'biceps', ARRAY['biceps','brachialis','forearms'], ARRAY['dumbbells'], 'Neutral-grip curl that builds the biceps and forearms for a stronger grip.', ARRAY['Palms face each other throughout','Keep elbows still at your sides','Squeeze at the top, lower slowly'], false),
  ('Incline Dumbbell Curl', 'upper_body_pull', 'biceps', ARRAY['biceps'], ARRAY['dumbbells','bench'], 'Curl from an incline bench that trains the biceps in a lengthened position.', ARRAY['Set bench to about 45 degrees','Let arms hang straight down to start','Curl without moving your upper arm'], false),
  ('Cable Curl', 'upper_body_pull', 'biceps', ARRAY['biceps','forearms'], ARRAY['cable_machine'], 'Cable curl that keeps constant tension on the biceps through the full range.', ARRAY['Stand tall facing a low pulley','Elbows slightly in front of torso','Control the handle back down'], false),
  ('Resistance Band Curl', 'upper_body_pull', 'biceps', ARRAY['biceps','forearms'], ARRAY['resistance_band'], 'Portable biceps curl you can do anywhere with a band.', ARRAY['Stand on band, feet hip-width','Curl hands up to your shoulders','Resist the band on the way down'], false),
  ('Concentration Curl', 'upper_body_pull', 'biceps', ARRAY['biceps'], ARRAY['dumbbells','bench'], 'Seated single-arm curl that isolates the biceps with strict form.', ARRAY['Brace elbow against your inner thigh','Curl the dumbbell toward your shoulder','Lower slowly to a full stretch'], false),
  ('EZ-Bar Preacher Curl', 'upper_body_pull', 'biceps', ARRAY['biceps','brachialis'], ARRAY['ez_bar','preacher_bench'], 'Preacher bench curl that removes momentum and isolates the biceps.', ARRAY['Armpits snug against the pad','Stop just short of locking elbows','Curl up without lifting off the pad'], false),

  -- TRICEPS
  ('Close-Grip Bench Press', 'upper_body_push', 'triceps', ARRAY['triceps','chest','front_delts'], ARRAY['barbell','bench'], 'Narrow-grip bench press that builds triceps strength for powerful lockout and passing.', ARRAY['Hands about shoulder-width apart','Keep elbows tucked close to your sides','Touch bar to lower chest, then press'], false),
  ('Cable Triceps Pushdown', 'upper_body_push', 'triceps', ARRAY['triceps'], ARRAY['cable_machine'], 'Cable pushdown that isolates the triceps with steady tension.', ARRAY['Elbows pinned at your sides','Push down until arms are straight','Let hands rise only to chest height'], false),
  ('Overhead Dumbbell Triceps Extension', 'upper_body_push', 'triceps', ARRAY['triceps'], ARRAY['dumbbells'], 'Overhead extension that trains the long head of the triceps.', ARRAY['Hold one dumbbell overhead, both hands','Lower behind head, elbows pointing up','Keep ribs down, do not arch'], false),
  ('EZ-Bar Skull Crushers', 'upper_body_push', 'triceps', ARRAY['triceps'], ARRAY['ez_bar','bench'], 'Lying triceps extension that builds strength through a full elbow range.', ARRAY['Upper arms angled slightly back','Lower bar toward your forehead slowly','Extend elbows without flaring them'], false),
  ('Bench Dips', 'upper_body_push', 'triceps', ARRAY['triceps','chest','front_delts'], ARRAY['bench','bodyweight'], 'Bodyweight dip off a bench that builds triceps strength with minimal equipment.', ARRAY['Hands on bench edge, fingers forward','Lower until elbows reach about 90 degrees','Keep hips close to the bench'], false),
  ('Diamond Push-Ups', 'upper_body_push', 'triceps', ARRAY['triceps','chest'], ARRAY['bodyweight'], 'Narrow-hand push-up that shifts the work onto the triceps.', ARRAY['Hands together under your chest','Elbows track back along your sides','Straight line from head to heels'], false),
  ('Overhead Cable Triceps Extension', 'upper_body_push', 'triceps', ARRAY['triceps'], ARRAY['cable_machine'], 'Cable extension facing away from the stack that loads the triceps in a stretched position.', ARRAY['Staggered stance, slight forward lean','Elbows stay close to your head','Extend fully, then return slowly'], false),

  -- FOREARMS
  ('Farmer''s Carry', 'upper_body_pull', 'forearms', ARRAY['forearms','traps','core'], ARRAY['dumbbells'], 'Heavy loaded walk that builds grip strength and a stable trunk.', ARRAY['Stand tall, shoulders back and down','Crush the handles the whole time','Take short, controlled steps'], false),
  ('Dumbbell Wrist Curls', 'upper_body_pull', 'forearms', ARRAY['forearm_flexors'], ARRAY['dumbbells','bench'], 'Palms-up wrist curl that strengthens the forearm flexors for grip and ball control.', ARRAY['Forearms on thighs, wrists off the edge','Curl wrists up with a slow tempo','Use a light weight and full range'], false),
  ('Dumbbell Reverse Wrist Curls', 'upper_body_pull', 'forearms', ARRAY['forearm_extensors'], ARRAY['dumbbells','bench'], 'Palms-down wrist curl that strengthens the forearm extensors and balances grip work.', ARRAY['Forearms on thighs, palms facing down','Lift knuckles toward the ceiling','Use a light weight and slow tempo'], false),
  ('Plate Pinch Hold', 'upper_body_pull', 'forearms', ARRAY['fingers','forearms'], ARRAY['weight_plate'], 'Fingertip pinch hold on smooth plates that builds hand strength for ball control.', ARRAY['Pinch two plates, smooth sides out','Keep fingers and thumb straight','Stand tall and hold for time'], true),
  ('Dead Hang', 'upper_body_pull', 'forearms', ARRAY['forearms','lats','shoulders'], ARRAY['pull_up_bar'], 'Hang from a bar that builds grip endurance and decompresses the shoulders.', ARRAY['Full grip with thumbs wrapped','Keep shoulders slightly engaged','Breathe steadily and hold for time'], false),
  ('Fingertip Push-Ups', 'upper_body_pull', 'forearms', ARRAY['fingers','forearms','chest','triceps'], ARRAY['bodyweight'], 'Push-up on the fingertips that builds finger and hand strength for handling and passing.', ARRAY['Spread fingers wide, palms off floor','Start from your knees if needed','Stop if fingers or wrists hurt'], true),

  -- QUADS
  ('Barbell Front Squat', 'legs', 'quads', ARRAY['quads','glutes','core'], ARRAY['barbell','squat_rack'], 'Front-loaded squat that builds quad strength with an upright torso.', ARRAY['Elbows high, bar resting on shoulders','Sit straight down between your hips','Drive up keeping your chest tall'], false),
  ('Goblet Squat', 'legs', 'quads', ARRAY['quads','glutes','core'], ARRAY['kettlebell'], 'Beginner-friendly squat holding a weight at the chest to groove depth and posture.', ARRAY['Hold the weight tight to your chest','Knees track over your toes','Squat deep while keeping a flat back'], false),
  ('Dumbbell Walking Lunges', 'legs', 'quads', ARRAY['quads','glutes','hamstrings'], ARRAY['dumbbells'], 'Walking lunge that builds single-leg strength and balance for running and jumping.', ARRAY['Take a long, controlled step','Back knee lowers softly toward floor','Push through front heel to step through'], true),
  ('Leg Press', 'legs', 'quads', ARRAY['quads','glutes'], ARRAY['machine'], 'Machine press that builds leg strength with little load on the spine.', ARRAY['Feet shoulder-width on the platform','Lower until knees reach about 90 degrees','Keep lower back pressed into the pad'], false),
  ('Leg Extension', 'legs', 'quads', ARRAY['quads'], ARRAY['machine'], 'Machine isolation for the quads that also supports knee tendon health.', ARRAY['Line knee up with the machine pivot','Extend fully and pause at the top','Lower slowly for 3 seconds'], false),
  ('Dumbbell Step-Ups', 'legs', 'quads', ARRAY['quads','glutes'], ARRAY['dumbbells','box'], 'Single-leg step onto a box that builds drive strength for one-foot takeoffs.', ARRAY['Whole foot on the box','Drive through the top leg, not back foot','Step down slowly with control'], true),
  ('Reverse Lunge', 'legs', 'quads', ARRAY['quads','glutes','hamstrings'], ARRAY['bodyweight'], 'Backward-stepping lunge that builds single-leg strength with less knee stress.', ARRAY['Step back long and lower straight down','Front knee stays over mid-foot','Push through front foot to return'], true),
  ('Lateral Lunge', 'legs', 'quads', ARRAY['quads','glutes','adductors'], ARRAY['bodyweight'], 'Side lunge that builds strength and mobility for lateral cuts and defensive slides.', ARRAY['Step wide and sit back into one hip','Other leg straight, both feet flat','Push off hard to return to center'], true),
  ('Skater Squat', 'legs', 'quads', ARRAY['quads','glutes','core'], ARRAY['bodyweight'], 'Single-leg squat with the back knee lowering toward the floor for unilateral leg strength.', ARRAY['Stand on one leg, other knee bent behind','Lower until back knee nearly touches','Front knee tracks over your toes'], true),
  ('Wall Sit', 'legs', 'quads', ARRAY['quads','glutes'], ARRAY['wall','bodyweight'], 'Isometric squat hold against a wall that builds quad endurance and knee tolerance.', ARRAY['Back flat on the wall','Thighs parallel, knees over ankles','Breathe steadily and hold for time'], false),

  -- HAMSTRINGS
  ('Barbell Romanian Deadlift', 'legs', 'hamstrings', ARRAY['hamstrings','glutes','lower_back'], ARRAY['barbell'], 'Hip hinge that builds hamstring strength for sprinting, jumping and injury resilience.', ARRAY['Soft knees, push hips straight back','Keep the bar close to your legs','Stop when hamstrings are fully stretched'], false),
  ('Single-Leg Romanian Deadlift', 'legs', 'hamstrings', ARRAY['hamstrings','glutes','core'], ARRAY['dumbbells'], 'One-leg hinge that builds hamstring strength and balance for single-leg takeoffs and landings.', ARRAY['Hips stay square to the floor','Reach the back leg long as you hinge','Slight bend in the standing knee'], true),
  ('Lying Leg Curl', 'legs', 'hamstrings', ARRAY['hamstrings'], ARRAY['machine'], 'Machine curl that isolates the hamstrings at the knee.', ARRAY['Hips pressed into the pad','Curl heels toward your glutes','Lower slowly for 3 seconds'], false),
  ('Stability Ball Hamstring Curl', 'legs', 'hamstrings', ARRAY['hamstrings','glutes','core'], ARRAY['stability_ball','mat'], 'Bridge-and-curl on a ball that builds hamstring strength with core control.', ARRAY['Hips lifted in a bridge the whole time','Pull heels in to roll the ball toward you','Roll out slowly without dropping hips'], false),
  ('Slider Hamstring Curl', 'legs', 'hamstrings', ARRAY['hamstrings','glutes'], ARRAY['slider','mat'], 'Sliding leg curl that builds eccentric hamstring strength with minimal equipment.', ARRAY['Heels on sliders, hips lifted','Slide heels out slowly','Pull heels back while keeping hips up'], false),
  ('Barbell Good Morning', 'legs', 'hamstrings', ARRAY['hamstrings','glutes','lower_back'], ARRAY['barbell','squat_rack'], 'Bar-on-back hip hinge that strengthens the whole posterior chain.', ARRAY['Start with a light load','Push hips back with a flat back','Stop when torso nears parallel'], false),
  ('45-Degree Back Extension', 'legs', 'hamstrings', ARRAY['hamstrings','glutes','lower_back'], ARRAY['back_extension_bench'], 'Hinging back extension that builds posterior-chain strength and endurance.', ARRAY['Pad just below your hip crease','Hinge at the hips, not the lower back','Squeeze glutes to rise to a straight line'], false),
  ('Single-Leg Hamstring Bridge', 'legs', 'hamstrings', ARRAY['hamstrings','glutes'], ARRAY['bodyweight','bench'], 'One-leg bridge with the heel on a bench that strengthens the hamstrings without gym machines.', ARRAY['Heel on bench, knee slightly bent','Drive heel down to lift your hips','Keep pelvis level, do not rotate'], true),

  -- GLUTES
  ('Barbell Hip Thrust', 'legs', 'glutes', ARRAY['glutes','hamstrings'], ARRAY['barbell','bench'], 'Loaded hip thrust that builds glute strength for acceleration and jumping.', ARRAY['Upper back on bench, bar over hips','Drive through heels to full hip lockout','Tuck chin and keep ribs down at the top'], false),
  ('Glute Bridge', 'legs', 'glutes', ARRAY['glutes','hamstrings'], ARRAY['bodyweight','mat'], 'Floor bridge that activates and strengthens the glutes without equipment.', ARRAY['Feet flat, knees bent about 90 degrees','Squeeze glutes to lift your hips','Pause at the top without arching'], false),
  ('Single-Leg Hip Thrust', 'legs', 'glutes', ARRAY['glutes','hamstrings','core'], ARRAY['bench','bodyweight'], 'One-leg hip thrust that builds single-leg glute power for takeoffs.', ARRAY['Upper back on bench, one foot planted','Drive through heel to lock out hips','Keep pelvis level throughout'], true),
  ('Cable Pull-Through', 'legs', 'glutes', ARRAY['glutes','hamstrings'], ARRAY['cable_machine'], 'Cable hinge that teaches a strong hip snap with low spinal load.', ARRAY['Face away from low pulley, rope between legs','Push hips back with a flat back','Snap hips forward and squeeze glutes'], false),
  ('Sumo Deadlift', 'legs', 'glutes', ARRAY['glutes','adductors','hamstrings','quads'], ARRAY['barbell'], 'Wide-stance deadlift that builds glute and inner-thigh strength.', ARRAY['Wide stance, toes turned out','Push knees out over your toes','Keep chest up and the bar close'], false),
  ('Curtsy Lunge', 'legs', 'glutes', ARRAY['glutes','quads','adductors'], ARRAY['bodyweight'], 'Crossing lunge that targets the side glutes that keep knees stable when cutting.', ARRAY['Step back and across behind front leg','Keep hips facing forward','Drive through front heel to stand'], true),
  ('Cable Glute Kickback', 'legs', 'glutes', ARRAY['glutes'], ARRAY['cable_machine'], 'Single-leg cable kickback that isolates the glutes.', ARRAY['Hinge slightly and hold the frame','Kick the leg back from the hip','Do not arch your lower back'], false),
  ('Banded Glute Bridge', 'legs', 'glutes', ARRAY['glutes','hamstrings'], ARRAY['resistance_band','mat'], 'Glute bridge with a band above the knees to train hip extension and knee control.', ARRAY['Band just above the knees','Press knees out against the band','Squeeze glutes hard at the top'], false),

  -- CALVES
  ('Standing Machine Calf Raise', 'legs', 'calves', ARRAY['calves'], ARRAY['machine'], 'Loaded standing calf raise that builds calf strength for jumping and sprinting.', ARRAY['Balls of feet on the edge','Lower heels to a full stretch','Rise as high as you can and pause'], false),
  ('Seated Calf Raise', 'legs', 'calves', ARRAY['soleus','calves'], ARRAY['machine'], 'Bent-knee calf raise that targets the soleus for landing and Achilles support.', ARRAY['Pad snug on your lower thighs','Full stretch at the bottom','Pause at the top of each rep'], true),
  ('Leg Press Calf Press', 'legs', 'calves', ARRAY['calves'], ARRAY['machine'], 'Calf press on the leg press for heavy calf loading with a supported back.', ARRAY['Balls of feet on platform bottom edge','Knees straight but not hard-locked','Keep the safety handles engaged'], false),
  ('Farmer''s Walk on Toes', 'legs', 'calves', ARRAY['calves','forearms','core'], ARRAY['dumbbells'], 'Loaded walk up on the toes that builds calf and ankle stiffness plus grip.', ARRAY['Rise high onto the balls of your feet','Take short, quick steps','Stay tall and do not let heels drop'], true),
  ('Eccentric Heel Drops', 'legs', 'calves', ARRAY['calves','achilles'], ARRAY['box'], 'Slow heel lowering off a step that strengthens the Achilles tendon and calves.', ARRAY['Rise up on both feet','Lower on one foot for 3-4 seconds','Stop at a comfortable stretch'], true),
  ('Bent-Knee Soleus Raise', 'legs', 'calves', ARRAY['soleus'], ARRAY['bodyweight','wall'], 'Bent-knee calf raise that targets the soleus, a key muscle for absorbing landing forces.', ARRAY['Knees bent about 30-45 degrees','Keep the knee bend fixed as you rise','Lower heels slowly each rep'], true),

  -- CORE
  ('Front Plank', 'core', 'core', ARRAY['abs','core'], ARRAY['mat'], 'Forearm plank that builds trunk stiffness to transfer force and absorb contact.', ARRAY['Elbows under shoulders','Squeeze glutes and brace abs','Straight line from head to heels'], false),
  ('Side Plank', 'core', 'core', ARRAY['obliques','glutes'], ARRAY['mat'], 'Side plank that strengthens the obliques and hips for lateral stability.', ARRAY['Elbow under shoulder','Stack hips and lift them high','Keep body in one straight line'], false),
  ('Ab Wheel Rollout', 'core', 'core', ARRAY['abs','lats'], ARRAY['ab_wheel','mat'], 'Anti-extension rollout that builds a strong trunk to protect the lower back.', ARRAY['Start on knees with ribs pulled down','Roll out only as far as you control','Do not let your hips sag'], false),
  ('Cable Woodchopper', 'core', 'core', ARRAY['obliques','core','shoulders'], ARRAY['cable_machine'], 'High-to-low rotational chop that builds power for passing and twisting through contact.', ARRAY['Rotate through hips and upper back','Keep arms long throughout','Control the return to start'], true),
  ('Russian Twist', 'core', 'core', ARRAY['obliques','abs'], ARRAY['medicine_ball','mat'], 'Seated twist with a ball that trains rotational core strength.', ARRAY['Lean back with a tall chest','Rotate shoulders, not just arms','Keep feet down to start'], false),
  ('Bird Dog', 'core', 'core', ARRAY['core','glutes','lower_back'], ARRAY['mat'], 'Opposite arm and leg reach that builds spinal stability and hip control.', ARRAY['Hands under shoulders, knees under hips','Reach opposite arm and leg long','Keep hips level, no rocking'], false),
  ('Hollow Body Hold', 'core', 'core', ARRAY['abs','hip_flexors'], ARRAY['mat'], 'Isometric hold that teaches the full-body tension used in jumping and contact.', ARRAY['Press lower back into the floor','Lift shoulders and legs slightly','Bend knees to make it easier'], false),
  ('Suitcase Carry', 'core', 'core', ARRAY['obliques','forearms','glutes'], ARRAY['kettlebell'], 'One-sided loaded carry that trains the core to resist side bending.', ARRAY['Hold the weight in one hand at your side','Stay tall, do not lean','Walk with slow, even steps'], false),
  ('Bicycle Crunch', 'core', 'core', ARRAY['abs','obliques'], ARRAY['mat'], 'Alternating crunch with rotation that trains the abs and obliques.', ARRAY['Hands light behind head, no pulling','Rotate shoulder toward opposite knee','Extend the other leg fully'], false),
  ('Plank Shoulder Taps', 'core', 'core', ARRAY['core','shoulders'], ARRAY['bodyweight'], 'High-plank shoulder taps that train anti-rotation and shoulder stability.', ARRAY['Feet wide for a stable base','Tap the opposite shoulder slowly','Keep hips from swaying'], false),
  ('Stir the Pot', 'core', 'core', ARRAY['abs','obliques','shoulders'], ARRAY['stability_ball'], 'Plank on a stability ball with small circles for tough anti-extension work.', ARRAY['Forearms on ball, body in a plank','Draw small circles with your elbows','Keep hips still and glutes tight'], false),
  ('Half-Kneeling Cable Lift', 'core', 'core', ARRAY['obliques','core','glutes'], ARRAY['cable_machine'], 'Low-to-high diagonal lift that trains core stability over a split stance.', ARRAY['Inside knee down, outside foot forward','Pull the rope up and across your body','Keep hips square and still'], false),
  ('Reverse Crunch', 'core', 'core', ARRAY['abs'], ARRAY['mat'], 'Curl the hips toward the ribs to train the lower abs.', ARRAY['Hands by your sides for support','Curl hips off the floor using your abs','Lower slowly without swinging'], false),
  ('Landmine Rotation', 'core', 'core', ARRAY['obliques','core','shoulders'], ARRAY['barbell','landmine'], 'Standing arc rotation with a barbell that builds rotational power from the ground up.', ARRAY['Arms long, bar end at chest height','Pivot the back foot as you rotate','Move the bar in a rainbow arc'], true),

  -- FULL_BODY
  ('Kettlebell Swing', 'legs', 'full_body', ARRAY['glutes','hamstrings','core','shoulders'], ARRAY['kettlebell'], 'Explosive hip hinge that builds hip power and conditioning.', ARRAY['Hike the bell back between your legs','Snap hips forward to float the bell','Arms stay loose, hips do the work'], false),
  ('Barbell Hang Power Clean', 'legs', 'full_body', ARRAY['glutes','hamstrings','quads','traps'], ARRAY['barbell'], 'Olympic lift variation that builds explosive triple extension for jumping.', ARRAY['Start at mid-thigh with a flat back','Jump and shrug the bar up','Catch in a quarter squat, elbows high'], true),
  ('Turkish Get-Up', 'legs', 'full_body', ARRAY['shoulders','core','glutes'], ARRAY['kettlebell'], 'Slow floor-to-stand movement that builds shoulder stability and full-body control.', ARRAY['Eyes on the bell the whole time','Keep the weighted arm locked straight','Move slowly, one step at a time'], false),
  ('Medicine Ball Overhead Slam', 'conditioning', 'full_body', ARRAY['lats','core','shoulders'], ARRAY['medicine_ball'], 'Overhead ball slam that builds full-body power and conditioning.', ARRAY['Reach tall with the ball overhead','Slam down hard using your whole body','Hinge at the hips to pick it up'], false),
  ('Burpees', 'conditioning', 'full_body', ARRAY['chest','quads','core'], ARRAY['bodyweight'], 'Bodyweight squat, push-up and jump combo for full-body conditioning anywhere.', ARRAY['Hands down, jump feet back to plank','Chest to floor, then snap feet in','Finish with a jump and soft landing'], false),
  ('Sled Push', 'conditioning', 'full_body', ARRAY['quads','glutes','calves','core'], ARRAY['sled'], 'Heavy sled push that builds acceleration strength and conditioning with low injury risk.', ARRAY['Arms locked, body at a forward lean','Drive with short, powerful steps','Push through the balls of your feet'], true),

  -- PLYOMETRICS
  ('Broad Jump', 'plyometrics', 'plyometrics', ARRAY['glutes','quads','hamstrings'], ARRAY['bodyweight'], 'Standing horizontal jump that builds explosive hip extension for first-step speed.', ARRAY['Swing arms back, then drive forward','Jump out and slightly up','Stick the landing with soft knees'], true),
  ('Tuck Jumps', 'plyometrics', 'plyometrics', ARRAY['quads','glutes','calves','core'], ARRAY['bodyweight'], 'Repeated vertical jumps pulling knees high to build power and quick ground contacts.', ARRAY['Jump straight up and pull knees high','Land softly on the balls of your feet','Stay tall and rebound quickly'], true),
  ('Single-Leg Box Jump', 'plyometrics', 'plyometrics', ARRAY['quads','glutes','calves'], ARRAY['box'], 'One-foot takeoff onto a box that builds single-leg power for layups.', ARRAY['Start with a low box','Drive knee and arms up hard','Land softly on both feet, step down'], true),
  ('Skater Hops', 'plyometrics', 'plyometrics', ARRAY['glutes','quads','adductors'], ARRAY['bodyweight'], 'Continuous side-to-side single-leg hops that build lateral power and control.', ARRAY['Push off the outside foot','Land softly on the opposite foot','Keep chest up and hips low'], true),
  ('Approach Vertical Jump', 'plyometrics', 'plyometrics', ARRAY['quads','glutes','calves'], ARRAY['court'], 'Running approach into a max vertical jump to train game-like takeoff mechanics.', ARRAY['Use 2-3 fast approach steps','Make the second-to-last step long and low','Swing arms up hard on takeoff'], true),
  ('Snap Downs', 'plyometrics', 'plyometrics', ARRAY['quads','glutes','hamstrings'], ARRAY['bodyweight'], 'Quick drop into an athletic stance that teaches safe deceleration and landing mechanics.', ARRAY['Rise on toes with arms overhead','Snap arms down, drop to a half squat','Land quiet with knees over toes'], true),
  ('Single-Leg Lateral Line Hops', 'plyometrics', 'plyometrics', ARRAY['calves','ankles','glutes'], ARRAY['court'], 'Quick side-to-side hops over a line on one foot to build ankle stiffness and reactivity.', ARRAY['Stay on the ball of your foot','Hop quickly with minimal ground time','Keep the knee soft and over the toes'], true),
  ('Split Squat Jumps', 'plyometrics', 'plyometrics', ARRAY['quads','glutes','hamstrings'], ARRAY['bodyweight'], 'Explosive lunge jumps switching legs midair to build single-leg power.', ARRAY['Start in a lunge, jump straight up','Switch legs in the air','Land softly back in a lunge'], true),
  ('Hurdle Hops', 'plyometrics', 'plyometrics', ARRAY['calves','quads','glutes'], ARRAY['mini_hurdle'], 'Consecutive two-foot hops over low hurdles to train fast, reactive jumping.', ARRAY['Start with low hurdles','Minimize time on the ground','Pull knees up, land on balls of feet'], true),
  ('Medicine Ball Overhead Backward Toss', 'plyometrics', 'plyometrics', ARRAY['glutes','hamstrings','back','shoulders'], ARRAY['medicine_ball'], 'Backward overhead throw that trains full triple extension for vertical power.', ARRAY['Hinge with the ball between your legs','Explode hips through and throw back','Clear the area behind you first'], true),
  ('Rim Touches', 'plyometrics', 'plyometrics', ARRAY['calves','quads','glutes'], ARRAY['court'], 'Repeated max jumps reaching for the rim to build jumping endurance and reactivity.', ARRAY['Jump off two feet under the rim','Reach high with one hand each rep','Land soft and rebound quickly'], true),
  ('Alternate-Leg Bounds', 'plyometrics', 'plyometrics', ARRAY['glutes','hamstrings','calves'], ARRAY['court'], 'Exaggerated running strides that build horizontal power and stride length.', ARRAY['Drive the front knee up and forward','Push off hard from the back leg','Land mid-foot under your hips'], true),

  -- MOBILITY
  ('World''s Greatest Stretch', 'mobility', 'mobility', ARRAY['hips','hamstrings','thoracic_spine'], ARRAY['bodyweight'], 'Lunge with a rotation that opens the hips, hamstrings and upper back in one move.', ARRAY['Long lunge, back knee off the floor','Elbow to instep, then rotate arm up','Follow your hand with your eyes'], true),
  ('Cat-Cow', 'mobility', 'mobility', ARRAY['spine','core'], ARRAY['mat'], 'Flowing spinal flexion and extension to loosen up the back before training.', ARRAY['Hands under shoulders, knees under hips','Round up, then arch slowly','Move with your breath'], false),
  ('Deep Squat Hold', 'mobility', 'mobility', ARRAY['hips','ankles','adductors'], ARRAY['bodyweight'], 'Sitting in a deep squat to improve hip and ankle mobility for a lower stance.', ARRAY['Feet shoulder-width, heels down','Use elbows to gently press knees out','Hold onto a post if needed'], false),
  ('Pigeon Stretch', 'mobility', 'mobility', ARRAY['glutes','hip_rotators'], ARRAY['mat'], 'Deep hip stretch for the glutes and rotators that tighten up from running and jumping.', ARRAY['Front shin angled across your body','Keep hips square to the floor','Fold forward gently, breathe deeply'], false),
  ('Wall Slides', 'mobility', 'mobility', ARRAY['shoulders','upper_back'], ARRAY['wall'], 'Arm slides on a wall that improve overhead shoulder mobility for shooting.', ARRAY['Back and forearms against the wall','Slide arms up without arching back','Keep ribs down throughout'], false),
  ('Thread the Needle', 'mobility', 'mobility', ARRAY['thoracic_spine','shoulders'], ARRAY['mat'], 'Quadruped reach-under stretch that improves upper-back rotation.', ARRAY['Start on hands and knees','Slide one arm under your body','Let shoulder and head rest down'], false),
  ('Frog Stretch', 'mobility', 'mobility', ARRAY['adductors','hips'], ARRAY['mat'], 'Wide-knee groin stretch that opens the adductors for lateral movement.', ARRAY['Knees wide, ankles in line with knees','Rock hips back slowly','Keep lower back neutral'], true),
  ('Banded Shoulder Pass-Throughs', 'mobility', 'mobility', ARRAY['shoulders','chest'], ARRAY['resistance_band'], 'Band pass-throughs that open the chest and shoulders through a full arc.', ARRAY['Use a wide grip on a light band','Keep arms straight as you pass over','Narrow grip only as mobility allows'], false),

  -- CONDITIONING
  ('17s (Sideline-to-Sideline Sprints)', 'conditioning', 'conditioning', ARRAY['quads','hamstrings','calves'], ARRAY['court'], 'Seventeen sideline-to-sideline sprints for time to build game-specific conditioning.', ARRAY['Touch each sideline with your foot','Stay low through each change of direction','Aim for about 60 seconds, then rest'], true),
  ('Suicides (Line Drills)', 'conditioning', 'conditioning', ARRAY['quads','hamstrings','calves'], ARRAY['court'], 'Sprints from the baseline to each court line and back to build speed endurance and direction change.', ARRAY['Touch each line with your hand','Decelerate low before each turn','Sprint all the way through the finish'], true),
  ('Defensive Slide Intervals', 'conditioning', 'conditioning', ARRAY['glutes','quads','adductors'], ARRAY['court'], 'Timed lane-to-lane defensive slides that build lateral conditioning and stance endurance.', ARRAY['Stay low, chest up, hands active','Push off the trail foot, never cross feet','Keep hips level, no bouncing'], true),
  ('Full-Court Sprints', 'conditioning', 'conditioning', ARRAY['quads','hamstrings','calves'], ARRAY['court'], 'Repeated baseline-to-baseline sprints with set rest to build transition speed.', ARRAY['Explode out of a low start','Drive your arms and run tall','Walk back to recover between reps'], true),
  ('Jump Rope', 'conditioning', 'conditioning', ARRAY['calves','shoulders'], ARRAY['jump_rope'], 'Rope skipping that builds footwork, ankle stiffness and aerobic fitness.', ARRAY['Stay on the balls of your feet','Turn the rope with your wrists','Keep jumps small and quick'], true),
  ('Air Bike Intervals', 'conditioning', 'conditioning', ARRAY['quads','glutes','shoulders'], ARRAY['air_bike'], 'Hard bike sprints with rest that build conditioning without pounding the joints.', ARRAY['Push and pull with arms and legs','Go all out for the work interval','Pedal easy during recovery'], false),
  ('Mountain Climbers', 'conditioning', 'conditioning', ARRAY['core','hip_flexors','shoulders'], ARRAY['bodyweight'], 'Fast alternating knee drives in a plank for bodyweight conditioning.', ARRAY['Hands under shoulders, hips low','Drive knees quickly toward your chest','Keep shoulders over your hands'], false),
  ('5-10-5 Pro Agility Shuttle', 'conditioning', 'conditioning', ARRAY['quads','glutes','adductors'], ARRAY['court'], 'Short shuttle sprint that builds change-of-direction speed and deceleration.', ARRAY['Start in a low athletic stance','Plant the outside foot hard at each turn','Stay low through every direction change'], true),

  -- INJURY_PREVENTION
  ('Copenhagen Plank', 'recovery', 'injury_prevention', ARRAY['adductors','obliques','hips'], ARRAY['bench'], 'Side plank with the top leg on a bench that strengthens the groin to reduce adductor strains.', ARRAY['Top leg on bench, start with knee on it','Lift hips into a straight line','Hold short sets and build time slowly'], true),
  ('Single-Leg Balance Reach', 'warmup', 'injury_prevention', ARRAY['ankles','glutes','knees'], ARRAY['bodyweight'], 'Balance on one leg while reaching the other in several directions to build ankle and knee control.', ARRAY['Stand with knee soft over mid-foot','Reach far with the free foot, tap lightly','Keep hips level and knee from caving'], true),
  ('Banded Ankle Eversion', 'warmup', 'injury_prevention', ARRAY['peroneals','ankles'], ARRAY['resistance_band'], 'Turning the foot outward against a band to strengthen the muscles that help prevent ankle sprains.', ARRAY['Band around forefoot, anchored inside','Turn the sole of the foot outward slowly','Move only at the ankle, not the knee'], true),
  ('Banded Ankle Inversion', 'warmup', 'injury_prevention', ARRAY['tibialis_posterior','ankles'], ARRAY['resistance_band'], 'Turning the foot inward against a band to build balanced ankle strength.', ARRAY['Band around forefoot, anchored outside','Turn the sole of the foot inward slowly','Control the return for 2 seconds'], true),
  ('Spanish Squat', 'recovery', 'injury_prevention', ARRAY['quads','patellar_tendon'], ARRAY['resistance_band'], 'Squat with a heavy band behind the knees that loads the quads and can ease patellar tendon pain.', ARRAY['Anchor band securely behind both knees','Sit back so shins stay vertical','Hold 30-45 seconds at a pain-free depth'], true),
  ('Reverse Nordic', 'recovery', 'injury_prevention', ARRAY['quads','hip_flexors'], ARRAY['mat'], 'Kneeling backward lean that builds eccentric quad strength for knee health.', ARRAY['Tall kneel, hips locked straight','Lean back slowly as one unit','Only go as far as you can control'], true),
  ('Lateral Band Walk', 'warmup', 'injury_prevention', ARRAY['glute_medius','hips'], ARRAY['resistance_band'], 'Sideways steps against a band that activate the hips to keep knees stable on cuts and landings.', ARRAY['Band above knees or around ankles','Stay in a quarter squat','Step wide without letting feet snap in'], true),
  ('Banded Shoulder External Rotation', 'warmup', 'injury_prevention', ARRAY['rotator_cuff','shoulders'], ARRAY['resistance_band'], 'Band external rotation that strengthens the rotator cuff for healthy shooting shoulders.', ARRAY['Elbow tucked at your side, bent 90 degrees','Rotate the forearm out slowly','Keep shoulder blade down and back'], false),
  ('Peterson Step-Up', 'recovery', 'injury_prevention', ARRAY['quads','vmo','knees'], ARRAY['box'], 'Heel-raised step-up from a low step that targets the inner quad for knee tracking and health.', ARRAY['Use a low step, about 4-6 inches','Lift heel and drive knee over toes','Straighten the knee slowly to rise'], true),
  ('Terminal Knee Extension', 'recovery', 'injury_prevention', ARRAY['quads','vmo','knees'], ARRAY['resistance_band'], 'Band-resisted knee straightening that strengthens the quads for knee stability and rehab.', ARRAY['Band anchored behind the knee','Straighten the knee fully, squeeze quad','Let the knee bend back slowly'], true)
) AS v(name, category, primary_muscle, muscle_groups, equipment, description, cues, is_basketball_specific)
WHERE NOT EXISTS (SELECT 1 FROM public.exercise_library e WHERE e.is_system AND lower(e.name) = lower(v.name));
