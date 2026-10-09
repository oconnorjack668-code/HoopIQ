-- 00029_iq_question_expansion.sql
--
-- Four more quiz questions for each of the twelve IQ sections: 48 in total,
-- taking the pool from roughly 252 to roughly 300.
--
-- These feed the question of the day (00028), which walks the whole pool once
-- before repeating, so every question added here is another day before a player
-- sees anything twice.
--
-- Scope note: these are tactics, technique and decision-making, not rule
-- numbers. Shot clock, backcourt and closely-guarded counts differ between
-- FIBA, the NBA and NCAA, and a player in Ireland should not be taught an NBA
-- timing as though it were universal.
--
-- Each question is attached to the first lesson of its section, and each UPDATE
-- is guarded by a containment check on its own first question, so this file is
-- SAFE TO RE-RUN - a second run appends nothing.

DO $$
DECLARE
  v_topic uuid;
  v_item uuid;
BEGIN

-- ---------------------------------------------------------------------------
-- 1. SHOOTING MECHANICS
-- ---------------------------------------------------------------------------
SELECT id INTO v_topic FROM public.study_topics WHERE slug = 'shooting-mechanics' LIMIT 1;
IF v_topic IS NOT NULL THEN
  SELECT id INTO v_item FROM public.study_items WHERE topic_id = v_topic ORDER BY display_order LIMIT 1;
  UPDATE public.study_items SET quiz_questions = quiz_questions || '[
    {"question": "Your shots are consistently missing left and right rather than short and long. Where should you look first?", "options": ["Your arc", "Your alignment: feet, elbow and follow-through lining up with the rim", "Your leg strength", "The air pressure in the ball"], "correct_index": 1, "explanation": "Left and right misses are an alignment problem. Short and long misses are usually a legs and rhythm problem. Knowing which you are missing tells you what to fix."},
    {"question": "Why do coaches want a higher arc on a jump shot rather than a flat one?", "options": ["A higher arc gives the ball a larger opening to fall through", "A flat shot is against the rules", "A higher arc travels further", "Flat shots cannot be blocked"], "correct_index": 0, "explanation": "The steeper the ball comes down, the wider the rim looks from the ball''s point of view. A flat shot has to be far more precise to go in."},
    {"question": "Decision point: You are open for three but your feet are not set and the shot clock has plenty of time. What is usually the better choice?", "options": ["Shoot anyway, because open is open", "Take one beat to gather your feet, or attack the closeout instead", "Pass it regardless of what the defence does", "Dribble out the clock"], "correct_index": 1, "explanation": "Open with bad feet is not the same as a good shot. With time on the clock you can either reset your base or use the advantage to drive."},
    {"question": "What is the purpose of holding your follow-through after release?", "options": ["It makes the shot travel further", "It is required before you can rebound", "It keeps your wrist and elbow finishing on line and gives you feedback on the miss", "It stops the defender contesting"], "correct_index": 2, "explanation": "The hold is not superstition. It prevents you cutting the motion short, and where your hand finishes tells you why the shot missed."}
  ]'::jsonb
  WHERE id = v_item AND NOT quiz_questions @> '[{"question": "Your shots are consistently missing left and right rather than short and long. Where should you look first?"}]'::jsonb;
END IF;

-- ---------------------------------------------------------------------------
-- 2. FINISHING FOOTWORK
-- ---------------------------------------------------------------------------
SELECT id INTO v_topic FROM public.study_topics WHERE slug = 'finishing-footwork' LIMIT 1;
IF v_topic IS NOT NULL THEN
  SELECT id INTO v_item FROM public.study_items WHERE topic_id = v_topic ORDER BY display_order LIMIT 1;
  UPDATE public.study_items SET quiz_questions = quiz_questions || '[
    {"question": "What problem does a floater solve?", "options": ["It scores from the three point line", "It beats a big defender who is waiting between you and the rim, before you get close enough to be blocked", "It is the easiest shot in basketball", "It only works on fast breaks"], "correct_index": 1, "explanation": "The floater exists for the gap between a pull-up and a layup, where a rim protector is too deep to drive through but too far back to shoot over."},
    {"question": "Decision point: You beat your defender baseline, but the help defender steps across and is set, with their feet planted, before you leave the floor. What is the sensible read?", "options": ["Lower your shoulder and drive through their chest", "Jump into them to draw a foul", "Pass out, or stop and use a step-through, because charging into a set defender is an offensive foul", "Throw the ball at the backboard"], "correct_index": 2, "explanation": "A defender who is set and has established position is entitled to that space. Driving into their chest is on you, not them."},
    {"question": "Why finish with the hand furthest from the defender?", "options": ["It is always your stronger hand", "It keeps your body between the ball and the shot blocker", "It is the only legal way to finish", "It makes the shot softer"], "correct_index": 1, "explanation": "The far hand puts your shoulder and torso between the ball and the reach. The near hand hands the blocker a free swipe."},
    {"question": "What is the main advantage of a euro step?", "options": ["It gains two extra steps", "It changes your direction after you have picked up the ball, so a defender committed to one side cannot recover", "It is faster than a normal layup", "It guarantees a foul"], "correct_index": 1, "explanation": "The euro step beats a defender who has already committed. The first step sells one direction, the second goes the other way around them."}
  ]'::jsonb
  WHERE id = v_item AND NOT quiz_questions @> '[{"question": "What problem does a floater solve?"}]'::jsonb;
