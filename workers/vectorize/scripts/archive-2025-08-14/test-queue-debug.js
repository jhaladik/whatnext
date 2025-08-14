#!/usr/bin/env node

/**
 * Debug Queue Test - Find the exact error
 */

const WORKER_URL = 'https://whatnext-vectorize.jhaladik.workers.dev';
const ADMIN_KEY = 'UgWKZLhjrD9ngI4I3hj1G0nd6YQJLG4X';

async function testQueueDebug() {
  console.log('='.repeat(70));
  console.log('🔍 QUEUE DEBUG TEST');
  console.log('='.repeat(70));
  
  // First, let's test adding to queue with a single movie
  console.log('\n1️⃣ Testing add-to-queue with single movie...');
  
  try {
    const addResponse = await fetch(`${WORKER_URL}/add-to-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        movieIds: [238], // Just The Godfather
        adminKey: ADMIN_KEY,
        priority: 100
      })
    });
    
    const addText = await addResponse.text();
    console.log(`   Status: ${addResponse.status}`);
    
    if (addResponse.ok) {
      const addResult = JSON.parse(addText);
      console.log(`   ✅ Success:`, addResult);
    } else {
      console.log(`   ❌ Error response:`, addText.substring(0, 500));
    }
    
  } catch (error) {
    console.log(`   ❌ Network error:`, error.message);
  }
  
  // Now test the process-queue endpoint with minimal parameters
  console.log('\n2️⃣ Testing process-queue with minimal params...');
  
  try {
    const processResponse = await fetch(`${WORKER_URL}/process-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminKey: ADMIN_KEY,
        batchSize: 1,
        maxMovies: 1
      })
    });
    
    const processText = await processResponse.text();
    console.log(`   Status: ${processResponse.status}`);
    
    if (processResponse.ok) {
      const processResult = JSON.parse(processText);
      console.log(`   ✅ Success:`, processResult);
    } else {
      // Check if it's HTML error page
      if (processText.includes('Worker threw exception')) {
        console.log(`   ❌ Worker exception detected`);
        
        // Extract Ray ID for debugging
        const rayIdMatch = processText.match(/Ray ID: ([a-f0-9]+)/);
        if (rayIdMatch) {
          console.log(`   📍 Ray ID: ${rayIdMatch[1]}`);
          console.log(`   💡 Check logs with: npx wrangler tail --search ${rayIdMatch[1]}`);
        }
      } else {
        console.log(`   ❌ Error response:`, processText.substring(0, 500));
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Network error:`, error.message);
  }
  
  // Test the /stats endpoint to verify worker is running
  console.log('\n3️⃣ Testing /stats endpoint (sanity check)...');
  
  try {
    const statsResponse = await fetch(`${WORKER_URL}/stats`);
    const stats = await statsResponse.json();
    console.log(`   ✅ Stats work - Queue: ${stats.queue.pending} pending`);
  } catch (error) {
    console.log(`   ❌ Stats failed:`, error.message);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('💡 ANALYSIS');
  console.log('='.repeat(70));
  console.log('\nThe issue is likely one of:');
  console.log('1. Dynamic SQL binding with IN clause doesn\'t work in D1');
  console.log('2. The processing_queue table might be missing columns');
  console.log('3. Complex LEFT JOIN might be failing in D1');
  console.log('4. Worker is hitting memory/CPU limits');
  console.log('\nTo fix this, we should:');
  console.log('1. Use simpler SQL queries without dynamic IN clauses');
  console.log('2. Process one movie at a time to avoid batching issues');
  console.log('3. Consider using Cloudflare Queues instead of D1 for queue management');
}

testQueueDebug().catch(console.error);