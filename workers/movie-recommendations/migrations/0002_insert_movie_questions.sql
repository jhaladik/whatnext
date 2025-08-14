-- Migration 0002: Insert movie-specific questions

-- Clear existing questions for all domains
DELETE FROM questions WHERE domain IN ('movies', 'tv-series', 'documentaries');

-- Insert the 5 strategic movie questions
INSERT INTO questions (id, domain, question_text, description, options, order_index, vector_weights, personal_context) VALUES

-- Question 1: Cognitive Load
('cognitive_load', 'movies', 
 'What kind of mental engagement do you want?',
 'This helps us understand if you want something challenging or relaxing',
 '[{"id":"challenge","text":"Mind-bending & thought-provoking","emoji":"🧠","examples":"Like Inception, Interstellar, Black Mirror"},{"id":"easy","text":"Easy entertainment & fun","emoji":"🍿","examples":"Like Marvel movies, romantic comedies, action films"}]',
 1,
 '{"challenge":{"complexity":0.8,"intellectual":0.9,"mainstream":0.2},"easy":{"complexity":0.2,"intellectual":0.1,"mainstream":0.8}}',
 FALSE),

-- Question 2: Emotional Tone
('emotional_tone', 'movies',
 'How do you want to feel while watching?',
 'The emotional journey matters as much as the story',
 '[{"id":"intense","text":"Gripped & on edge","emoji":"😰","examples":"Thrillers, psychological dramas, intense action"},{"id":"uplifting","text":"Happy & inspired","emoji":"😊","examples":"Feel-good movies, comedies, uplifting stories"},{"id":"contemplative","text":"Thoughtful & reflective","emoji":"🤔","examples":"Character studies, philosophical films, quiet dramas"},{"id":"escapist","text":"Transported to another world","emoji":"🌟","examples":"Fantasy, sci-fi adventures, epic stories"}]',
 2,
 '{"intense":{"darkness":0.8,"suspense":0.9,"comfort":0.1},"uplifting":{"darkness":0.1,"humor":0.8,"comfort":0.9},"contemplative":{"depth":0.9,"pacing_slow":0.7,"artistic":0.8},"escapist":{"fantasy":0.8,"spectacle":0.9,"world_building":0.8}}',
 FALSE),

-- Question 3: Personal Context
('personal_context', 'movies',
 'What resonates with where you are in life right now?',
 'Movies hit differently depending on our current situation',
 '[{"id":"exploring","text":"Figuring things out","emoji":"🧭","examples":"Coming-of-age, self-discovery, finding purpose"},{"id":"building","text":"Building something meaningful","emoji":"🏗️","examples":"Ambition, career challenges, relationships"},{"id":"reflecting","text":"Looking back & understanding","emoji":"🪞","examples":"Life lessons, wisdom, understanding the past"},{"id":"escaping","text":"Need a break from reality","emoji":"🏝️","examples":"Pure fantasy, adventure, total escapism"}]',
 3,
 '{"exploring":{"coming_of_age":0.9,"self_discovery":0.8,"youth":0.7},"building":{"ambition":0.8,"professional":0.7,"relationships":0.6},"reflecting":{"wisdom":0.9,"nostalgia":0.7,"life_lessons":0.8},"escaping":{"fantasy":0.9,"adventure":0.8,"spectacle":0.7}}',
 TRUE),

-- Question 4: Attention Level
('attention_level', 'movies',
 'How much mental energy do you have right now?',
 'Some movies deserve full attention, others are perfect for relaxed viewing',
 '[{"id":"full_focus","text":"Ready for complete immersion","emoji":"🎯","examples":"Dense plots, subtitles, complex narratives"},{"id":"moderate","text":"Engaged but not overthinking","emoji":"👀","examples":"Clear story, some complexity, easy to follow"},{"id":"background","text":"Something I can partly multitask with","emoji":"📱","examples":"Familiar genres, predictable structure, comfort viewing"}]',
 4,
 '{"full_focus":{"complexity":0.9,"subtitles":0.8,"art_house":0.7},"moderate":{"complexity":0.5,"mainstream":0.6,"accessible":0.8},"background":{"complexity":0.2,"comfort":0.9,"familiar":0.8}}',
 FALSE),

-- Question 5: Discovery Mode
('discovery_mode', 'movies',
 'Are you feeling adventurous with your choice?',
 'Sometimes we want surprises, sometimes we want reliable satisfaction',
 '[{"id":"surprise","text":"Show me something unexpected","emoji":"🎲","examples":"Hidden gems, foreign films, unusual genres"},{"id":"reliable","text":"Something I know I''ll probably like","emoji":"✅","examples":"Popular choices, familiar genres, safe bets"}]',
 5,
 '{"surprise":{"popularity":0.2,"foreign":0.7,"unconventional":0.8},"reliable":{"popularity":0.8,"mainstream":0.9,"highly_rated":0.8}}',
 FALSE);

-- TV Series adaptations
INSERT INTO questions (id, domain, question_text, description, options, order_index, vector_weights, personal_context) VALUES

('tv_cognitive_load', 'tv-series',
 'What kind of mental engagement do you want?',
 'This helps us understand if you want something challenging or relaxing',
 '[{"id":"challenge","text":"Complex & layered storytelling","emoji":"🧠","examples":"Like Westworld, Dark, True Detective"},{"id":"easy","text":"Light & easy to follow","emoji":"🍿","examples":"Like sitcoms, procedurals, reality TV"}]',
 1,
 '{"challenge":{"complexity":0.8,"intellectual":0.9,"mainstream":0.2},"easy":{"complexity":0.2,"intellectual":0.1,"mainstream":0.8}}',
 FALSE),

('tv_attention_level', 'tv-series',
 'How much time do you want to invest?',
 'Some shows require long-term commitment, others are perfect for casual viewing',
 '[{"id":"full_focus","text":"Ready for a long-term commitment","emoji":"🎯","examples":"Multi-season epics, complex storylines"},{"id":"moderate","text":"A season or two is fine","emoji":"👀","examples":"Limited series, single season stories"},{"id":"background","text":"Something episodic I can dip in and out of","emoji":"📱","examples":"Sitcoms, procedurals, anthology series"}]',
 4,
 '{"full_focus":{"complexity":0.9,"commitment":0.9,"serialized":0.8},"moderate":{"complexity":0.5,"commitment":0.5,"serialized":0.5},"background":{"complexity":0.2,"commitment":0.2,"episodic":0.9}}',
 FALSE);

-- Documentaries adaptations
INSERT INTO questions (id, domain, question_text, description, options, order_index, vector_weights, personal_context) VALUES

('doc_emotional_tone', 'documentaries',
 'What kind of documentary experience do you want?',
 'Documentaries can inform, inspire, or provoke',
 '[{"id":"intense","text":"Eye-opening & provocative","emoji":"😰","examples":"True crime, exposés, social issues"},{"id":"uplifting","text":"Inspiring & hopeful","emoji":"😊","examples":"Human triumphs, nature, innovation"},{"id":"contemplative","text":"Educational & informative","emoji":"🤔","examples":"History, science, culture"},{"id":"escapist","text":"Fascinating & exotic","emoji":"🌟","examples":"Travel, wildlife, exploration"}]',
 2,
 '{"intense":{"serious":0.9,"investigative":0.8,"controversial":0.7},"uplifting":{"positive":0.9,"inspirational":0.8,"hopeful":0.8},"contemplative":{"educational":0.9,"historical":0.7,"scientific":0.8},"escapist":{"exotic":0.8,"nature":0.9,"adventure":0.7}}',
 FALSE);