-- Add missing questions to production database
INSERT OR REPLACE INTO questions (id, question_text, question_type, category, expected_info_gain, is_active, created_at, updated_at) VALUES
('complexity_level', 'Do you want beginner-friendly content or advanced/expert level?', 'followup', 'complexity', 0.76, 1, 1736693000000, 1736693000000),
('practical_theoretical', 'Do you prefer practical how-to content or theoretical concepts?', 'followup', 'learning', 0.73, 1, 1736693000000, 1736693000000),
('mood_preference', 'Are you in the mood for something uplifting or something thought-provoking?', 'followup', 'mood', 0.71, 1, 1736693000000, 1736693000000),
('content_length', 'Do you prefer bite-sized content or longer immersive experiences?', 'followup', 'time', 0.77, 1, 1736693000000, 1736693000000),
('topic_preference', 'Are you more interested in technology/science or arts/humanities?', 'contextual', 'topic', 0.68, 1, 1736693000000, 1736693000000),
('visual_preference', 'Do you prefer highly visual content or content focused on ideas?', 'contextual', 'format', 0.65, 1, 1736693000000, 1736693000000),
('creator_preference', 'Do you prefer content from established experts or emerging voices?', 'contextual', 'source', 0.62, 1, 1736693000000, 1736693000000),
('interactivity_level', 'Do you want to actively participate or just observe?', 'contextual', 'engagement', 0.70, 1, 1736693000000, 1736693000000);

-- Add performance metrics for all questions
INSERT OR REPLACE INTO question_performance (question_id, avg_info_gain, usage_count, avg_satisfaction, success_rate, last_updated) VALUES
('cognitive_engagement', 0.92, 0, 0.5, 0.5, 1736693000000),
('learning_depth', 0.85, 0, 0.5, 0.5, 1736693000000),
('content_format', 0.78, 0, 0.5, 0.5, 1736693000000),
('time_commitment', 0.81, 0, 0.5, 0.5, 1736693000000),
('complexity_level', 0.76, 0, 0.5, 0.5, 1736693000000),
('practical_theoretical', 0.73, 0, 0.5, 0.5, 1736693000000),
('engagement_type', 0.83, 0, 0.5, 0.5, 1736693000000),
('novelty_preference', 0.79, 0, 0.5, 0.5, 1736693000000),
('social_context', 0.74, 0, 0.5, 0.5, 1736693000000),
('mood_preference', 0.71, 0, 0.5, 0.5, 1736693000000),
('content_length', 0.77, 0, 0.5, 0.5, 1736693000000),
('topic_preference', 0.68, 0, 0.5, 0.5, 1736693000000),
('visual_preference', 0.65, 0, 0.5, 0.5, 1736693000000),
('creator_preference', 0.62, 0, 0.5, 0.5, 1736693000000),
('interactivity_level', 0.70, 0, 0.5, 0.5, 1736693000000);