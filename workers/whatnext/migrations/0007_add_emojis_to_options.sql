-- Migration: Add emojis to question options
-- Created: 2025-01-13

-- Update series questions with emojis
UPDATE questions SET options = '{"left": {"text": "Multiple seasons", "emoji": "📺", "id": "long"}, "right": {"text": "Weekend binge", "emoji": "⚡", "id": "short"}}' 
WHERE id = 'series_commitment';

UPDATE questions SET options = '{"left": {"text": "Epic fantasy/sci-fi", "emoji": "🐉", "id": "fantasy"}, "right": {"text": "Crime/drama", "emoji": "🔍", "id": "crime"}}' 
WHERE id = 'series_genre_long';

UPDATE questions SET options = '{"left": {"text": "Completed series", "emoji": "✅", "id": "complete"}, "right": {"text": "Ongoing series", "emoji": "🔄", "id": "ongoing"}}' 
WHERE id = 'series_complete';

UPDATE questions SET options = '{"left": {"text": "Prestige drama", "emoji": "🏆", "id": "prestige"}, "right": {"text": "Guilty pleasure", "emoji": "🍿", "id": "guilty"}}' 
WHERE id = 'series_prestige';

UPDATE questions SET options = '{"left": {"text": "Hour-long episodes", "emoji": "⏰", "id": "long"}, "right": {"text": "20-30 min episodes", "emoji": "⚡", "id": "short"}}' 
WHERE id = 'series_episode_long';

UPDATE questions SET options = '{"left": {"text": "True crime", "emoji": "🔪", "id": "truecrime"}, "right": {"text": "Fictional thriller", "emoji": "😱", "id": "thriller"}}' 
WHERE id = 'series_genre_short';

UPDATE questions SET options = '{"left": {"text": "Light and fun", "emoji": "😄", "id": "light"}, "right": {"text": "Dark and intense", "emoji": "😈", "id": "dark"}}' 
WHERE id = 'series_intensity';

UPDATE questions SET options = '{"left": {"text": "Modern day", "emoji": "📱", "id": "modern"}, "right": {"text": "Period piece", "emoji": "🏛️", "id": "period"}}' 
WHERE id = 'series_era_short';

UPDATE questions SET options = '{"left": {"text": "Based on true events", "emoji": "📰", "id": "true"}, "right": {"text": "Pure fiction", "emoji": "🎭", "id": "fiction"}}' 
WHERE id = 'series_based';

UPDATE questions SET options = '{"left": {"text": "Any platform", "emoji": "🌐", "id": "any"}, "right": {"text": "Netflix/Prime/Disney+", "emoji": "📺", "id": "major"}}' 
WHERE id = 'series_platform';

UPDATE questions SET options = '{"left": {"text": "English only", "emoji": "🇬🇧", "id": "english"}, "right": {"text": "Subtitles okay", "emoji": "🌍", "id": "international"}}' 
WHERE id = 'series_subtitles';

UPDATE questions SET options = '{"left": {"text": "Live action only", "emoji": "🎬", "id": "live"}, "right": {"text": "Animated okay", "emoji": "🎨", "id": "animated"}}' 
WHERE id = 'series_animation';

-- Update documentary questions with emojis
UPDATE questions SET options = '{"left": {"text": "Learn something new", "emoji": "🧠", "id": "learn"}, "right": {"text": "Be emotionally moved", "emoji": "❤️", "id": "emotional"}}' 
WHERE id = 'doc_purpose';

UPDATE questions SET options = '{"left": {"text": "Science/nature", "emoji": "🔬", "id": "science"}, "right": {"text": "History/politics", "emoji": "📜", "id": "history"}}' 
WHERE id = 'doc_topic_edu';

UPDATE questions SET options = '{"left": {"text": "Deep dive", "emoji": "🤿", "id": "deep"}, "right": {"text": "Broad overview", "emoji": "🗺️", "id": "broad"}}' 
WHERE id = 'doc_depth_edu';

UPDATE questions SET options = '{"left": {"text": "Traditional style", "emoji": "🎥", "id": "traditional"}, "right": {"text": "Innovative/experimental", "emoji": "🎪", "id": "experimental"}}' 
WHERE id = 'doc_style_edu';

UPDATE questions SET options = '{"left": {"text": "Celebrity presenter", "emoji": "⭐", "id": "celebrity"}, "right": {"text": "Expert interviews", "emoji": "👨‍🔬", "id": "expert"}}' 
WHERE id = 'doc_presenter';

UPDATE questions SET options = '{"left": {"text": "Inspiring stories", "emoji": "✨", "id": "inspiring"}, "right": {"text": "True crime", "emoji": "🔍", "id": "truecrime"}}' 
WHERE id = 'doc_topic_emo';

UPDATE questions SET options = '{"left": {"text": "Uplifting", "emoji": "☀️", "id": "uplifting"}, "right": {"text": "Dark and challenging", "emoji": "🌙", "id": "dark"}}' 
WHERE id = 'doc_tone';