END IF;

-- ---------------------------------------------------------------------------
-- 3. PICK AND ROLL READS
-- ---------------------------------------------------------------------------
SELECT id INTO v_topic FROM public.study_topics WHERE slug = 'pnr-reads' LIMIT 1;
IF v_topic IS NOT NULL THEN
  SELECT id INTO v_item FROM public.study_items WHERE topic_id = v_topic ORDER BY display_order LIMIT 1;
  UPDATE public.study_items SET quiz_questions = quiz_questions || '[
    {"question": "The big guarding the screener drops back toward the rim instead of coming out at you. What has the defence given you?", "options": ["A drive all the way to the basket", "The pull-up jumper, because nobody is contesting at the level of the screen", "A lob", "Nothing at all"], "correct_index": 1, "explanation": "Drop coverage protects the rim and concedes the mid-range. If they keep dropping, the pull-up is the shot the defence has decided to live with."},
    {"question": "Decision point: Both defenders jump out at you hard above the screen, trapping the ball. What is the read?", "options": ["Dribble harder into the trap", "Pass out of it quickly, because two defenders on you means a teammate is unguarded", "Call timeout every time", "Shoot a contested three"], "correct_index": 1, "explanation": "A trap is a numbers trade. Two on the ball means four defending five somewhere behind it, so the advantage is in passing out before the defence recovers."},
    {"question": "When the screener pops rather than rolls, what does that usually tell you about them?", "options": ["They are tired", "They are a shooting threat from that range", "They have forgotten the play", "They are about to set another screen"], "correct_index": 1, "explanation": "Rolling attacks the rim; popping spaces out for a shot. A screener pops because the defence has to respect their jumper."},
    {"question": "What is the point of rejecting the screen and driving the other way?", "options": ["It is less tiring", "It punishes a defender who is already leaning to take the screen away", "It is always a better shot", "It stops the shot clock"], "correct_index": 1, "explanation": "If the defender over-commits to fighting over the screen, the space is on the other side. Rejecting it turns their preparation against them."}
  ]'::jsonb
  WHERE id = v_item AND NOT quiz_questions @> '[{"question": "The big guarding the screener drops back toward the rim instead of coming out at you. What has the defence given you?"}]'::jsonb;
END IF;

-- ---------------------------------------------------------------------------
-- 4. DEFENCE AND ROTATIONS
-- ---------------------------------------------------------------------------
SELECT id INTO v_topic FROM public.study_topics WHERE slug = 'defense-rotations' LIMIT 1;
IF v_topic IS NOT NULL THEN
  SELECT id INTO v_item FROM public.study_items WHERE topic_id = v_topic ORDER BY display_order LIMIT 1;
  UPDATE public.study_items SET quiz_questions = quiz_questions || '[
    {"question": "What is the main mistake in a bad closeout?", "options": ["Running at the shooter out of control so they can drive straight past", "Closing out with your hands down", "Closing out too slowly", "Talking while you close out"], "correct_index": 0, "explanation": "Sprinting at a shooter and arriving off balance turns a contested jumper into an open drive. Short, chopped steps at the end let you contest and still move."},
    {"question": "Decision point: You are guarding a non-shooter one pass away while a strong driver attacks the lane. Where should you be?", "options": ["Glued to your own player on the perimeter", "Off your player, in the gap, ready to help on the drive", "Under the rim", "Following the ball handler"], "correct_index": 1, "explanation": "Help is about who can hurt you. Sagging off a non-shooter to shrink the driving lane costs you little and takes away the more dangerous option."},
    {"question": "Why do defences talk constantly?", "options": ["To distract the attacking team", "Because a screen or cutter you cannot see is only picked up if a teammate tells you", "It is required by the rules", "To keep warm"], "correct_index": 1, "explanation": "Most defensive breakdowns are information failures, not effort failures. The defender who can see the screen has to call it."},
    {"question": "What does it mean to stunt and recover?", "options": ["Faking help to make the driver pick up the ball, then getting back to your own player", "Switching permanently", "Fouling on purpose", "Doubling the post"], "correct_index": 0, "explanation": "A stunt buys the on-ball defender a moment without giving up your own assignment, which is why it beats fully committing when you do not have to."}
  ]'::jsonb
  WHERE id = v_item AND NOT quiz_questions @> '[{"question": "What is the main mistake in a bad closeout?"}]'::jsonb;
