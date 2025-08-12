#!/usr/bin/env node

// scripts/apply-domain-migrations.js
// Apply domain migrations and seed movie questions

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function applyDomainMigrations() {
  console.log('🎬 Applying Domain Support Migrations\n');
  
  const isProduction = process.argv.includes('--production');
  const dbFlag = isProduction ? '' : '--local';
  const dbName = 'what-next-db';
  
  try {
    // Step 1: Apply domain support migration
    console.log('1️⃣ Applying domain support schema...');
    const migration2Path = path.join(__dirname, '..', 'migrations', '0002_add_domain_support.sql');
    
    try {
      const { stdout: migrate2Output } = await execAsync(
        `npx wrangler d1 execute ${dbName} ${dbFlag} --file="${migration2Path}"`
      );
      console.log('Domain support schema applied successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('Domain tables already exist, skipping...');
      } else {
        throw error;
      }
    }
    
    // Step 2: Apply movie questions migration
    console.log('\n2️⃣ Adding movie-specific questions...');
    const migration3Path = path.join(__dirname, '..', 'migrations', '0003_add_movie_questions.sql');
    
    try {
      const { stdout: migrate3Output } = await execAsync(
        `npx wrangler d1 execute ${dbName} ${dbFlag} --file="${migration3Path}"`
      );
      console.log('Movie questions added successfully');
    } catch (error) {
      if (error.message.includes('UNIQUE constraint')) {
        console.log('Movie questions already exist, skipping...');
      } else {
        throw error;
      }
    }
    
    // Step 3: Verify the migration
    console.log('\n3️⃣ Verifying migrations...');
    
    // Check domains table
    const { stdout: domainsCheck } = await execAsync(
      `npx wrangler d1 execute ${dbName} ${dbFlag} --command="SELECT COUNT(*) as count FROM domains"`
    );
    console.log('Domains table check:', domainsCheck.trim());
    
    // Check movie questions
    const { stdout: movieQuestionsCheck } = await execAsync(
      `npx wrangler d1 execute ${dbName} ${dbFlag} --command="SELECT COUNT(*) as count FROM questions WHERE domain = 'movies'"`
    );
    console.log('Movie questions check:', movieQuestionsCheck.trim());
    
    // List some movie questions
    const { stdout: sampleQuestions } = await execAsync(
      `npx wrangler d1 execute ${dbName} ${dbFlag} --command="SELECT id, question_text FROM questions WHERE domain = 'movies' LIMIT 5"`
    );
    console.log('\n📋 Sample movie questions:');
    console.log(sampleQuestions);
    
    // Step 4: Show available domains
    const { stdout: availableDomains } = await execAsync(
      `npx wrangler d1 execute ${dbName} ${dbFlag} --command="SELECT id, name, is_active FROM domains"`
    );
    console.log('\n🌐 Available domains:');
    console.log(availableDomains);
    
    console.log('\n✨ Domain migrations applied successfully!');
    
    if (!isProduction) {
      console.log('\n💡 To apply to production, run: npm run apply-domain-migrations -- --production');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  applyDomainMigrations();
}

export { applyDomainMigrations };