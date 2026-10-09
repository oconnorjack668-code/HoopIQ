-- 00030_curated_lesson_videos.sql
--
-- Real videos for all 36 IQ lessons.
--
-- Every lesson in the app shipped with youtube_video_id = 'placeholder' and
-- youtube_channel = 'HoopIQ' - a channel that does not exist - and the lesson
-- page sent players to a YouTube search for the lesson title instead. They
-- landed wherever the search happened to rank. Since 0b6c54e a lesson holding a
-- real id plays in place, so this fills them in.
--
-- PROVENANCE. Every id below was found by searching the web, and then
-- independently confirmed against YouTube's oEmbed API before being written
-- here: a real id returns the title and channel, an invented one returns HTTP
-- 400. All 36 returned 200, and the channel names in this file are the
-- author_name the API gave back, not a guess - which is also how the fake
-- 'HoopIQ' attribution gets corrected. One further candidate was proposed and
-- discarded because oEmbed returned 404 for it.
--
-- Videos are matched to lessons by position within their section, so the first
-- lesson of a section gets the first video. Only rows still holding
-- 'placeholder' are touched, which makes this SAFE TO RE-RUN and means it will
-- never overwrite a video someone has deliberately chosen later.

WITH curated(slug, pos, vid, channel) AS (
  VALUES
    -- 1. Shooting Mechanics & Fluidity
    ('shooting-mechanics', 1, 'EoQu1XJfEb8', 'SeeMikeDunn'),
    ('shooting-mechanics', 2, 'xWuO8GF5FIw', 'ILoveBasketballTV'),
    ('shooting-mechanics', 3, 'fttAr9-Yo9g', 'ShotMechanics'),
    -- 2. Finishing Footwork & Angle Control
    ('finishing-footwork', 1, 'KBhaNvU0xb8', 'Teach Hoops'),
    ('finishing-footwork', 2, 'xCK_7ydyj9M', 'Teach Hoops'),
    ('finishing-footwork', 3, 'z-JevHHCksQ', 'Coach Frikki'),
    -- 3. Pick & Roll Reads & Manipulations
    ('pnr-reads', 1, 'QE_P-oqkLUw', 'Matt Woodcock'),
    ('pnr-reads', 2, '01rcPig8FNg', 'Basketball Orbit'),
    ('pnr-reads', 3, 'w1ilSKt6HJQ', '5T Hoops'),
    -- 4. Defensive Stance & Help-Side
    ('defense-rotations', 1, 'LVrOh4KLNyQ', 'Coach Tony Miller'),
    ('defense-rotations', 2, '4RuYhzwnzDE', 'FIBA Basketball'),
    ('defense-rotations', 3, 'lYMHGPNq_78', 'Basketball Orbit'),
    -- 5. Ball Handling
    ('ball-handling', 1, 'eqOIdubWo0E', 'Coach Ashworth'),
    ('ball-handling', 2, 'HMZPUFhDkN4', 'By Any Means Basketball'),
    ('ball-handling', 3, 'idFIMC0vPwI', 'Patryk Janiszewski'),
    -- 6. Spacing & Off-Ball Movement
    ('spacing-off-ball', 1, 'GNk9tw7v1jw', 'Basketball Immersion'),
    ('spacing-off-ball', 2, 'm1uWLf6kcDA', 'Basketball Coaches Academy'),
    ('spacing-off-ball', 3, 'igT90HjVEsI', 'Basketball U'),
    -- 7. Transition Offense & Defense
    ('transition', 1, 'JBSAIy6npKY', 'Coachbase'),
    ('transition', 2, 'yIelAfF9OB4', 'HoopsKing.com Basketball & Vertical Jump Training'),
    ('transition', 3, 'rRVY6XcoO4o', 'Basketball Coach Allen'),
    -- 8. Reading the Game & Film Study
    ('film-study', 1, '7YSK0WXkHkc', 'Believe Basketball'),
    ('film-study', 2, 'PaUKMDmj3fU', 'Vision Driven Basketball'),
    ('film-study', 3, 'ftJr8ZTjHlM', 'The Hoop Sage'),
    -- 9. Rebounding
    ('rebounding', 1, 'mEsWzrS6wPU', 'Premier Hoops'),
    ('rebounding', 2, '-TLWi7uOI3s', 'streetball21.cz'),
    ('rebounding', 3, 'W8X-2aQXPsQ', 'PGC Coaching'),
    -- 10. Post Play
    ('post-play', 1, 't2dJ6EpQIgk', 'Shot Science Basketball'),
    ('post-play', 2, 'XQ6Hnmc5l_0', 'Teach Hoops'),
    ('post-play', 3, 'Xp_VMRfkiFc', 'THINCPRO Basketball'),
    -- 11. Game Situations & Clock Management
    ('game-situations', 1, '_jFzm4dpd14', 'Teach Hoops'),
    ('game-situations', 2, '0VxUcp5nimw', 'Basketball Immersion'),
    ('game-situations', 3, 'SQNqgu4SpqM', 'Championship Productions'),
    -- 12. Mental Game
    ('mental-game', 1, '6v4EsJ2vHow', 'Vision Driven Basketball'),
    ('mental-game', 2, '8IKCp3K_rvg', 'Torin Dorn'),
    ('mental-game', 3, 'OcEi7wvMT7U', 'TJL Training')
),
-- Lessons numbered within their own section, in the order players see them
ranked AS (
  SELECT
    si.id,
    st.slug,
    ROW_NUMBER() OVER (PARTITION BY si.topic_id ORDER BY si.display_order, si.title) AS pos
  FROM public.study_items si
  JOIN public.study_topics st ON st.id = si.topic_id
)
UPDATE public.study_items si
SET youtube_video_id = c.vid,
    youtube_channel = c.channel
FROM ranked r
JOIN curated c ON c.slug = r.slug AND c.pos = r.pos::bigint
WHERE si.id = r.id
  AND si.youtube_video_id = 'placeholder';
