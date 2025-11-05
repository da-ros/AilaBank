/**
 * Test Circle Developer-Controlled Wallets SDK Connection
 * 
 * This script tests if your API key and entity secret are correctly configured.
 * Run with: ts-node test/circle-sdk-connection-test.ts
 */

import dotenv from 'dotenv';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

dotenv.config({ path: '.env' });

async function testConnection() {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey) {
    console.error('❌ CIRCLE_API_KEY not found in .env');
    process.exit(1);
  }

  if (!entitySecret) {
    console.error('❌ CIRCLE_ENTITY_SECRET not found in .env');
    process.exit(1);
  }

  // Determine environment
  const keyPrefix = apiKey.split(':')[0].toUpperCase();
  const isSandbox = keyPrefix === 'TEST_API_KEY' || keyPrefix === 'SANDBOX_API_KEY';
  const baseUrl = isSandbox ? 'https://api-sandbox.circle.com' : 'https://api.circle.com';

  console.log('🔍 Testing Circle SDK Connection...\n');
  console.log(`   Environment: ${isSandbox ? 'Sandbox' : 'Production'}`);
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`   API Key: ${apiKey.substring(0, 20)}...`);
  console.log(`   Entity Secret: ${entitySecret.substring(0, 8)}... (64 hex chars)\n`);

  const clientConfig: any = {
    apiKey,
    entitySecret,
  };

  if (isSandbox) {
    clientConfig.baseUrl = baseUrl;
  }

  try {
    const client = initiateDeveloperControlledWalletsClient(clientConfig);

    console.log('📡 Testing connection by fetching public key...');
    const publicKeyResponse = await client.getPublicKey();
    
    console.log('✅ SUCCESS! SDK connection is working.');
    console.log(`   Public Key fetched: ${publicKeyResponse.data?.publicKey?.substring(0, 50)}...\n`);
    
    console.log('✅ Your API key is valid and can connect to Circle API!');
    console.log('   ⚠️  Next step: Register your entity secret if not already done');
    console.log('   Run: POST /api/v1/circle/register-entity-secret');
    console.log('   OR use Circle Console → Developer Services → Configuration\n');

    // Try to register entity secret to verify it's registered
    console.log('🔍 Checking if entity secret is registered...');
    try {
      const { registerEntitySecretCiphertext } = require('@circle-fin/developer-controlled-wallets');
      await registerEntitySecretCiphertext({
        apiKey,
        entitySecret,
        baseUrl: isSandbox ? baseUrl : undefined,
      });
      console.log('✅ Entity secret registration successful!');
      console.log('   ⚠️  If this was already registered, Circle may have updated it.\n');
    } catch (regError: any) {
      if (regError.response?.status === 400 && regError.response?.data?.message?.includes('already registered')) {
        console.log('✅ Entity secret is already registered!\n');
      } else if (regError.response?.status === 401) {
        console.log('❌ Entity secret registration failed with 401');
        console.log('   This means your API key is valid but entity secret registration failed.');
        console.log('   Possible causes:');
        console.log('   - Entity secret format is incorrect');
        console.log('   - API key doesn\'t have Developer Services permissions\n');
      } else {
        console.log('⚠️  Entity secret registration check inconclusive');
        console.log(`   Error: ${regError.response?.data || regError.message}\n`);
      }
    }

    return true;
  } catch (error: any) {
    const errorData = error.response?.data || error.message;
    console.error('❌ CONNECTION FAILED!\n');
    console.error('   Error:', errorData);
    console.error('\n   Possible causes:');
    console.error('   1. API key is incorrect or doesn\'t have Developer Services permissions');
    console.error('   2. Environment mismatch (sandbox key with production or vice versa)');
    console.error('   3. API key format is incorrect');
    console.error('\n   Solution:');
    console.error('   1. Go to https://console.circle.com → Developer Services → API Keys');
    console.error('   2. Verify your API key is active and has Developer Services scope');
    console.error('   3. Make sure API key format is: TEST_API_KEY:key-id:key-secret');
    console.error('   4. For sandbox, use TEST_API_KEY prefix');
    console.error('\n   After fixing API key, register entity secret:');
    console.error('   POST /api/v1/circle/register-entity-secret');
    console.error('   OR Circle Console → Developer Services → Configuration → Register Entity Secret');
    
    return false;
  }
}

testConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

