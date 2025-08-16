// src/services/momentCaptureService.js
export class MomentCaptureService {
  constructor(env) {
    this.env = env;
    
    // Different question sets for different moods/contexts
    this.questionSets = {
      standard: 5,     // Current 5 questions
      quick: 3,        // 3 question fast-track
      deep: 7,         // 7 questions for precision
      surprise: 4,     // Random creative questions
      visual: 1        // Single visual mood board selection
    };

    // Time-aware question variations
    this.timeAwareQuestions = {
      morning: {
        greeting: "Good morning! How are you starting your day?",
        energy: "What's your morning energy like?",
        options_modifier: "to kickstart your day"
      },
      afternoon: {
        greeting: "Good afternoon! How's your day going?",
        energy: "How's your afternoon energy?",
        options_modifier: "for your afternoon"
      },
      evening: {
        greeting: "Good evening! Ready to unwind?",
        energy: "How are you feeling this evening?",
        options_modifier: "for tonight"
      },
      lateNight: {
        greeting: "Late night viewing? Let's find something perfect.",
        energy: "Still up? What's your late-night mood?",
        options_modifier: "for late-night watching"
      }
    };

    // Creative question alternatives
    this.creativeQuestions = {
      metaphorical: {
        text: "If your current mood was weather, what would it be?",
        options: [
          { id: "sunny", text: "Bright sunshine", vector: { uplifting: 0.9, light: 0.8 } },
          { id: "cloudy", text: "Overcast sky", vector: { contemplative: 0.8, neutral: 0.7 } },
          { id: "stormy", text: "Thunder and lightning", vector: { intense: 0.9, dark: 0.8 } },
          { id: "misty", text: "Mysterious fog", vector: { mysterious: 0.9, atmospheric: 0.8 } }
        ]
      },
      color_based: {
        text: "Pick a color palette that resonates with you right now:",
        options: [
          { id: "warm", text: "Warm oranges and reds", vector: { energetic: 0.8, passionate: 0.9 } },
          { id: "cool", text: "Cool blues and greens", vector: { calm: 0.9, peaceful: 0.8 } },
          { id: "dark", text: "Deep blacks and grays", vector: { serious: 0.9, intense: 0.8 } },
          { id: "vibrant", text: "Bright rainbow colors", vector: { playful: 0.9, adventurous: 0.8 } }
        ]
      },
      scenario_based: {
        text: "Which scenario appeals to you most right now?",
        options: [
          { id: "cozy", text: "Wrapped in a blanket by a fireplace", vector: { comfort: 0.9, warm: 0.8 } },
          { id: "adventure", text: "Standing on a mountain peak", vector: { epic: 0.9, adventurous: 0.8 } },
          { id: "mystery", text: "Walking through a foggy city at night", vector: { noir: 0.9, mysterious: 0.8 } },
          { id: "party", text: "Dancing at a vibrant festival", vector: { energetic: 0.9, fun: 0.8 } }
        ]
      }
    };
  }

  /**
   * Get current context (time, day, season, etc.)
   */
  getCurrentContext() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const month = now.getMonth();
    
    // Determine time period
    let timeOfDay;
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'lateNight';
    
    // Determine day type
    const dayOfWeek = day === 0 || day === 6 ? 'weekend' : 
                      day === 5 ? 'friday' : 'weekday';
    
    // Determine season (Northern Hemisphere)
    let season;
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'fall';
    else season = 'winter';
    
