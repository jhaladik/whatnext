-- Migration: Add series and documentaries domains with enhanced feedback
-- Created: 2025-01-13

-- Add series and documentaries domains
INSERT INTO domains (id, name, question_set, is_active, config, created_at, updated_at)
VALUES 
  ('series', 'TV Series', 'series_questions', 1, '{"description": "TV series and show recommendations", "enrichment_service": "TMDBService", "prompt_template": "series_prompt"}', strftime('%s', 'now'), strftime('%s', 'now')),
  ('documentaries', 'Documentaries', 'documentary_questions', 1, '{"description": "Documentary recommendations", "enrichment_service": "TMDBService", "prompt_template": "documentary_prompt"}', strftime('%s', 'now'), strftime('%s', 'now'));

-- Series-specific questions
INSERT INTO questions (id, question_text, question_type, category, domain, expected_info_gain, is_active, created_at, updated_at)
VALUES 
  -- Perfect question for series
  ('series_commitment', 'Ready to commit to multiple seasons or want something you can finish in a weekend?', 'perfect', 'commitment', 'series', 0.92, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  
  -- Follow-up for long commitment (multiple seasons)
  ('series_genre_long', 'Epic fantasy/sci-fi saga or gripping crime/drama series?', 'followup', 'genre', 'series', 0.85, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('series_complete', 'Completed series to binge or ongoing with new seasons coming?', 'followup', 'status', 'series', 0.78, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('series_prestige', 'Prestige drama that wins awards or addictive guilty pleasure?', 'followup', 'quality', 'series', 0.75, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('series_episode_long', 'Hour-long episodes or quick 20-30 minute episodes?', 'followup', 'episode_length', 'series', 0.70, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  
  -- Follow-up for short commitment (miniseries/limited)
  ('series_genre_short', 'True crime that really happened or fictional thriller?', 'followup', 'genre', 'series', 0.86, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('series_intensity', 'Light and fun or dark and intense?', 'followup', 'mood', 'series', 0.79, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('series_era_short', 'Modern day setting or period piece?', 'followup', 'era', 'series', 0.74, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('series_based', 'Based on true events or pure fiction?', 'followup', 'reality', 'series', 0.71, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  
  -- Contextual questions for series
  ('series_platform', 'Netflix/Prime/Disney+ or open to any platform?', 'contextual', 'platform', 'series', 0.65, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('series_subtitles', 'English only or international series with subtitles okay?', 'contextual', 'language', 'series', 0.62, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('series_animation', 'Live action only or animated series okay?', 'contextual', 'format', 'series', 0.60, 1, strftime('%s', 'now'), strftime('%s', 'now'));

-- Documentary-specific questions
INSERT INTO questions (id, question_text, question_type, category, domain, expected_info_gain, is_active, created_at, updated_at)
VALUES 
  -- Perfect question for documentaries
  ('doc_purpose', 'Want to learn something new or be emotionally moved?', 'perfect', 'purpose', 'documentaries', 0.91, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  
  -- Follow-up for educational
  ('doc_topic_edu', 'Science/nature wonders or history/politics?', 'followup', 'topic', 'documentaries', 0.85, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('doc_depth_edu', 'Deep dive into one topic or broad overview?', 'followup', 'depth', 'documentaries', 0.78, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('doc_style_edu', 'Traditional documentary or innovative/experimental style?', 'followup', 'style', 'documentaries', 0.74, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('doc_presenter', 'Celebrity presenter/narrator or expert interviews?', 'followup', 'presenter', 'documentaries', 0.70, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  
  -- Follow-up for emotional
  ('doc_topic_emo', 'Inspiring human stories or shocking true crime?', 'followup', 'topic', 'documentaries', 0.86, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('doc_tone', 'Uplifting and hopeful or dark and challenging?', 'followup', 'tone', 'documentaries', 0.80, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('doc_scope', 'Personal intimate story or global issue?', 'followup', 'scope', 'documentaries', 0.75, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('doc_recent', 'Current events/recent or historical perspective?', 'followup', 'recency', 'documentaries', 0.71, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  
  -- Contextual questions for documentaries
  ('doc_length', 'Feature length (90+ min) or episodic series?', 'contextual', 'length', 'documentaries', 0.65, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('doc_controversy', 'Balanced perspective or okay with controversial takes?', 'contextual', 'controversy', 'documentaries', 0.62, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('doc_visual', 'Stunning visuals important or content over style?', 'contextual', 'visual', 'documentaries', 0.60, 1, strftime('%s', 'now'), strftime('%s', 'now'));

-- Add question performance entries for new questions
INSERT INTO question_performance (question_id, avg_info_gain, usage_count, avg_satisfaction, success_rate, last_updated)
SELECT 
  id,
  expected_info_gain,
  0,
  0.5,
  0.5,
  strftime('%s', 'now')
FROM questions 
WHERE domain IN ('series', 'documentaries');

-- Update recommendation_feedback table to support liked/disliked/viewed
ALTER TABLE recommendation_feedback ADD COLUMN feedback_type TEXT DEFAULT 'rating';
-- feedback_type can be: 'rating', 'liked', 'disliked', 'viewed', 'clicked'

-- Add index for feedback type queries
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_type ON recommendation_feedback(feedback_type, session_id);

-- Create a view for feedback analytics
CREATE VIEW IF NOT EXISTS feedback_analytics AS
SELECT 
  session_id,
  recommendation_type,
  recommendation_source,
  COUNT(CASE WHEN feedback_type = 'liked' THEN 1 END) as liked_count,
  COUNT(CASE WHEN feedback_type = 'disliked' THEN 1 END) as disliked_count,
  COUNT(CASE WHEN feedback_type = 'viewed' THEN 1 END) as viewed_count,
  AVG(CASE WHEN feedback_type = 'rating' THEN user_rating END) as avg_rating,
  MAX(timestamp) as last_feedback_time
FROM recommendation_feedback
GROUP BY session_id, recommendation_type, recommendation_source;