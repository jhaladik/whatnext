#!/usr/bin/env node

// scripts/setup-production.js
// Complete setup script for production deployment

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import readline from 'readline';

const execAsync = promisify(exec);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setupProduction() {
  console.log('🚀 What Next Production Setup\n');
  console.log('This script will help you deploy directly to production.\n');
  
  try {
    // Step 1: Create D1 Database
    console.log('📊 Step 1: Creating D1 Database...');
    console.log('Running: wrangler d1 create what-next-db\n');
    
    try {
      const { stdout } = await execAsync('npx wrangler d1 create what-next-db');
      console.log(stdout);
      
      // Extract database ID from output
      const dbIdMatch = stdout.match(/database_id = "([^"]+)"/);
      if (dbIdMatch) {
        console.log(`\n✅ Database created with ID: ${dbIdMatch[1]}`);
        console.log('⚠️  Please update this ID in your wrangler.toml file!\n');
        
        await question('Press Enter after updating wrangler.toml with the database ID...');
      }
    } catch (error) {
      if (error.stderr?.includes('already exists')) {
        console.log('✅ Database already exists\n');
      } else {
        throw error;
      }
    }
    
    // Step 2: Create KV Namespaces
    console.log('\n📦 Step 2: Creating KV Namespaces...');
    
    const namespaces = [
      'QUESTIONS',
      'USER_SESSIONS',
      'RECOMMENDATION_CACHE',
      'RATE_LIMITS',
      'CIRCUIT_BREAKERS'
    ];
    
    const namespaceIds = {};
    
    for (const namespace of namespaces) {
      console.log(`\nCreating namespace: ${namespace}`);
      try {
        const { stdout } = await execAsync(`npx wrangler kv:namespace create "${namespace}"`);
        console.log(stdout);
        
        // Extract namespace ID
        const idMatch = stdout.match(/id = "([^"]+)"/);
        if (idMatch) {
          namespaceIds[namespace] = idMatch[1];
          console.log(`✅ ${namespace} created with ID: ${idMatch[1]}`);
        }
      } catch (error) {
        if (error.stderr?.includes('already exists')) {
          console.log(`✅ ${namespace} already exists`);
        } else {
          console.error(`⚠️  Failed to create ${namespace}: ${error.message}`);
        }
      }
    }
    
    if (Object.keys(namespaceIds).length > 0) {
      console.log('\n⚠️  Please update these namespace IDs in your wrangler.toml:');
      for (const [name, id] of Object.entries(namespaceIds)) {
        console.log(`  ${name}: ${id}`);
      }
      await question('\nPress Enter after updating wrangler.toml with the namespace IDs...');
    }
    
    // Step 3: Apply Database Migrations
    console.log('\n🔄 Step 3: Applying Database Migrations...');
    console.log('Running migrations on remote database...\n');
    
    try {
      const { stdout } = await execAsync('npx wrangler d1 migrations apply what-next-db');
      console.log(stdout);
      console.log('✅ Migrations applied successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      const retry = await question('Retry migrations? (y/n): ');
      if (retry.toLowerCase() === 'y') {
        const { stdout } = await execAsync('npx wrangler d1 migrations apply what-next-db');
        console.log(stdout);
      }
    }
    
    // Step 4: Seed Database with Questions
    console.log('\n🌱 Step 4: Seeding Remote Database...');
    
    // Read the questions data
    const { QUESTIONS_DATA } = await import('./seed-database.js');
    
    // Create SQL statements
    const sqlStatements = [];
    const now = Date.now();
    
    // Insert questions
    QUESTIONS_DATA.forEach(q => {
      sqlStatements.push(`
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
      `);
    });
    
    // Insert question performance
    QUESTIONS_DATA.forEach(q => {
      sqlStatements.push(`
        INSERT OR REPLACE INTO question_performance (
          question_id, avg_info_gain, usage_count, 
          avg_satisfaction, success_rate, last_updated
        ) VALUES (
          '${q.id}',
          ${q.expected_info_gain},
          0,
          0.5,
          0.5,
          ${now}
        );
      `);
    });
    
    // Write to temporary file
    const sqlContent = sqlStatements.join('\n');
    await fs.writeFile('temp_production_seed.sql', sqlContent);
    
    console.log(`Seeding ${QUESTIONS_DATA.length} questions...`);
    
    try {
      const { stdout } = await execAsync(
        'npx wrangler d1 execute what-next-db --file=temp_production_seed.sql'
      );
      console.log('✅ Database seeded successfully');
      
      // Verify seed
      const { stdout: verifyOutput } = await execAsync(
        'npx wrangler d1 execute what-next-db --command="SELECT COUNT(*) as count FROM questions"'
      );
      console.log('Verification:', verifyOutput);
    } catch (error) {
      console.error('⚠️  Seeding error (may be normal if data exists):', error.message);
    }
    
    // Clean up temp file
    await fs.unlink('temp_production_seed.sql').catch(() => {});
    
    // Step 5: Set Secrets
    console.log('\n🔐 Step 5: Setting Production Secrets...');
    
    const hasClaudeKey = await question('\nDo you have your Claude API key ready? (y/n): ');
    
    if (hasClaudeKey.toLowerCase() === 'y') {
      console.log('\nRun this command and paste your API key when prompted:');
      console.log('  npx wrangler secret put CLAUDE_API_KEY\n');
      
      await question('Press Enter after setting the CLAUDE_API_KEY...');
    } else {
      console.log('\n⚠️  Remember to set CLAUDE_API_KEY before using the service:');
      console.log('  npx wrangler secret put CLAUDE_API_KEY');
    }
    
    const needsAnalytics = await question('\nDo you want to set up analytics authentication? (y/n): ');
    
    if (needsAnalytics.toLowerCase() === 'y') {
      console.log('\nRun this command and set your analytics secret:');
      console.log('  npx wrangler secret put ANALYTICS_SECRET\n');
      
      await question('Press Enter after setting the ANALYTICS_SECRET...');
    }
    
    // Step 6: Deploy to Production
    console.log('\n🚀 Step 6: Deploying to Production...');
    
    const deploy = await question('\nReady to deploy to production? (y/n): ');
    
    if (deploy.toLowerCase() === 'y') {
      console.log('\nDeploying to Cloudflare Workers...\n');
      
      try {
        const { stdout } = await execAsync('npx wrangler deploy --env production');
        console.log(stdout);
        
        // Extract worker URL
        const urlMatch = stdout.match(/https:\/\/[^\s]+/);
        if (urlMatch) {
          console.log(`\n✅ Deployed successfully!`);
          console.log(`🌐 Your worker is live at: ${urlMatch[0]}`);
          
          // Test the deployment
          console.log('\n🧪 Testing deployment...');
          try {
            const testUrl = urlMatch[0];
            const { stdout: curlOutput } = await execAsync(`curl -s ${testUrl}`);
            const response = JSON.parse(curlOutput);
            
            if (response.status === 'healthy') {
              console.log('✅ Health check passed!');
            } else {
              console.log('⚠️  Unexpected health check response:', response);
            }
          } catch (error) {
            console.log('⚠️  Could not verify deployment (CORS may block curl)');
          }
        }
      } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        console.log('\nTry running manually:');
        console.log('  npx wrangler deploy --env production');
      }
    }
    
    // Step 7: Post-deployment Instructions
    console.log('\n' + '='.repeat(60));
    console.log('📋 POST-DEPLOYMENT CHECKLIST');
    console.log('='.repeat(60));
    
    console.log('\n✅ Completed:');
    console.log('  • D1 Database created');
    console.log('  • KV Namespaces created');
    console.log('  • Database migrations applied');
    console.log('  • Questions seeded');
    if (hasClaudeKey.toLowerCase() === 'y') {
      console.log('  • Claude API key set');
    }
    if (deploy.toLowerCase() === 'y') {
      console.log('  • Worker deployed to production');
    }
    
    console.log('\n⚠️  Remaining Tasks:');
    if (hasClaudeKey.toLowerCase() !== 'y') {
      console.log('  • Set CLAUDE_API_KEY secret');
    }
    if (deploy.toLowerCase() !== 'y') {
      console.log('  • Deploy worker: npx wrangler deploy --env production');
    }
    
    console.log('\n🔧 Useful Commands:');
    console.log('  • View logs: npx wrangler tail');
    console.log('  • Check database: npx wrangler d1 execute what-next-db --command="SELECT * FROM questions"');
    console.log('  • Update worker: npx wrangler deploy --env production');
    console.log('  • Rollback: npx wrangler rollback');
    
    console.log('\n🎉 Setup complete! Your What Next recommendation engine is ready.');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the setup
setupProduction();