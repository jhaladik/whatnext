#!/usr/bin/env node

// scripts/seed-kv.js
// Seeds KV namespaces with initial question data for fast access

import { exec } from 'child_process';
import { promisify } from 'util';
import { QUESTIONS_DATA } from './seed-database.js';

const execAsync = promisify(exec);

const QUESTION_OPTIONS = {
  'cognitive_engagement': [
    { id: 'challenge', text: 'Challenge my mind', emoji: '🧠' },
    { id: 'entertain', text: 'Entertain without effort', emoji: '🍿' }
  ],
  'learning_depth': [
    { id: 'new', text: 'Learn something completely new', emoji: '🌟' },
    { id: 'deeper', text: 'Go deeper into what I know', emoji: '🔍' }
  ],
  'content_format': [
    { id: 'video', text: 'Video content', emoji: '📺' },
    { id: 'text', text: 'Text-based content', emoji: '📖' }
  ],
  'time_commitment': [
    { id: 'quick', text: 'Something quick (under 20 min)', emoji: '⚡' },
    { id: 'substantial', text: 'Something substantial', emoji: '🏛️' }
  ],
  'engagement_type': [
    { id: 'interactive', text: 'Interactive and engaging', emoji: '🎮' },
    { id: 'passive', text: 'Passive and relaxing', emoji: '🛋️' }
  ],
  'novelty_preference': [
    { id: 'familiar', text: 'Familiar and comforting', emoji: '🏠' },
    { id: 'surprise', text: 'A pleasant surprise', emoji: '🎁' }
  ],
  'social_context': [
    { id: 'personal', text: 'Just for me', emoji: '👤' },
    { id: 'social', text: 'To share with others', emoji: '👥' }
  ],
  'mood_preference': [
    { id: 'uplifting', text: 'Something uplifting', emoji: '☀️' },
    { id: 'thoughtful', text: 'Something thought-provoking', emoji: '🤔' }
  ],
  'complexity_level': [
    { id: 'beginner', text: 'Beginner-friendly', emoji: '🌱' },
    { id: 'advanced', text: 'Advanced/Expert level', emoji: '🚀' }
  ],
  'practical_theoretical': [
    { id: 'practical', text: 'Practical how-to', emoji: '🔧' },
    { id: 'theoretical', text: 'Theoretical concepts', emoji: '📐' }
  ],
  'content_length': [
    { id: 'bite', text: 'Bite-sized content', emoji: '🍬' },
    { id: 'immersive', text: 'Longer immersive experience', emoji: '🌊' }
  ],
  'topic_preference': [
    { id: 'tech', text: 'Technology/Science', emoji: '💻' },
    { id: 'arts', text: 'Arts/Humanities', emoji: '🎨' }
  ],
  'visual_preference': [
    { id: 'visual', text: 'Highly visual', emoji: '👁️' },
    { id: 'ideas', text: 'Focus on ideas', emoji: '💭' }
  ],
  'creator_preference': [
    { id: 'established', text: 'Established experts', emoji: '🏆' },
    { id: 'emerging', text: 'Emerging voices', emoji: '🌟' }
  ],
  'interactivity_level': [
    { id: 'participate', text: 'Actively participate', emoji: '🙋' },
    { id: 'observe', text: 'Just observe', emoji: '👀' }
  ]
};