END IF;

-- ---------------------------------------------------------------------------
-- 5. BALL HANDLING
-- ---------------------------------------------------------------------------
SELECT id INTO v_topic FROM public.study_topics WHERE slug = 'ball-handling' LIMIT 1;
IF v_topic IS NOT NULL THEN
  SELECT id INTO v_item FROM public.study_items WHERE topic_id = v_topic ORDER BY display_order LIMIT 1;
  UPDATE public.study_items SET quiz_questions = quiz_questions || '[
    {"question": "Why does changing pace beat simply dribbling faster?", "options": ["It uses less energy", "A defender can match constant speed, but cannot match a sudden change in it", "It looks better", "Fast dribbling is a violation"], "correct_index": 1, "explanation": "Defenders mirror speed. What they cannot mirror is acceleration, because they have to react after you have already gone."},
    {"question": "Decision point: You are trapped near the sideline by two defenders. What is usually the first thing to do?", "options": ["Dribble between them", "Pivot away from the trap and get your eyes up to find the open teammate", "Throw a long pass down court immediately", "Pick up the ball and hold it"], "correct_index": 1, "explanation": "Picking the ball up kills your options and turning your back blinds you. Pivoting out while keeping the dribble and the eyes up preserves both."},
    {"question": "What is the off arm for while dribbling under pressure?", "options": ["Balance only", "Pushing the defender away", "A legal barrier between the defender and the ball, without extending and hooking them", "Pointing at teammates"], "correct_index": 2, "explanation": "An off arm held firm is protection. An off arm that extends and hooks or pushes is an offensive foul."},
    {"question": "Why do coaches insist you keep your eyes up when dribbling?", "options": ["So you can see the defence and your teammates rather than reacting late", "To look confident", "It is a rule", "So the referee can see your face"], "correct_index": 0, "explanation": "A handle that needs your eyes is not a usable handle. You cannot read help, cutters or traps while watching the floor."}
  ]'::jsonb
  WHERE id = v_item AND NOT quiz_questions @> '[{"question": "Why does changing pace beat simply dribbling faster?"}]'::jsonb;
END IF;

-- ---------------------------------------------------------------------------
-- 6. SPACING AND OFF-BALL MOVEMENT
-- ---------------------------------------------------------------------------
SELECT id INTO v_topic FROM public.study_topics WHERE slug = 'spacing-off-ball' LIMIT 1;
IF v_topic IS NOT NULL THEN
  SELECT id INTO v_item FROM public.study_items WHERE topic_id = v_topic ORDER BY display_order LIMIT 1;
  UPDATE public.study_items SET quiz_questions = quiz_questions || '[
    {"question": "A teammate drives into the lane. What should you usually do if you are standing on the perimeter nearby?", "options": ["Stand still so the pass is easy", "Cut to the rim immediately", "Relocate along the arc to re-open a passing lane", "Walk toward the driver"], "correct_index": 2, "explanation": "Standing still lets one defender guard both of you. Moving along the arc forces them to choose, and gives the driver a target they can actually see."},
    {"question": "Why is the corner a valuable place to stand?", "options": ["It is closer to the basket", "A help defender cannot guard the corner and the rim at the same time, so it stretches the defence", "Shots are worth more there", "It is easier to rebound from"], "correct_index": 1, "explanation": "The corner pulls a defender all the way out of the lane. That is why defences hate giving it up and why leaving it unoccupied helps them."},
    {"question": "Decision point: You are being overplayed, with your defender denying the passing lane hard. What is the usual counter?", "options": ["Push them away", "Backdoor cut, because a defender fully committed to the lane has no vision of the rim behind them", "Call for the ball louder", "Stand still until they relax"], "correct_index": 1, "explanation": "Aggressive denial has a cost: the defender cannot see both you and the ball. Cutting behind them turns their pressure into an easy basket."},
    {"question": "What makes a cut effective?", "options": ["Running as fast as possible at all times", "A change of speed or direction that makes the defender commit, and timing it when the passer can see you", "Cutting on every single possession", "Cutting with your hand up"], "correct_index": 1, "explanation": "A cut at one constant speed is easy to track, and a cut nobody can see is wasted. Timing and change of pace are what make it work."}
  ]'::jsonb
  WHERE id = v_item AND NOT quiz_questions @> '[{"question": "A teammate drives into the lane. What should you usually do if you are standing on the perimeter nearby?"}]'::jsonb;
