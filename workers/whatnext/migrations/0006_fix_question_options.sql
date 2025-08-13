-- Migration: Fix question options for series and documentaries
-- Created: 2025-01-13

-- Add options column to questions table if it doesn't exist
ALTER TABLE questions ADD COLUMN options TEXT;

-- Update series questions with proper options
UPDATE questions SET options = '{"left": "Multiple seasons", "right": "Weekend binge"}' 
WHERE id = 'series_commitment';

UPDATE questions SET options = '{"left": "Epic fantasy/sci-fi", "right": "Crime/drama"}' 
WHERE id = 'series_genre_long';

UPDATE questions SET options = '{"left": "Completed series", "right": "Ongoing series"}' 
WHERE id = 'series_complete';

UPDATE questions SET options = '{"left": "Prestige drama", "right": "Guilty pleasure"}' 
WHERE id = 'series_prestige';

UPDATE questions SET options = '{"left": "Hour-long episodes", "right": "20-30 min episodes"}' 
WHERE id = 'series_episode_long';

UPDATE questions SET options = '{"left": "True crime", "right": "Fictional thriller"}' 
WHERE id = 'series_genre_short';

UPDATE questions SET options = '{"left": "Light and fun", "right": "Dark and intense"}' 
WHERE id = 'series_intensity';

UPDATE questions SET options = '{"left": "Modern day", "right": "Period piece"}' 
WHERE id = 'series_era_short';

UPDATE questions SET options = '{"left": "Based on true events", "right": "Pure fiction"}' 
WHERE id = 'series_based';

UPDATE questions SET options = '{"left": "Any platform", "right": "Netflix/Prime/Disney+ only"}' 
WHERE id = 'series_platform';

UPDATE questions SET options = '{"left": "English only", "right": "Subtitles okay"}' 
WHERE id = 'series_subtitles';

UPDATE questions SET options = '{"left": "Live action only", "right": "Animated okay"}' 
WHERE id = 'series_animation';

-- Update documentary questions with proper options
UPDATE questions SET options = '{"left": "Learn something new", "right": "Be emotionally moved"}' 
WHERE id = 'doc_purpose';

UPDATE questions SET options = '{"left": "Science/nature", "right": "History/politics"}' 
WHERE id = 'doc_topic_edu';

UPDATE questions SET options = '{"left": "Deep dive", "right": "Broad overview"}' 
WHERE id = 'doc_depth_edu';

UPDATE questions SET options = '{"left": "Traditional style", "right": "Innovative/experimental"}' 
WHERE id = 'doc_style_edu';

UPDATE questions SET options = '{"left": "Celebrity presenter", "right": "Expert interviews"}' 
WHERE id = 'doc_presenter';

UPDATE questions SET options = '{"left": "Inspiring stories", "right": "True crime"}' 
WHERE id = 'doc_topic_emo';

UPDATE questions SET options = '{"left": "Uplifting", "right": "Dark and challenging"}' 
WHERE id = 'doc_tone';

UPDATE questions SET options = '{"left": "Personal story", "right": "Global issue"}' 
WHERE id = 'doc_scope';

UPDATE questions SET options = '{"left": "Current events", "right": "Historical"}' 
WHERE id = 'doc_recent';

UPDATE questions SET options = '{"left": "Feature length", "right": "Episodic series"}' 
WHERE id = 'doc_length';

UPDATE questions SET options = '{"left": "Balanced perspective", "right": "Controversial okay"}' 
WHERE id = 'doc_controversy';

UPDATE questions SET options = '{"left": "Stunning visuals", "right": "Content over style"}' 
WHERE id = 'doc_visual';

-- Also update movie questions to have consistent format
UPDATE questions SET options = '{"left": "Uplifting", "right": "Intense"}' 
WHERE id = 'movie_mood';

UPDATE questions SET options = '{"left": "Comedy", "right": "Drama"}' 
WHERE id = 'movie_genre_light';

UPDATE questions SET options = '{"left": "Recent (last 5 years)", "right": "Timeless classic"}' 
WHERE id = 'movie_era_modern';

UPDATE questions SET options = '{"left": "Grounded reality", "right": "Escapist fantasy"}' 
WHERE id = 'movie_reality_light';

UPDATE questions SET options = '{"left": "Quick (under 2 hours)", "right": "Epic journey"}' 
WHERE id = 'movie_commitment_light';

UPDATE questions SET options = '{"left": "Watching alone", "right": "With others"}' 
WHERE id = 'movie_solo_social';

UPDATE questions SET options = '{"left": "Thriller", "right": "Sci-fi"}' 
WHERE id = 'movie_genre_intense';

UPDATE questions SET options = '{"left": "Slow burn", "right": "Non-stop action"}' 
WHERE id = 'movie_pace';

UPDATE questions SET options = '{"left": "Personal stakes", "right": "World-ending"}' 
WHERE id = 'movie_stakes';

UPDATE questions SET options = '{"left": "Gritty realistic", "right": "Stylized fantasy"}' 
WHERE id = 'movie_violence';

UPDATE questions SET options = '{"left": "Satisfying conclusion", "right": "Ambiguity okay"}' 
WHERE id = 'movie_ending';

UPDATE questions SET options = '{"left": "Stand-alone", "right": "Part of universe"}' 
WHERE id = 'movie_franchise';

UPDATE questions SET options = '{"left": "Star-studded", "right": "Hidden gem"}' 
WHERE id = 'movie_cast';

UPDATE questions SET options = '{"left": "English only", "right": "Foreign films okay"}' 
WHERE id = 'movie_subtitles';

UPDATE questions SET options = '{"left": "Family-friendly", "right": "Mature content"}' 
WHERE id = 'movie_rating';