async function seedKV() {
  console.log('🌱 Starting KV namespace seed...\n');
  
  try {
    // Get the perfect question
    const perfectQuestion = QUESTIONS_DATA.find(q => q.type === 'perfect');
    
    if (perfectQuestion) {
      console.log('🎯 Seeding perfect question to KV...');
      
      const perfectQuestionData = {
        id: perfectQuestion.id,
        text: perfectQuestion.text,
        type: 'binary_choice',
        options: QUESTION_OPTIONS[perfectQuestion.id] || [],
        expectedInfoGain: perfectQuestion.expected_info_gain,
        category: perfectQuestion.category
      };
      
      // Put perfect question in KV
      const putCommand = `npx wrangler kv:key put --namespace-id=QUESTIONS "perfect_question" '${JSON.stringify(perfectQuestionData)}' --local`;
      
      try {
        await execAsync(putCommand);
        console.log('✅ Perfect question stored in KV');
      } catch (error) {
        console.log('⚠️  Could not store in KV (namespace might not be configured for local dev)');
      }
    }
    
    // Seed questions by category
    console.log('\n📂 Organizing questions by category...');
    const categories = {};
    
    QUESTIONS_DATA.forEach(q => {
      if (!categories[q.category]) {
        categories[q.category] = [];
      }
      
      categories[q.category].push({
        id: q.id,
        text: q.text,
        type: 'binary_choice',
        options: QUESTION_OPTIONS[q.id] || [
          { id: 'yes', text: 'Yes', emoji: '✅' },
          { id: 'no', text: 'No', emoji: '❌' }
        ],
        expectedInfoGain: q.expected_info_gain,
        category: q.category,
        questionType: q.type
      });
    });
    
    // Store each category
    for (const [category, questions] of Object.entries(categories)) {
      console.log(`  📁 Storing ${questions.length} questions for category: ${category}`);
      
      const key = `questions_by_category_${category}`;
      const value = JSON.stringify(questions);
      
      try {
        const putCommand = `npx wrangler kv:key put --namespace-id=QUESTIONS "${key}" '${value}' --local`;
        await execAsync(putCommand);
        console.log(`  ✅ Stored ${category} questions`);
      } catch (error) {
        console.log(`  ⚠️  Could not store ${category} questions in KV`);
      }
    }
    
    // Create question tree structure for optimization
    console.log('\n🌳 Building question tree structure...');
    const questionTree = {
      root: 'cognitive_engagement',
      branches: {
        challenge: {
          questions: ['learning_depth', 'content_format', 'time_commitment', 'complexity_level'],
          strategy: 'high_cognitive'
        },
        entertain: {
          questions: ['engagement_type', 'novelty_preference', 'social_context', 'mood_preference'],
          strategy: 'low_cognitive'
        }
      }
    };
    
    try {
      const treeCommand = `npx wrangler kv:key put --namespace-id=QUESTIONS "question_tree" '${JSON.stringify(questionTree)}' --local`;
      await execAsync(treeCommand);
      console.log('✅ Question tree structure stored');
    } catch (error) {
      console.log('⚠️  Could not store question tree in KV');
    }
    
    // Store question performance baseline
    console.log('\n📊 Setting baseline performance metrics...');
    const performanceBaseline = {};
    
    QUESTIONS_DATA.forEach(q => {
      performanceBaseline[q.id] = {
        expectedInfoGain: q.expected_info_gain,
        baselineScore: q.expected_info_gain,
        category: q.category,
        type: q.type
      };
    });
    
    try {
      const perfCommand = `npx wrangler kv:key put --namespace-id=QUESTIONS "performance_baseline" '${JSON.stringify(performanceBaseline)}' --local`;
      await execAsync(perfCommand);
      console.log('✅ Performance baseline stored');
    } catch (error) {
      console.log('⚠️  Could not store performance baseline in KV');
    }
    
    console.log('\n✨ KV namespace seed completed!');
    console.log('\n📋 Summary:');
    console.log('  - Perfect question cached');
    console.log(`  - ${Object.keys(categories).length} category groups created`);
    console.log('  - Question tree structure built');
    console.log('  - Performance baselines set');
    
    console.log('\n💡 Note: If KV operations failed, make sure to:');
    console.log('  1. Run "wrangler kv:namespace create QUESTIONS" first');
    console.log('  2. Update wrangler.toml with the namespace IDs');
    console.log('  3. For local development, use --local flag or preview IDs');
    
  } catch (error) {
    console.error('❌ Error seeding KV:', error);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedKV();
}

export { seedKV, QUESTION_OPTIONS };