UPDATE questions SET options = '{"left": {"text": "Personal story", "emoji": "👤", "id": "personal"}, "right": {"text": "Global issue", "emoji": "🌍", "id": "global"}}' 
WHERE id = 'doc_scope';

UPDATE questions SET options = '{"left": {"text": "Current events", "emoji": "📰", "id": "current"}, "right": {"text": "Historical", "emoji": "📚", "id": "historical"}}' 
WHERE id = 'doc_recent';

UPDATE questions SET options = '{"left": {"text": "Feature length", "emoji": "🎬", "id": "feature"}, "right": {"text": "Episodic series", "emoji": "📺", "id": "series"}}' 
WHERE id = 'doc_length';

UPDATE questions SET options = '{"left": {"text": "Balanced perspective", "emoji": "⚖️", "id": "balanced"}, "right": {"text": "Controversial okay", "emoji": "🔥", "id": "controversial"}}' 
WHERE id = 'doc_controversy';

UPDATE questions SET options = '{"left": {"text": "Stunning visuals", "emoji": "🎨", "id": "visual"}, "right": {"text": "Content over style", "emoji": "📝", "id": "content"}}' 
WHERE id = 'doc_visual';

-- Update movie questions with emojis
UPDATE questions SET options = '{"left": {"text": "Uplifting", "emoji": "😊", "id": "uplifting"}, "right": {"text": "Intense", "emoji": "😰", "id": "intense"}}' 
WHERE id = 'movie_mood';

UPDATE questions SET options = '{"left": {"text": "Comedy", "emoji": "😂", "id": "comedy"}, "right": {"text": "Drama", "emoji": "🎭", "id": "drama"}}' 
WHERE id = 'movie_genre_light';

UPDATE questions SET options = '{"left": {"text": "Recent (last 5 years)", "emoji": "🆕", "id": "recent"}, "right": {"text": "Timeless classic", "emoji": "🏛️", "id": "classic"}}' 
WHERE id = 'movie_era_modern';

UPDATE questions SET options = '{"left": {"text": "Grounded reality", "emoji": "🏙️", "id": "realistic"}, "right": {"text": "Escapist fantasy", "emoji": "🦄", "id": "fantasy"}}' 
WHERE id = 'movie_reality_light';

UPDATE questions SET options = '{"left": {"text": "Quick (under 2 hours)", "emoji": "⏱️", "id": "quick"}, "right": {"text": "Epic journey", "emoji": "🗺️", "id": "epic"}}' 
WHERE id = 'movie_commitment_light';

UPDATE questions SET options = '{"left": {"text": "Watching alone", "emoji": "👤", "id": "solo"}, "right": {"text": "With others", "emoji": "👥", "id": "social"}}' 
WHERE id = 'movie_solo_social';

UPDATE questions SET options = '{"left": {"text": "Thriller", "emoji": "💀", "id": "thriller"}, "right": {"text": "Sci-fi", "emoji": "🚀", "id": "scifi"}}' 
WHERE id = 'movie_genre_intense';

UPDATE questions SET options = '{"left": {"text": "Slow burn", "emoji": "🕯️", "id": "slow"}, "right": {"text": "Non-stop action", "emoji": "💥", "id": "action"}}' 
WHERE id = 'movie_pace';

UPDATE questions SET options = '{"left": {"text": "Personal stakes", "emoji": "💔", "id": "personal"}, "right": {"text": "World-ending", "emoji": "🌍", "id": "epic"}}' 
WHERE id = 'movie_stakes';

UPDATE questions SET options = '{"left": {"text": "Gritty realistic", "emoji": "🩸", "id": "gritty"}, "right": {"text": "Stylized fantasy", "emoji": "✨", "id": "stylized"}}' 
WHERE id = 'movie_violence';

UPDATE questions SET options = '{"left": {"text": "Satisfying conclusion", "emoji": "🎯", "id": "satisfying"}, "right": {"text": "Ambiguity okay", "emoji": "❓", "id": "ambiguous"}}' 
WHERE id = 'movie_ending';

UPDATE questions SET options = '{"left": {"text": "Stand-alone", "emoji": "🎬", "id": "standalone"}, "right": {"text": "Part of universe", "emoji": "🌌", "id": "franchise"}}' 
WHERE id = 'movie_franchise';

UPDATE questions SET options = '{"left": {"text": "Star-studded", "emoji": "⭐", "id": "stars"}, "right": {"text": "Hidden gem", "emoji": "💎", "id": "indie"}}' 
WHERE id = 'movie_cast';

UPDATE questions SET options = '{"left": {"text": "English only", "emoji": "🇬🇧", "id": "english"}, "right": {"text": "Foreign films okay", "emoji": "🌍", "id": "foreign"}}' 
WHERE id = 'movie_subtitles';

UPDATE questions SET options = '{"left": {"text": "Family-friendly", "emoji": "👨‍👩‍👧‍👦", "id": "family"}, "right": {"text": "Mature content", "emoji": "🔞", "id": "mature"}}' 
WHERE id = 'movie_rating';