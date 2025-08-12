#!/usr/bin/env node

// scripts/debug-questions.js
// Debug question retrieval from production database

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function debugQuestions() {
  console.log('🔍 Debugging Question Retrieval\n');
  
  try {
    // Test 1: Check all questions in database
    console.log('1️⃣ All questions in production database:');
    const { stdout: allQuestions } = await execAsync(
      `npx wrangler d1 execute what-next-db --remote --command="SELECT id, question_type, category FROM questions WHERE is_active = 1"`
    );
    console.log(allQuestions);
    
    // Test 2: Check follow-up questions for high cognitive path
    console.log('\n2️⃣ Follow-up questions for HIGH cognitive path:');
    const { stdout: highCognitive } = await execAsync(
      `npx wrangler d1 execute what-next-db --remote --command="SELECT id, question_text, category, expected_info_gain FROM questions WHERE question_type = 'followup' AND category IN ('learning', 'format', 'complexity') AND is_active = 1"`
    );
    console.log(highCognitive);
    
    // Test 3: Check follow-up questions for low cognitive path  
    console.log('\n3️⃣ Follow-up questions for LOW cognitive path:');
    const { stdout: lowCognitive } = await execAsync(
      `npx wrangler d1 execute what-next-db --remote --command="SELECT id, question_text, category, expected_info_gain FROM questions WHERE question_type = 'followup' AND category IN ('engagement', 'novelty', 'social', 'time') AND is_active = 1"`
    );
    console.log(lowCognitive);
    
    // Test 4: Check question_performance table
    console.log('\n4️⃣ Question performance records:');
    const { stdout: performance } = await execAsync(
      `npx wrangler d1 execute what-next-db --remote --command="SELECT question_id, avg_info_gain FROM question_performance LIMIT 5"`
    );
    console.log(performance);
    
    // Test 5: Simulate the exact query that would run
    console.log('\n5️⃣ Simulating query after choosing "challenge":');
    const excludeIds = ['cognitive_engagement'];
    const placeholders = excludeIds.map(() => "'cognitive_engagement'").join(',');
    const query = `SELECT * FROM questions WHERE question_type = 'followup' AND is_active = 1 AND category IN ('learning', 'format', 'complexity') AND id NOT IN (${placeholders}) ORDER BY expected_info_gain DESC, usage_count ASC LIMIT 5`;
    
    console.log('Query:', query);
    const { stdout: simulatedQuery } = await execAsync(
      `npx wrangler d1 execute what-next-db --remote --command="${query}"`
    );
    console.log(simulatedQuery);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

// Run debug
debugQuestions();