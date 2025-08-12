#!/usr/bin/env node

// scripts/seed-database.js
// Seeds the D1 database with initial questions and data

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const QUESTIONS_DATA = [
  // Perfect question - maximally bisects preference space
  {
    id: 'cognitive_engagement',
    text: 'Do you want something that challenges your mind or entertains without effort?',
    type: 'perfect',
    category: 'cognitive',
    expected_info_gain: 0.92
  },
  
  // High cognitive load branch questions
  {
    id: 'learning_depth',
    text: 'Do you want to learn something completely new or go deeper into what you know?',
    type: 'followup',
    category: 'learning',
    expected_info_gain: 0.85
  },
  {
    id: 'content_format',
    text: 'Do you prefer video content or text-based content?',
    type: 'followup',
    category: 'format',
    expected_info_gain: 0.78
  },
  {
    id: 'time_commitment',
    text: 'Are you looking for something quick (under 20 minutes) or something substantial?',
    type: 'followup',
    category: 'time',
    expected_info_gain: 0.81
  },
  {
    id: 'complexity_level',
    text: 'Do you want beginner-friendly content or advanced/expert level?',
    type: 'followup',
    category: 'complexity',
    expected_info_gain: 0.76
  },
  {
    id: 'practical_theoretical',
    text: 'Do you prefer practical how-to content or theoretical concepts?',
    type: 'followup',
    category: 'learning',
    expected_info_gain: 0.73
  },
  
  // Low cognitive load branch questions
  {
    id: 'engagement_type',
    text: 'Do you want something interactive and engaging or passive and relaxing?',
    type: 'followup',
    category: 'engagement',
    expected_info_gain: 0.83
  },
  {
    id: 'novelty_preference',
    text: 'Do you want something familiar and comforting or a pleasant surprise?',
    type: 'followup',
    category: 'novelty',
    expected_info_gain: 0.79
  },
  {
    id: 'social_context',
    text: 'Is this just for you or something to share/discuss with others?',
    type: 'followup',
    category: 'social',
    expected_info_gain: 0.74
  },
  {
    id: 'mood_preference',
    text: 'Are you in the mood for something uplifting or something thought-provoking?',
    type: 'followup',
    category: 'mood',
    expected_info_gain: 0.71
  },
  {
    id: 'content_length',
    text: 'Do you prefer bite-sized content or longer immersive experiences?',
    type: 'followup',
    category: 'time',
    expected_info_gain: 0.77
  },
  
  // Contextual questions (can appear in either branch)
  {
    id: 'topic_preference',
    text: 'Are you more interested in technology/science or arts/humanities?',
    type: 'contextual',
    category: 'topic',
    expected_info_gain: 0.68
  },
  {
    id: 'visual_preference',
    text: 'Do you prefer highly visual content or content focused on ideas?',
    type: 'contextual',
    category: 'format',
    expected_info_gain: 0.65
  },
  {
    id: 'creator_preference',
    text: 'Do you prefer content from established experts or emerging voices?',
    type: 'contextual',
    category: 'source',
    expected_info_gain: 0.62
  },
  {
    id: 'interactivity_level',
    text: 'Do you want to actively participate or just observe?',
    type: 'contextual',
    category: 'engagement',
    expected_info_gain: 0.70
  }
];

async function seedDatabase() {
  console.log('🌱 Starting database seed...\n');
  
  try {
    // First, apply migrations if not already applied
    console.log('📦 Applying migrations...');
    const { stdout: migrationOutput } = await execAsync('npx wrangler d1 migrations apply what-next-db --local');
    console.log(migrationOutput);
    
    // Prepare SQL statements for questions
    console.log('🔧 Preparing question data...');
    const questionInserts = QUESTIONS_DATA.map(q => {
      const now = Date.now();
      return `
        INSERT OR REPLACE INTO questions (
          id, question_text, question_type, category, 
          expected_info_gain, is_active, created_at, updated_at
        ) VALUES (
          '${q.id}',
          '${q.text.replace(/'/g, "''")}',
          '${q.type}',
          '${q.category}',
          ${q.expected_info_gain},
          1,
          ${now},
          ${now}
        );
      `;
    }).join('\n');
    
    // Create a temporary SQL file
    const fs = await import('fs').then(m => m.promises);
    const sqlFile = 'temp_seed.sql';
    
    await fs.writeFile(sqlFile, questionInserts);
    
    // Execute the seed SQL
    console.log('💾 Inserting questions into database...');
    const { stdout: seedOutput } = await execAsync(
      `npx wrangler d1 execute what-next-db --local --file=${sqlFile}`
    );
    console.log(seedOutput);
    
    // Clean up temp file
    await fs.unlink(sqlFile);
    
    // Verify the seed
    console.log('\n✅ Verifying seed data...');
    const { stdout: verifyOutput } = await execAsync(
      'npx wrangler d1 execute what-next-db --local --command="SELECT COUNT(*) as count FROM questions"'
    );
    console.log('Questions in database:', verifyOutput);
    
    // Add some initial performance data
    console.log('📊 Adding initial performance metrics...');
    const perfInserts = QUESTIONS_DATA.map(q => `
      INSERT OR REPLACE INTO question_performance (
        question_id, avg_info_gain, usage_count, 
        avg_satisfaction, success_rate, last_updated
      ) VALUES (
        '${q.id}',
        ${q.expected_info_gain},
        0,
        0.5,
        0.5,
        ${Date.now()}
      );
    `).join('\n');
    
    await fs.writeFile('temp_perf.sql', perfInserts);
    await execAsync(`npx wrangler d1 execute what-next-db --local --file=temp_perf.sql`);
    await fs.unlink('temp_perf.sql');
    
    console.log('\n✨ Database seed completed successfully!');
    console.log(`📝 Seeded ${QUESTIONS_DATA.length} questions`);
    
    // Print summary
    console.log('\n📋 Question Summary:');
    console.log('  - Perfect questions:', QUESTIONS_DATA.filter(q => q.type === 'perfect').length);
    console.log('  - Followup questions:', QUESTIONS_DATA.filter(q => q.type === 'followup').length);
    console.log('  - Contextual questions:', QUESTIONS_DATA.filter(q => q.type === 'contextual').length);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedDatabase();
}

export { seedDatabase, QUESTIONS_DATA };