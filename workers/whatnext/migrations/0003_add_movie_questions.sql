-- migrations/0003_add_movie_questions.sql
-- Adds movie-specific questions to the database

-- Movie-specific questions with high information gain
INSERT INTO questions (id, question_text, question_type, category, domain, expected_info_gain, is_active, created_at, updated_at)
VALUES 
  -- Perfect question for movies
  ('movie_mood', 'What mood are you in for a movie?', 'perfect', 'mood', 'movies', 0.90, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  
  -- Follow-up questions for uplifting mood
  ('movie_genre_light', 'Comedy that makes you laugh or drama that warms your heart?', 'followup', 'genre', 'movies', 0.85, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('movie_era_modern', 'Something from the last 5 years or a timeless classic?', 'followup', 'era', 'movies', 0.78, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('movie_reality_light', 'Grounded in reality or pure escapist fantasy?', 'followup', 'reality', 'movies', 0.75, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('movie_commitment_light', 'Quick watch (under 2 hours) or ready for an epic journey?', 'followup', 'time', 'movies', 0.72, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('movie_solo_social', 'Watching alone or with others?', 'followup', 'social', 'movies', 0.68, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  
  -- Follow-up questions for intense mood
  ('movie_genre_intense', 'Heart-pounding thriller or mind-bending sci-fi?', 'followup', 'genre', 'movies', 0.86, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('movie_pace', 'Slow burn that builds tension or non-stop action?', 'followup', 'pace', 'movies', 0.79, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('movie_stakes', 'Personal intimate stakes or world-ending consequences?', 'followup', 'stakes', 'movies', 0.74, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('movie_violence', 'Gritty and realistic or stylized and fantastical?', 'followup', 'violence', 'movies', 0.70, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('movie_ending', 'Need a satisfying conclusion or okay with ambiguity?', 'followup', 'ending', 'movies', 0.67, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  
  -- Contextual questions for movies
  ('movie_franchise', 'Stand-alone story or part of a larger universe?', 'contextual', 'franchise', 'movies', 0.65, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('movie_cast', 'Star-studded blockbuster or hidden gem with unknowns?', 'contextual', 'cast', 'movies', 0.62, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('movie_subtitles', 'English only or open to foreign films with subtitles?', 'contextual', 'language', 'movies', 0.60, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('movie_rating', 'Family-friendly or mature content okay?', 'contextual', 'rating', 'movies', 0.58, 1, strftime('%s', 'now'), strftime('%s', 'now'));

-- Add question performance entries for new movie questions
INSERT INTO question_performance (question_id, avg_info_gain, usage_count, avg_satisfaction, success_rate, last_updated)
SELECT 
  id,
  expected_info_gain,
  0,
  0.5,
  0.5,
  strftime('%s', 'now')
FROM questions 
WHERE domain = 'movies';