END IF;

-- ---------------------------------------------------------------------------
-- 7. TRANSITION
-- ---------------------------------------------------------------------------
SELECT id INTO v_topic FROM public.study_topics WHERE slug = 'transition' LIMIT 1;
IF v_topic IS NOT NULL THEN
  SELECT id INTO v_item FROM public.study_items WHERE topic_id = v_topic ORDER BY display_order LIMIT 1;
  UPDATE public.study_items SET quiz_questions = quiz_questions || '[
    {"question": "On a fast break, why do players sprint to fill the wide lanes rather than all running down the middle?", "options": ["It is less tiring", "Spreading the floor stretches the retreating defence so they cannot cover everyone", "The middle is out of bounds", "To stay away from the ball"], "correct_index": 1, "explanation": "Two or three defenders running back can cover a narrow break. Wide lanes force them to pick someone to leave open."},
    {"question": "Decision point: You are the first defender back and there are two attackers against you alone. What is the standard approach?", "options": ["Foul immediately", "Stop the ball and force them to pass, delaying until help arrives", "Go for the steal", "Guard the player without the ball"], "correct_index": 1, "explanation": "Two on one is lost if you commit early. Slowing the ball buys the seconds your teammates need to get back and make it two on two."},
    {"question": "What is the trailer in transition?", "options": ["A player who runs behind the break and arrives as a second wave, often for a trail three or a drag screen", "A defender who follows the ball", "The last player back on defence", "The player who inbounds the ball"], "correct_index": 0, "explanation": "The defence collapses on the first wave. The trailer arrives late into the space that collapse creates."},
    {"question": "Why is the moment after your own team shoots a common time to give up a fast break?", "options": ["Players stop to watch the shot instead of getting back", "The ball is slippery", "Referees stop watching", "Shots usually miss"], "correct_index": 0, "explanation": "Transition defence starts the instant the shot goes up. Everyone admiring the shot is the whole reason the break was available."}
  ]'::jsonb
  WHERE id = v_item AND NOT quiz_questions @> '[{"question": "On a fast break, why do players sprint to fill the wide lanes rather than all running down the middle?"}]'::jsonb;
END IF;

-- ---------------------------------------------------------------------------
-- 8. FILM STUDY
-- ---------------------------------------------------------------------------
SELECT id INTO v_topic FROM public.study_topics WHERE slug = 'film-study' LIMIT 1;
IF v_topic IS NOT NULL THEN
  SELECT id INTO v_item FROM public.study_items WHERE topic_id = v_topic ORDER BY display_order LIMIT 1;
  UPDATE public.study_items SET quiz_questions = quiz_questions || '[
    {"question": "What is the most useful thing to look for when watching your own game back?", "options": ["Only the highlights", "Decisions you made and what the defence was actually showing, not just whether the shot went in", "How you look", "The referees"], "correct_index": 1, "explanation": "A good decision can miss and a bad one can go in. Judging yourself on outcomes rather than reads teaches you the wrong lesson."},
    {"question": "Decision point: You watch a game back and notice you went left on nine of your last ten drives. What is the useful conclusion?", "options": ["You should stop driving", "You have a tendency a scout can exploit, so the right-hand drive needs work", "Left is your strong side so keep going left only", "Nothing, tendencies do not matter"], "correct_index": 1, "explanation": "Anything you do nine times out of ten is something an opponent can take away. Finding your own tendency before they do is the point of self-scouting."},
    {"question": "When scouting an opponent, which detail is most immediately useful?", "options": ["Their height", "Which hand they prefer and what they do when it is taken away", "Their shoe brand", "How loud they are"], "correct_index": 1, "explanation": "Almost every player has a strong hand and a weaker counter. Knowing which way to force them is the first thing you can actually use."},
    {"question": "Why is watching short clips repeatedly better than watching a whole game once?", "options": ["Games are too long to be interesting", "Repetition on one situation is what builds recognition, which is what lets you read it in real time", "It uses less data", "Whole games contain mistakes"], "correct_index": 1, "explanation": "Reading the game fast is pattern recognition. You build patterns by seeing the same situation many times, not by seeing many situations once."}
  ]'::jsonb
  WHERE id = v_item AND NOT quiz_questions @> '[{"question": "What is the most useful thing to look for when watching your own game back?"}]'::jsonb;
