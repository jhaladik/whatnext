#!/usr/bin/env node

// scripts/build.js
// Build script for the What Next worker

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

async function build() {
  console.log('🔨 Building What Next Worker...\n');
  
  const startTime = Date.now();
  
  try {
    // Check for required files
    console.log('📋 Checking prerequisites...');
    const requiredFiles = [
      'wrangler.toml',
      'package.json',
      'src/index.js'
    ];
    
    for (const file of requiredFiles) {
      try {
        await fs.access(file);
        console.log(`  ✅ ${file} found`);
      } catch {
        console.error(`  ❌ Missing required file: ${file}`);
        process.exit(1);
      }
    }
    
    // Clean previous build artifacts
    console.log('\n🧹 Cleaning previous build...');
    try {
      await fs.rm('dist', { recursive: true, force: true });
      console.log('  ✅ Cleaned dist directory');
    } catch (error) {
      console.log('  ℹ️  No previous build to clean');
    }
    
    // Install dependencies if needed
    console.log('\n📦 Checking dependencies...');
    try {
      await fs.access('node_modules');
      console.log('  ✅ Dependencies already installed');
    } catch {
      console.log('  📥 Installing dependencies...');
      const { stdout } = await execAsync('npm install');
      console.log(stdout);
    }
    
    // Run linter
    console.log('\n🔍 Running linter...');
    try {
      const { stdout } = await execAsync('npm run lint');
      console.log('  ✅ Linting passed');
    } catch (error) {
      console.warn('  ⚠️  Linting issues found (continuing build):');
      console.warn(error.stdout);
    }
    
    // Validate environment variables in wrangler.toml
    console.log('\n🔐 Validating configuration...');
    const wranglerConfig = await fs.readFile('wrangler.toml', 'utf-8');
    
    const requiredBindings = [
      'DB',
      'QUESTIONS',
      'USER_SESSIONS',
      'RECOMMENDATION_CACHE'
    ];
    
    for (const binding of requiredBindings) {
      if (!wranglerConfig.includes(binding)) {
        console.warn(`  ⚠️  Missing binding: ${binding}`);
      } else {
        console.log(`  ✅ Binding found: ${binding}`);
      }
    }
    
    // Check for secrets reminder
    console.log('\n🔑 Required secrets (set with wrangler secret put):');
    console.log('  - CLAUDE_API_KEY');
    console.log('  - ANALYTICS_SECRET (optional)');
    
    // Bundle the worker
    console.log('\n📦 Bundling worker...');
    
    // Create dist directory
    await fs.mkdir('dist', { recursive: true });
    
    // Copy source files to dist (for debugging)
    console.log('  📂 Copying source files...');
    await copyDir('src', 'dist/src');
    
    // Generate build info
    const buildInfo = {
      version: '1.0.0',
      buildTime: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version
    };
    
    await fs.writeFile(
      'dist/build-info.json',
      JSON.stringify(buildInfo, null, 2)
    );
    console.log('  ✅ Build info generated');
    
    // Validate worker with Wrangler
    console.log('\n✅ Validating worker with Wrangler...');
    try {
      const { stdout } = await execAsync('npx wrangler deploy --dry-run');
      console.log('  ✅ Worker validation passed');
    } catch (error) {
      console.error('  ❌ Worker validation failed:');
      console.error(error.stdout || error.stderr);
      process.exit(1);
    }
    
    // Generate deployment instructions
    console.log('\n📝 Generating deployment instructions...');
    const deployInstructions = `
# Deployment Instructions

## Prerequisites
1. Ensure all secrets are set:
   - wrangler secret put CLAUDE_API_KEY
   - wrangler secret put ANALYTICS_SECRET

2. Create D1 database:
   - wrangler d1 create what-next-db
   - Update database_id in wrangler.toml

3. Create KV namespaces:
   - wrangler kv:namespace create "QUESTIONS"
   - wrangler kv:namespace create "USER_SESSIONS"
   - wrangler kv:namespace create "RECOMMENDATION_CACHE"
   - Update namespace IDs in wrangler.toml

## Deploy to Staging
\`\`\`bash
npm run deploy:staging
\`\`\`

## Deploy to Production
\`\`\`bash
npm run deploy:production
\`\`\`

## Post-Deployment
1. Run database migrations:
   - npm run db:migrate:remote

2. Seed initial data:
   - npm run db:seed
   - npm run kv:seed

3. Verify deployment:
   - curl https://your-worker.workers.dev/
`;
    
    await fs.writeFile('dist/DEPLOY.md', deployInstructions);
    console.log('  ✅ Deployment instructions created');
    
    const endTime = Date.now();
    const buildTime = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n✨ Build completed successfully!');
    console.log(`⏱️  Build time: ${buildTime}s`);
    console.log('\n📦 Build artifacts in ./dist/');
    console.log('\n🚀 Next steps:');
    console.log('  1. Review dist/DEPLOY.md for deployment instructions');
    console.log('  2. Run "npm run deploy:staging" to deploy to staging');
    console.log('  3. Run "npm test" to run tests');
    
  } catch (error) {
    console.error('\n❌ Build failed:', error);
    process.exit(1);
  }
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  build();
}

export { build };