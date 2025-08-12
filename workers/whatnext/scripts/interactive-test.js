#!/usr/bin/env node

// Interactive test for What Next production deployment
import readline from 'readline';

const API_URL = 'https://what-next-prod.jhaladik.workers.dev';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

async function interactiveTest() {
  console.log('\n🎬 ═══════════════════════════════════════════════════════════');
  console.log('   WHAT NEXT - Movie Recommendation Engine Test');
  console.log('   Production URL: ' + API_URL);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    // Step 1: Check available domains
    console.log('📡 Checking available domains...\n');
    const domainsResponse = await fetch(`${API_URL}/api/domains`);
    const domainsData = await domainsResponse.json();
    
    console.log('Available domains:');
    domainsData.domains.forEach((d, i) => {
      console.log(`  ${i + 1}. ${d.name} (${d.id})`);
      if (d.config?.description) {
        console.log(`     ${d.config.description}`);
      }
    });
    
    console.log('\n─────────────────────────────────────────────────────────────\n');
    
    // Step 2: Start a session
    const domainChoice = await question('Select domain (1 for General, 2 for Movies) [2]: ');
    const selectedDomain = domainChoice === '1' ? 'general' : 'movies';
    
    console.log(`\n🎬 Starting session with ${selectedDomain} domain...\n`);
    
    const startResponse = await fetch(`${API_URL}/api/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: selectedDomain })
    });
    
    const startData = await startResponse.json();
    const sessionId = startData.sessionId;
    
    console.log(`✅ Session created: ${sessionId}`);
    console.log('\n─────────────────────────────────────────────────────────────\n');
    
    // Step 3: Answer questions
    let currentQuestion = startData.question;
    let questionNumber = 1;
    let choices = [];
    
    while (currentQuestion) {
      console.log(`❓ Question ${questionNumber}/${6}:`);
      console.log(`   ${currentQuestion.text || currentQuestion.question_text}\n`);
      
      if (currentQuestion.options) {
        currentQuestion.options.forEach((opt, i) => {
          console.log(`   ${i + 1}. ${opt.emoji || ''} ${opt.text}`);
        });
      }
      
      const choiceIndex = await question('\nYour choice (1 or 2): ');
      const selectedChoice = currentQuestion.options 
        ? currentQuestion.options[parseInt(choiceIndex) - 1]?.id 
        : (choiceIndex === '1' ? 'yes' : 'no');
      
      choices.push({
        question: currentQuestion.text || currentQuestion.question_text,
        answer: currentQuestion.options?.[parseInt(choiceIndex) - 1]?.text || selectedChoice
      });
      
      console.log('\n🔄 Processing...\n');
      
      const swipeResponse = await fetch(`${API_URL}/api/swipe/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id || currentQuestion.question_id,
          choice: selectedChoice,
          responseTime: Math.random() * 2000 + 500
        })
      });
      
      const swipeData = await swipeResponse.json();
      
      if (swipeData.type === 'recommendations') {
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log('🎉 YOUR PERSONALIZED RECOMMENDATIONS\n');
        console.log('Based on your choices:');
        choices.forEach(c => console.log(`  • ${c.question} → ${c.answer}`));
        console.log('\n─────────────────────────────────────────────────────────────\n');
        
        swipeData.recommendations.forEach((rec, i) => {
          console.log(`📽️  ${i + 1}. ${rec.title} (${rec.year})`);
          console.log(`   Genre: ${rec.genre}`);
          console.log(`   Runtime: ${rec.runtime}`);
          console.log(`   Rating: ${rec.rating}`);
          console.log(`   Where to watch: ${rec.where_to_watch}`);
          
          if (rec.vote_average) {
            console.log(`   TMDB Rating: ⭐ ${rec.vote_average}/10`);
          }
          
          if (rec.overview) {
            console.log(`   Plot: ${rec.overview.substring(0, 150)}...`);
          }
          
          console.log(`   Why: ${rec.reason}\n`);
          
          if (rec.poster_url) {
            console.log(`   🖼️  Poster: ${rec.poster_url}`);
          }
          
          if (rec.trailer_url) {
            console.log(`   ▶️  Trailer: ${rec.trailer_url}`);
          }
          
          console.log('\n─────────────────────────────────────────────────────────────\n');
        });
        
        if (swipeData.reasoning || swipeData.explanation) {
          console.log('💭 Recommendation Strategy:');
          console.log(`   ${swipeData.reasoning || swipeData.explanation}\n`);
        }
        
        console.log(`📊 Session Stats:`);
        console.log(`   • Questions answered: ${questionNumber}`);
        console.log(`   • Time saved: ${swipeData.timeSaved || 'N/A'}`);
        console.log(`   • Domain: ${swipeData.domain}`);
        
        break;
      }
      
      currentQuestion = swipeData.question;
      questionNumber++;
      console.log('─────────────────────────────────────────────────────────────\n');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   Test completed successfully! 🎉');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Ask if user wants to test again
    const again = await question('Would you like to test again? (y/n): ');
    if (again.toLowerCase() === 'y') {
      await interactiveTest();
    }
    
  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    console.error('\nFull error:', error);
  } finally {
    rl.close();
  }
}

// Start the test
console.log('🚀 Starting What Next Interactive Test...');
interactiveTest();