END IF;

-- ---------------------------------------------------------------------------
-- 9. REBOUNDING
-- ---------------------------------------------------------------------------
SELECT id INTO v_topic FROM public.study_topics WHERE slug = 'rebounding' LIMIT 1;
IF v_topic IS NOT NULL THEN
  SELECT id INTO v_item FROM public.study_items WHERE topic_id = v_topic ORDER BY display_order LIMIT 1;
  UPDATE public.study_items SET quiz_questions = quiz_questions || '[
    {"question": "What does boxing out actually achieve?", "options": ["It guarantees you catch the ball", "It puts your body between your opponent and the rim so they cannot run through to the ball", "It is a way of fouling legally", "It stops the shot going in"], "correct_index": 1, "explanation": "Boxing out is about position, not catching. You are buying the time and space to go and get the ball unopposed."},
    {"question": "Decision point: A shot goes up from the right wing. Where is the rebound most likely to land?", "options": ["Directly under the rim", "Most often on the opposite side, because missed shots tend to carry across", "Always back to the shooter", "On the baseline"], "correct_index": 1, "explanation": "Misses from an angle commonly rebound long and to the opposite side. Knowing that puts you a step ahead of someone just reacting to the bounce."},
    {"question": "Why do coaches say to go up with two hands when you can?", "options": ["It looks stronger", "Two hands secures the ball against a strip and lets you land in balance", "One hand is illegal", "It is faster"], "correct_index": 1, "explanation": "A one-handed grab in traffic is a turnover waiting to happen. Two hands means you keep what you fought for."},
    {"question": "What is the first thing to do after securing a defensive rebound in traffic?", "options": ["Dribble immediately", "Chin the ball with elbows out and find an outlet before putting it on the floor", "Throw it as far as possible", "Call timeout"], "correct_index": 1, "explanation": "The most dangerous moment is right after the catch, with hands everywhere. Securing it first and looking up beats dribbling into trouble."}
  ]'::jsonb
  WHERE id = v_item AND NOT quiz_questions @> '[{"question": "What does boxing out actually achieve?"}]'::jsonb;
END IF;

-- ---------------------------------------------------------------------------
-- 10. POST PLAY
-- ---------------------------------------------------------------------------
SELECT id INTO v_topic FROM public.study_topics WHERE slug = 'post-play' LIMIT 1;
IF v_topic IS NOT NULL THEN
  SELECT id INTO v_item FROM public.study_items WHERE topic_id = v_topic ORDER BY display_order LIMIT 1;
  UPDATE public.study_items SET quiz_questions = quiz_questions || '[
    {"question": "Why does where you catch the ball in the post matter so much?", "options": ["It does not matter", "Catching deeper means a shorter, higher-percentage shot and less room for help to arrive", "Catching further out draws more fouls", "Deeper catches are easier to pass from"], "correct_index": 1, "explanation": "The work happens before the catch. A catch two steps further out turns a simple finish into a contested turnaround."},
    {"question": "Decision point: You catch in the post and a second defender immediately comes to double team you. What is the first read?", "options": ["Shoot over both of them", "Find the teammate their defender just left, because a double means someone is open", "Dribble into the double", "Back out to half court"], "correct_index": 1, "explanation": "A double team is an invitation to pass. The open player is usually the one whose defender rotated to cover the one who doubled."},
    {"question": "What is the purpose of a drop step?", "options": ["To create space by stepping through toward the rim off the defender''s positioning", "To avoid dribbling", "To slow the game down", "To draw a charge"], "correct_index": 0, "explanation": "The drop step attacks the side the defender is not on, turning their own positioning into the opening."},
    {"question": "Why do coaches tell post players to look over their shoulder before making a move?", "options": ["To check the referee", "To see where the help defence is before committing to a move", "To call for a screen", "To check the clock only"], "correct_index": 1, "explanation": "The right post move depends entirely on where help is coming from. Checking first turns a guess into a read."}
  ]'::jsonb
  WHERE id = v_item AND NOT quiz_questions @> '[{"question": "Why does where you catch the ball in the post matter so much?"}]'::jsonb;
