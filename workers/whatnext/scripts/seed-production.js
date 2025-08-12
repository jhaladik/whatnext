#!/usr/bin/env node

// scripts/seed-production.js
// Seeds the remote production D1 database with initial questions and data

import { exec } from 'child_process';
import { promisify } from 'util';
import { QUESTIONS_DATA } from './seed-database.js';

const execAsync = promisify(exec);

async function seedProductionDatabase() {
  console.log('🌱 Starting PRODUCTION database seed...\n');
  console.log('⚠️  WARNING: This will modify the production database!\n');
  
  try {
    // Prepare SQL statements for questions
    console.log('🔧 Preparing question data for production...');
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
    const sqlFile = 'temp_seed_prod.sql';
    
    await fs.writeFile(sqlFile, questionInserts);
    
    // Execute the seed SQL on production
    console.log('💾 Inserting questions into PRODUCTION database...');
    const { stdout: seedOutput } = await execAsync(
      `npx wrangler d1 execute what-next-db --file=${sqlFile}`
    );
    console.log(seedOutput);
    
    // Clean up temp file
    await fs.unlink(sqlFile);
    
    // Verify the seed
    console.log('\n✅ Verifying seed data in production...');
    const { stdout: verifyOutput } = await execAsync(
      'npx wrangler d1 execute what-next-db --command="SELECT COUNT(*) as count FROM questions"'
    );
    console.log('Questions in production database:', verifyOutput);
    
    // Add some initial performance data
    console.log('📊 Adding initial performance metrics to production...');
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
    
    await fs.writeFile('temp_perf_prod.sql', perfInserts);
    await execAsync(`npx wrangler d1 execute what-next-db --file=temp_perf_prod.sql`);
    await fs.unlink('temp_perf_prod.sql');
    
    console.log('\n✨ Production database seed completed successfully!');
    console.log(`📝 Seeded ${QUESTIONS_DATA.length} questions to production`);
    
    // Print summary
    console.log('\n📋 Question Summary:');
    console.log('  - Perfect questions:', QUESTIONS_DATA.filter(q => q.type === 'perfect').length);
    console.log('  - Followup questions:', QUESTIONS_DATA.filter(q => q.type === 'followup').length);
    console.log('  - Contextual questions:', QUESTIONS_DATA.filter(q => q.type === 'contextual').length);
    
  } catch (error) {
    console.error('❌ Error seeding production database:', error);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedProductionDatabase();
}

export { seedProductionDatabase };