    return {
      timeOfDay,
      dayOfWeek,
      season,
      hour,
      timestamp: now.toISOString()
    };
  }

  /**
   * Generate adaptive question flow based on context
   */
  async generateQuestionFlow(initialContext = {}, questionSetType = 'standard') {
    const context = { ...this.getCurrentContext(), ...initialContext };
    
    // Select question set based on type
    switch (questionSetType) {
      case 'quick':
        return this.generateQuickFlow(context);
      case 'deep':
        return this.generateDeepFlow(context);
      case 'surprise':
        return this.generateSurpriseFlow(context);
      case 'visual':
        return this.generateVisualFlow(context);
      default:
        return this.generateStandardFlow(context);
    }
  }

  /**
   * Generate standard 5-question flow with contextual variations
   */
  async generateStandardFlow(context) {
    const timeVariant = this.timeAwareQuestions[context.timeOfDay] || this.timeAwareQuestions.afternoon;
    
    return {
      greeting: timeVariant.greeting,
      questions: [
        {
          id: 'cognitive_load',
          text: `What kind of mental engagement do you want ${timeVariant.options_modifier}?`,
          type: 'standard',
          options: this.getContextualOptions('cognitive_load', context),
          weight: 0.35,
          order: 1
        },
        {
          id: 'emotional_tone',
          text: 'How do you want to feel while watching?',
          type: 'standard',
          options: this.getContextualOptions('emotional_tone', context),
          weight: 0.30,
          order: 2
        },
        {
          id: 'personal_context',
          text: 'What resonates with where you are in life right now?',
          type: 'personal',
          options: this.getContextualOptions('personal_context', context),
          weight: 0.20,
          order: 3
        },
        {
          id: 'attention_level',
          text: timeVariant.energy,
          type: 'energy',
          options: this.getContextualOptions('attention_level', context),
          weight: 0.10,
          order: 4
        },
        {
          id: 'discovery_mode',
          text: 'Are you feeling adventurous with your choice?',
          type: 'discovery',
          options: this.getContextualOptions('discovery_mode', context),
          weight: 0.05,
          order: 5
        }
      ],
      context,
      flowType: 'standard'
    };
  }

  /**
   * Generate quick 3-question flow for users in a hurry
   */
  async generateQuickFlow(context) {
    return {
      greeting: "Let's find something quickly!",
      questions: [
        {
          id: 'mood_check',
          text: 'Quick vibe check - what are you feeling?',
          type: 'quick',
          options: [
            { id: 'energetic', text: 'Pumped up', emoji: '⚡' },
            { id: 'chill', text: 'Relaxed', emoji: '😌' },
            { id: 'emotional', text: 'In my feels', emoji: '🥺' },
            { id: 'adventurous', text: 'Ready for anything', emoji: '🎲' }
          ],
          weight: 0.5,
          order: 1
        },
        {
          id: 'time_commitment',
          text: 'How much time do you have?',
          type: 'quick',
          options: [
            { id: 'short', text: 'Under 90 minutes', emoji: '⏱️' },
            { id: 'standard', text: 'About 2 hours', emoji: '🕐' },
            { id: 'long', text: 'All the time needed', emoji: '🌙' }
          ],
          weight: 0.3,
          order: 2
        },
        {
          id: 'surprise_me',
          text: 'Play it safe or take a chance?',
          type: 'quick',
          options: [
            { id: 'safe', text: 'Something reliable', emoji: '✅' },
            { id: 'surprise', text: 'Surprise me!', emoji: '🎁' }
          ],
          weight: 0.2,
          order: 3
        }
      ],
      context,
      flowType: 'quick'
    };
  }

  /**
   * Generate surprise flow with creative questions
   */
  async generateSurpriseFlow(context) {
    const creativeQuestionKeys = Object.keys(this.creativeQuestions);
    const selectedCreative = creativeQuestionKeys[Math.floor(Math.random() * creativeQuestionKeys.length)];
    const creativeQuestion = this.creativeQuestions[selectedCreative];
    
    return {
      greeting: "Let's try something different today!",
      questions: [
        {
          id: 'creative_mood',
          text: creativeQuestion.text,
          type: 'creative',
          options: creativeQuestion.options.map(opt => ({
            ...opt,
            emoji: this.getEmoji(opt.id)
          })),
          weight: 0.4,
          order: 1
        },
        {
          id: 'energy_animal',
          text: 'Which animal represents your energy right now?',
          type: 'creative',
          options: [
            { id: 'sloth', text: 'Sloth - slow and cozy', emoji: '🦥', vector: { slow: 0.9, comfort: 0.8 } },
            { id: 'cat', text: 'Cat - curious but comfortable', emoji: '🐱', vector: { curious: 0.7, comfort: 0.6 } },
            { id: 'eagle', text: 'Eagle - soaring high', emoji: '🦅', vector: { epic: 0.8, ambitious: 0.9 } },
            { id: 'dolphin', text: 'Dolphin - playful and social', emoji: '🐬', vector: { fun: 0.9, light: 0.8 } }
          ],
          weight: 0.3,
          order: 2
        },
        {
          id: 'story_preference',
          text: 'Complete this sentence: "I want a story that..."',
          type: 'creative',
          options: [
            { id: 'transforms', text: 'changes how I see the world', vector: { profound: 0.9, artistic: 0.8 } },
            { id: 'escapes', text: 'takes me far from here', vector: { escapist: 0.9, fantasy: 0.8 } },
            { id: 'connects', text: 'makes me feel less alone', vector: { emotional: 0.9, human: 0.8 } },
            { id: 'thrills', text: 'keeps me on the edge', vector: { suspense: 0.9, intense: 0.8 } }
          ],
          weight: 0.3,
          order: 3
        }
      ],
      context,
      flowType: 'surprise'
    };
  }

  /**
   * Generate visual mood board selection
   */
  async generateVisualFlow(context) {
    return {
      greeting: "Choose the image that speaks to you:",
      questions: [
        {
          id: 'visual_mood',
          text: 'Select your mood visually',
          type: 'visual',
          options: [
            {
              id: 'sunrise',
              image: '/images/moods/sunrise.jpg',
              alt: 'Peaceful sunrise over mountains',
              vector: { peaceful: 0.9, optimistic: 0.8, light: 0.7 }
            },
            {
              id: 'citynight',
              image: '/images/moods/citynight.jpg',
              alt: 'Neon-lit city at night',
              vector: { urban: 0.9, energetic: 0.8, noir: 0.7 }
            },
            {
              id: 'forest',
              image: '/images/moods/forest.jpg',
              alt: 'Misty forest path',
              vector: { mysterious: 0.9, natural: 0.8, contemplative: 0.7 }
            },
            {
              id: 'ocean',
              image: '/images/moods/ocean.jpg',
              alt: 'Vast ocean horizon',
              vector: { epic: 0.9, freedom: 0.8, adventure: 0.7 }
            },
            {
              id: 'cozy',
              image: '/images/moods/cozy.jpg',
              alt: 'Warm fireplace and books',
              vector: { comfort: 0.9, warm: 0.8, intimate: 0.7 }
            },
            {
              id: 'abstract',
              image: '/images/moods/abstract.jpg',
              alt: 'Colorful abstract art',
              vector: { artistic: 0.9, unconventional: 0.8, creative: 0.7 }
            }
          ],
          weight: 1.0,
          order: 1
        }
      ],
      context,
      flowType: 'visual'
    };
  }

  /**
   * Generate deep 7-question flow for maximum precision
   */
  async generateDeepFlow(context) {
    const standardFlow = await this.generateStandardFlow(context);
    
    // Add two additional precision questions
    const additionalQuestions = [
      {
        id: 'narrative_style',
        text: 'What kind of storytelling appeals to you?',
        type: 'deep',
        options: [
          { id: 'linear', text: 'Clear, straightforward narrative', vector: { conventional: 0.8, clear: 0.9 } },
          { id: 'complex', text: 'Layered, non-linear storytelling', vector: { complex: 0.9, artistic: 0.8 } },
          { id: 'character', text: 'Deep character studies', vector: { character_driven: 0.9, intimate: 0.8 } },
          { id: 'visual', text: 'Visual storytelling over dialogue', vector: { visual: 0.9, cinematic: 0.8 } }
        ],
        weight: 0.15,
        order: 6
      },
      {
        id: 'emotional_outcome',
        text: 'How do you want to feel after watching?',
        type: 'deep',
        options: [
          { id: 'inspired', text: 'Motivated and inspired', vector: { inspirational: 0.9, uplifting: 0.8 } },
          { id: 'thoughtful', text: 'Contemplative and reflective', vector: { thought_provoking: 0.9, deep: 0.8 } },
          { id: 'satisfied', text: 'Entertained and satisfied', vector: { satisfying: 0.9, complete: 0.8 } },
          { id: 'shaken', text: 'Emotionally moved or shaken', vector: { powerful: 0.9, emotional: 0.8 } }
        ],
        weight: 0.15,
        order: 7
      }
    ];
    
    return {
      ...standardFlow,
      questions: [...standardFlow.questions, ...additionalQuestions],
      flowType: 'deep'
    };
  }

  /**
   * Get contextual options for a question based on time/context
   */
  getContextualOptions(questionId, context) {
    // Late night adjustments
    if (context.timeOfDay === 'lateNight' && questionId === 'attention_level') {
      return [
        { id: 'full_focus', text: 'Still wide awake', emoji: '👁️' },
        { id: 'moderate', text: 'Getting sleepy but engaged', emoji: '😴' },
        { id: 'background', text: 'Need something to drift off to', emoji: '💤' }
      ];
    }
    
    // Weekend adjustments
    if (context.dayOfWeek === 'weekend' && questionId === 'discovery_mode') {
      return [
        { id: 'surprise', text: 'Weekend adventure mode!', emoji: '🎒' },
        { id: 'reliable', text: 'Weekend comfort viewing', emoji: '🛋️' }
      ];
    }
    
    // Return standard options (would be loaded from database)
    return this.getStandardOptions(questionId);
  }

  /**
   * Get standard options for a question
   */
  getStandardOptions(questionId) {
    // This would normally load from database
    const standardOptions = {
      cognitive_load: [
        { id: 'challenge', text: 'Mind-bending & thought-provoking', emoji: '🧠' },
        { id: 'easy', text: 'Easy entertainment & fun', emoji: '🍿' }
      ],
      emotional_tone: [
        { id: 'intense', text: 'Gripped & on edge', emoji: '😰' },
        { id: 'uplifting', text: 'Happy & inspired', emoji: '😊' },
        { id: 'contemplative', text: 'Thoughtful & reflective', emoji: '🤔' },
        { id: 'escapist', text: 'Transported to another world', emoji: '🌟' }
      ],
      personal_context: [
        { id: 'exploring', text: 'Figuring things out', emoji: '🧭' },
        { id: 'building', text: 'Building something meaningful', emoji: '🏗️' },
        { id: 'reflecting', text: 'Looking back & understanding', emoji: '🪞' },
        { id: 'escaping', text: 'Need a break from reality', emoji: '🏝️' }
      ],
      attention_level: [
        { id: 'full_focus', text: 'Ready for complete immersion', emoji: '🎯' },
        { id: 'moderate', text: 'Engaged but not overthinking', emoji: '👀' },
        { id: 'background', text: 'Something I can partly multitask with', emoji: '📱' }
      ],
      discovery_mode: [
        { id: 'surprise', text: 'Show me something unexpected', emoji: '🎲' },
        { id: 'reliable', text: 'Something I know I\'ll probably like', emoji: '✅' }
      ]
    };
    
    return standardOptions[questionId] || [];
  }

  /**
   * Get emoji for creative options
   */
  getEmoji(id) {
    const emojiMap = {
      sunny: '☀️',
      cloudy: '☁️',
      stormy: '⛈️',
      misty: '🌫️',
      warm: '🔥',
      cool: '❄️',
      dark: '🌑',
      vibrant: '🌈',
      cozy: '🔥',
      adventure: '⛰️',
      mystery: '🌃',
      party: '🎉'
    };
    
    return emojiMap[id] || '🎬';
  }

  /**
   * Personalize questions based on previous answers
   */
  personalizeQuestions(questions, previousAnswers = {}) {
    // Adjust question text based on previous answers
    if (previousAnswers.cognitive_load === 'easy' && questions.find(q => q.id === 'emotional_tone')) {
      const emotionalQuestion = questions.find(q => q.id === 'emotional_tone');
      emotionalQuestion.text = 'What kind of fun are you looking for?';
    }
    
    if (previousAnswers.emotional_tone === 'intense' && questions.find(q => q.id === 'attention_level')) {
      const attentionQuestion = questions.find(q => q.id === 'attention_level');
      attentionQuestion.text = 'Ready for something intense?';
    }
    
    return questions;
  }
}