END IF;

-- ---------------------------------------------------------------------------
-- 11. GAME SITUATIONS
-- ---------------------------------------------------------------------------
SELECT id INTO v_topic FROM public.study_topics WHERE slug = 'game-situations' LIMIT 1;
IF v_topic IS NOT NULL THEN
  SELECT id INTO v_item FROM public.study_items WHERE topic_id = v_topic ORDER BY display_order LIMIT 1;
  UPDATE public.study_items SET quiz_questions = quiz_questions || '[
    {"question": "What is a two for one at the end of a quarter?", "options": ["Scoring two baskets in one possession", "Shooting early enough that your team gets the ball back and takes a second shot before the period ends", "Taking two free throws", "Playing two defenders on the ball"], "correct_index": 1, "explanation": "If you shoot with enough time left, the clock allows your team one more possession than the opponent. It is free value for giving up a few seconds."},
    {"question": "Decision point: Your team leads by three with a few seconds left and the opponent has the ball. Why might a coach choose to foul before they can shoot?", "options": ["To stop the clock", "Because two free throws cannot tie the game, while a three can", "To tire the opponent", "To get the ball back faster"], "correct_index": 1, "explanation": "Fouling trades a possible tying three for at most two points. The cost is giving up a free throw; the gain is removing the shot that beats you."},
    {"question": "Your team is down and the clock is running low. What is the most common mistake?", "options": ["Shooting too early", "Rushing a bad shot when there is still time, or holding too long and running out of it", "Passing too much", "Calling timeout"], "correct_index": 1, "explanation": "Late-game offence is a clock problem as much as a shot problem. Knowing how much time a possession actually needs prevents both errors."},
    {"question": "Why do coaches save a timeout for the end of a close game?", "options": ["To rest players", "To set up a specific play, and sometimes to advance the ball or stop a run at the moment it matters most", "Because timeouts expire", "To talk to the referee"], "correct_index": 1, "explanation": "A timeout late is worth far more than a timeout early, because it converts a scramble into a designed possession."}
  ]'::jsonb
  WHERE id = v_item AND NOT quiz_questions @> '[{"question": "What is a two for one at the end of a quarter?"}]'::jsonb;
END IF;

-- ---------------------------------------------------------------------------
-- 12. MENTAL GAME
-- ---------------------------------------------------------------------------
SELECT id INTO v_topic FROM public.study_topics WHERE slug = 'mental-game' LIMIT 1;
IF v_topic IS NOT NULL THEN
  SELECT id INTO v_item FROM public.study_items WHERE topic_id = v_topic ORDER BY display_order LIMIT 1;
  UPDATE public.study_items SET quiz_questions = quiz_questions || '[
    {"question": "What is the point of a pre-shot routine at the free throw line?", "options": ["To slow the game down for the opponent", "To make the physical and mental start of every attempt identical, so pressure changes less", "To distract the defence", "It is required by the rules"], "correct_index": 1, "explanation": "A routine removes decisions at the moment you least want to be making them. The same start every time makes the shot repeatable under pressure."},
    {"question": "Decision point: You have missed your last four shots and you are open again. What is the right approach?", "options": ["Stop shooting for the rest of the game", "Take the shot if it is a good one, because four attempts is far too small a sample to change what is a good shot", "Shoot from further out to break the run", "Pass to anyone else"], "correct_index": 1, "explanation": "Four misses is noise, not evidence. Letting a short run change your shot selection is how a cold spell becomes a bad game."},
    {"question": "What does a next play mentality mean in practice?", "options": ["Forgetting the mistake entirely and never reviewing it", "Dealing with the mistake after the game, and giving your full attention to the possession in front of you now", "Playing faster after an error", "Blaming a teammate"], "correct_index": 1, "explanation": "The mistake is already spent. Carrying it into the next possession turns one error into two, which is why review belongs after the game, not during it."},
    {"question": "Why does visualisation help before a game?", "options": ["It replaces physical practice", "Rehearsing situations in detail means you have already made the decision once when it arrives for real", "It makes you more tired", "It guarantees you play well"], "correct_index": 1, "explanation": "Visualisation is preparation, not magic. Having already pictured a situation means you recognise it faster rather than meeting it cold."}
  ]'::jsonb
  WHERE id = v_item AND NOT quiz_questions @> '[{"question": "What is the point of a pre-shot routine at the free throw line?"}]'::jsonb;
END IF;

END $$;
