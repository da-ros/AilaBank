#!/usr/bin/env ts-node

/**
 * Test Circle API Key directly
 * Run: ts-node test/circle-api-key-test.ts
 */

import { Circle, CircleEnvironments } from '@circle-fin/circle-sdk';
import * as dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.CIRCLE_API_KEY;

if (!apiKey) {
  console.error('❌ CIRCLE_API_KEY not found in .env');
  process.exit(1);
}

console.log('🔍 Testing Circle API Key...\n');
console.log(`API Key Format: ${apiKey.split(':')[0]}:${apiKey.split(':')[1].substring(0, 8)}...:${apiKey.split(':')[2].substring(0, 8)}...`);
console.log(`Environment: ${apiKey.startsWith('TEST_API_KEY') ? 'Sandbox' : 'Production'}\n`);

const client = new Circle(
  apiKey,
  apiKey.startsWith('TEST_API_KEY') ? CircleEnvironments.sandbox : CircleEnvironments.production
);

async function testAPIKey() {
  try {
    console.log('📝 Testing API key with a simple request...\n');

    // Try to list wallets (this is a simple read operation)
    const response = await (client.wallets as any).listWallets?.() || 
                     await (client.wallets as any).getWallets?.() ||
                     await client.wallets;

    console.log('✅ API Key is valid!');
    console.log('Response:', JSON.stringify(response, null, 2));
    
  } catch (error: any) {
    console.error('❌ API Key test failed:\n');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401) {
        console.error('\n🔍 Possible issues:');
        console.error('1. API key is revoked or expired');
        console.error('2. API key doesn\'t have required permissions');
        console.error('3. Wrong environment (sandbox vs production)');
        console.error('4. Account needs verification in Circle Console');
        console.error('\n💡 Solutions:');
        console.error('- Go to https://console.circle.com');
        console.error('- Check API Keys → Verify key is Active');
        console.error('- Check if account needs verification');
        console.error('- Try creating a new API key');
      }
    } else {
      console.error('Error:', error.message);
    }
    
    process.exit(1);
  }
}

testAPIKey();

