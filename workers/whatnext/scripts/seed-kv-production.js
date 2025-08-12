#!/usr/bin/env node

// scripts/seed-kv-production.js
// Seeds production KV namespaces with initial question data

import { exec } from 'child_process';
import { promisify } from 'util';
import { QUESTIONS_DATA } from './seed-database.js';
import { QUESTION_OPTIONS } from './seed-kv.js';

const execAsync = promisify(exec);

async function seedProductionKV() {
  console.log('🌱 Starting PRODUCTION KV namespace seed...\n');
  
  try {
    // Get the perfect question
    const perfectQuestion = QUESTIONS_DATA.find(q => q.type === 'perfect');
    
    if (perfectQuestion) {
      console.log('🎯 Seeding perfect question to production KV...');
      
      const perfectQuestionData = {
        id: perfectQuestion.id,
        text: perfectQuestion.text,
        type: 'binary_choice',
        options: QUESTION_OPTIONS[perfectQuestion.id] || [],
        expectedInfoGain: perfectQuestion.expected_info_gain,
        category: perfectQuestion.category
      };
      
      // Put perfect question in production KV
      const putCommand = `npx wrangler kv:key put --namespace-id=7d3f43412f164f408947c132c92bacee "perfect_question" '${JSON.stringify(perfectQuestionData)}'`;
      
      try {
        const { stdout } = await execAsync(putCommand);
        console.log('✅ Perfect question stored in production KV');
        console.log(stdout);
      } catch (error) {
        console.log('Error storing perfect question:', error.message);
      }
    }
    
    // Seed questions by category
    console.log('\n📂 Organizing questions by category for production...');
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
    
    // Store each category in production
    for (const [category, questions] of Object.entries(categories)) {
      console.log(`  📁 Storing ${questions.length} questions for category: ${category}`);
      
      const key = `questions_by_category_${category}`;
      const value = JSON.stringify(questions);
      
      try {
        const putCommand = `npx wrangler kv:key put --namespace-id=7d3f43412f164f408947c132c92bacee "${key}" '${value.replace(/'/g, "\\'")}'`;
        const { stdout } = await execAsync(putCommand);
        console.log(`  ✅ Stored ${category} questions in production`);
      } catch (error) {
        console.log(`  ❌ Error storing ${category} questions:`, error.message);
      }
    }
    
    // Create question tree structure for optimization
    console.log('\n🌳 Building question tree structure for production...');
    const questionTree = {
      root: 'cognitive_engagement',
      branches: {
        challenge: {
          questions: ['learning_depth', 'content_format', 'time_commitment', 'complexity_level', 'practical_theoretical'],
          strategy: 'high_cognitive'
        },
        entertain: {
          questions: ['engagement_type', 'novelty_preference', 'social_context', 'mood_preference', 'content_length'],
          strategy: 'low_cognitive'
        }
      }
    };
    
    try {
      const treeCommand = `npx wrangler kv:key put --namespace-id=7d3f43412f164f408947c132c92bacee "question_tree" '${JSON.stringify(questionTree)}'`;
      const { stdout } = await execAsync(treeCommand);
      console.log('✅ Question tree structure stored in production');
    } catch (error) {
      console.log('❌ Error storing question tree:', error.message);
    }
    
    // Store question performance baseline
    console.log('\n📊 Setting baseline performance metrics in production...');
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
      const perfCommand = `npx wrangler kv:key put --namespace-id=7d3f43412f164f408947c132c92bacee "performance_baseline" '${JSON.stringify(performanceBaseline)}'`;
      const { stdout } = await execAsync(perfCommand);
      console.log('✅ Performance baseline stored in production');
    } catch (error) {
      console.log('❌ Error storing performance baseline:', error.message);
    }
    
    console.log('\n✨ Production KV namespace seed completed!');
    console.log('\n📋 Summary:');
    console.log('  - Perfect question cached');
    console.log(`  - ${Object.keys(categories).length} category groups created`);
    console.log('  - Question tree structure built');
    console.log('  - Performance baselines set');
    
  } catch (error) {
    console.error('❌ Error seeding production KV:', error);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedProductionKV();
}

export { seedProductionKV };