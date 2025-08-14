#!/usr/bin/env node

/**
 * Clear the processing queue
 */

const WORKER_URL = 'https://whatnext-vectorize.jhaladik.workers.dev';
const ADMIN_KEY = 'UgWKZLhjrD9ngI4I3hj1G0nd6YQJLG4X';

async function clearQueue(clearType = 'pending') {
  console.log('='.repeat(70));
  console.log('🗑️  CLEARING PROCESSING QUEUE');
  console.log('='.repeat(70));
  
  // Get current stats
  const statsResponse = await fetch(`${WORKER_URL}/stats`);
  const stats = await statsResponse.json();
  
  console.log('\n📊 Current Queue Status:');
  console.log(`  Pending: ${stats.queue.pending}`);
  console.log(`  Processing: ${stats.queue.processing}`);
  console.log(`  Completed: ${stats.queue.completed}`);
  console.log(`  Total: ${stats.queue.pending + stats.queue.processing + stats.queue.completed}`);
  
  // Clear the queue
  console.log(`\n🧹 Clearing ${clearType} items from queue...`);
  
  try {
    const response = await fetch(`${WORKER_URL}/clear-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminKey: ADMIN_KEY,
        clearType: clearType
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ Error: ${error}`);
      return;
    }
    
    const result = await response.json();
    
    console.log('\n✅ Queue cleared successfully!');
    console.log('\n📊 Before:');
    console.log(`  Pending: ${result.before.pending}`);
    console.log(`  Completed: ${result.before.completed}`);
    console.log(`  Total: ${result.before.total}`);
    
    console.log('\n📊 After:');
    console.log(`  Pending: ${result.after.pending}`);
    console.log(`  Completed: ${result.after.completed}`);
    console.log(`  Total: ${result.after.total}`);
    
    console.log('\n🗑️  Removed:');
    console.log(`  Pending: ${result.removed.pending}`);
    console.log(`  Completed: ${result.removed.completed}`);
    console.log(`  Total: ${result.removed.total}`);
    
  } catch (error) {
    console.error('❌ Failed to clear queue:', error.message);
  }
}

// Get command line argument
const clearType = process.argv[2] || 'pending';

if (!['all', 'pending', 'completed'].includes(clearType)) {
  console.log('Usage: node clear-queue.js [all|pending|completed]');
  console.log('  all       - Clear entire queue');
  console.log('  pending   - Clear only pending items (default)');
  console.log('  completed - Clear only completed items');
  process.exit(1);
}

clearQueue(clearType).catch(console.error);