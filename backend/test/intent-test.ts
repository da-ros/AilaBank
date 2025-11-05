/**
 * Intent Engine Test Script
 * Tests the full AI Intent Engine pipeline
 * 
 * Usage:
 *   npm run test:intent
 *   or
 *   ts-node test/intent-test.ts
 */

import dotenv from 'dotenv';
import { IntentOrchestrator } from '../src/services/ai/intentOrchestrator';

// Load environment variables
dotenv.config({ path: '.env' });

const TEST_USER_ID = 'test-user-123';

async function testTextIntent() {
  console.log('\n🧪 Testing Text Intent Processing\n');
  console.log('═'.repeat(60));

  const orchestrator = new IntentOrchestrator();

  const testCases = [
    'Deposit 100 USDC',
    'Withdraw 50 dollars',
    'Transfer 25 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    'Check my balance',
    'Create invoice for 200 EUR',
    'Move 35% of idle cash to safest yield, keep $1k liquid',
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Testing: "${testCase}"`);
    console.log('─'.repeat(60));

    try {
      const result = await orchestrator.processIntent({
        userId: TEST_USER_ID,
        text: testCase,
        context: { locale: 'en' }
      });

      console.log('✅ Success!');
      console.log(`   Intent: ${result.intent}`);
      console.log(`   Confidence: ${result.confidence}`);
      console.log(`   Entities:`, JSON.stringify(result.entities, null, 2));
      console.log(`   Explanation: ${result.explanation}`);
      console.log(`   Actions: ${result.actions.length}`);
      if (result.audioResponseURL) {
        console.log(`   Audio: ${result.audioResponseURL}`);
      }
    } catch (error: any) {
      console.error('❌ Failed:', error.message);
      if (process.env.NODE_ENV === 'development') {
        console.error(error.stack);
      }
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function testAudioIntent() {
  console.log('\n🎤 Testing Audio Intent Processing\n');
  console.log('═'.repeat(60));
  console.log('⚠️  Audio test requires a real audio file.');
  console.log('   Place a test audio file at: test/audio/test-recording.webm\n');

  const fs = await import('fs');
  const testAudioPath = __dirname + '/audio/test-recording.webm';

  if (!fs.existsSync(testAudioPath)) {
    console.log('⏭️  Skipping audio test (no test file found)');
    return;
  }

  const orchestrator = new IntentOrchestrator();
  const audioBuffer = fs.readFileSync(testAudioPath);

  try {
    console.log('📤 Processing audio file...');
    const result = await orchestrator.processIntent({
      userId: TEST_USER_ID,
      audio: audioBuffer,
      context: { locale: 'en' }
    });

    console.log('✅ Success!');
    console.log(`   Transcript: ${result.entities.originalText}`);
    console.log(`   Intent: ${result.intent}`);
    console.log(`   Confidence: ${result.confidence}`);
    console.log(`   Explanation: ${result.explanation}`);
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
  }
}

async function testAdvancedReasoning() {
  console.log('\n🧠 Testing Advanced Reasoning\n');
  console.log('═'.repeat(60));

  const orchestrator = new IntentOrchestrator();

  // Test allocation recommendation
  console.log('\n📊 Testing Allocation Recommendation...');
  try {
    const recommendation = await orchestrator.getSmartAllocation(
      TEST_USER_ID,
      1000, // $1000 balance
      [
        { date: '2025-01-01', amount: -50, type: 'withdrawal' },
        { date: '2025-01-02', amount: -30, type: 'withdrawal' },
        { date: '2025-01-03', amount: 200, type: 'deposit' },
      ]
    );

    console.log('✅ Allocation Recommendation:');
    console.log(`   Buffer: ${recommendation.bufferPercent}%`);
    console.log(`   Yield: ${recommendation.yieldPercent}%`);
    console.log(`   Reasoning: ${recommendation.reasoning}`);
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
  }

  // Test liquidity forecast
  console.log('\n📈 Testing Liquidity Forecast...');
  try {
    const forecast = await orchestrator.forecastUserLiquidity(
      TEST_USER_ID,
      [
        { date: '2025-01-01', amount: 50 },
        { date: '2025-01-02', amount: 30 },
        { date: '2025-01-03', amount: 45 },
        { date: '2025-01-04', amount: 60 },
      ]
    );

    console.log('✅ Liquidity Forecast:');
    console.log(`   Predictions: ${forecast.predictions.length} days`);
    forecast.predictions.slice(0, 3).forEach(p => {
      console.log(`   ${p.date}: ${p.expectedWithdrawal} USDC (confidence: ${p.confidence})`);
    });
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
  }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🧪 AilaBank AI Intent Engine Test Suite');
  console.log('═══════════════════════════════════════════════════');

  // Check required environment variables
  const required = ['OPENAI_API_KEY', 'ELEVENLABS_API_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('\n❌ Missing required API keys:', missing.join(', '));
    console.error('   Please set them in your .env file\n');
    process.exit(1);
  }

  try {
    await testTextIntent();
    await testAdvancedReasoning();
    await testAudioIntent();

    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ All tests completed!');
    console.log('═══════════════════════════════════════════════════\n');
  } catch (error: any) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runAllTests();
}

