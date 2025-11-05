#!/usr/bin/env ts-node
/**
 * Register Entity Secret with Circle Developer Controlled Wallets
 * 
 * This script registers your entity secret with Circle's Developer Services.
 * The SDK automatically handles encryption - you only need to provide the unencrypted secret.
 * 
 * Prerequisites:
 *   1. Generate an entity secret (run generate-entity-secret.ts or use: openssl rand -hex 32)
 *   2. Set CIRCLE_ENTITY_SECRET in .env
 *   3. Set CIRCLE_API_KEY in .env (must have Developer Services permissions)
 * 
 * Usage:
 *   ts-node test/register-entity-secret.ts [recovery-file-path]
 * 
 * Example:
 *   ts-node test/register-entity-secret.ts ./recovery-file.json
 */

import { registerEntitySecretCiphertext } from '@circle-fin/developer-controlled-wallets';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function registerEntitySecret() {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  const baseUrl = process.env.CIRCLE_BASE_URL || 'https://api-sandbox.circle.com';
  const recoveryFilePath = process.argv[2];

  if (!apiKey) {
    console.error('❌ CIRCLE_API_KEY must be set in .env');
    process.exit(1);
  }

  if (!entitySecret) {
    console.error('❌ CIRCLE_ENTITY_SECRET must be set in .env');
    console.error('   Generate one with: ts-node test/generate-entity-secret.ts');
    console.error('   Or use: openssl rand -hex 32');
    process.exit(1);
  }

  // Validate entity secret format (64 hex characters = 32 bytes)
  if (!/^[0-9a-fA-F]{64}$/.test(entitySecret)) {
    console.error('❌ Invalid CIRCLE_ENTITY_SECRET format');
    console.error('   Expected: 64-character hex string (32 bytes)');
    console.error('   Got:', entitySecret.length, 'characters');
    console.error('   Generate one with: openssl rand -hex 32');
    process.exit(1);
  }

  // Determine environment from API key
  const isSandbox = apiKey.startsWith('TEST_API_KEY:');
  const actualBaseUrl = isSandbox ? baseUrl : undefined;

  console.log('📝 Registering entity secret with Circle...');
  console.log(`   Environment: ${isSandbox ? 'sandbox' : 'production'}`);
  console.log(`   API Key: ${apiKey.substring(0, 20)}...`);
  console.log(`   Entity Secret: ${entitySecret.substring(0, 8)}...`);
  if (recoveryFilePath) {
    console.log(`   Recovery file path: ${recoveryFilePath}`);
  }

  try {
    const registrationConfig: any = {
      apiKey,
      entitySecret,
    };

    if (actualBaseUrl) {
      registrationConfig.baseUrl = actualBaseUrl;
    }

    if (recoveryFilePath) {
      registrationConfig.recoveryFileDownloadPath = recoveryFilePath;
    }

    const response = await registerEntitySecretCiphertext(registrationConfig);

    console.log('\n✅ Entity secret registered successfully!');
    
    const recoveryFile = response.data?.recoveryFile;
    if (recoveryFile) {
      if (recoveryFilePath) {
        console.log(`   📄 Recovery file saved to: ${recoveryFilePath}`);
      } else {
        console.log('   📄 Recovery file generated:');
        console.log('   ⚠️  Save this file securely - you\'ll need it to reset your entity secret!');
        
        // Save to default location if not specified
        const defaultPath = path.join(__dirname, '../circle-recovery-file.json');
        fs.writeFileSync(defaultPath, JSON.stringify(recoveryFile, null, 2));
        console.log(`   💾 Also saved to: ${defaultPath}`);
      }
    }

    console.log('\n🎉 Registration complete! You can now:');
    console.log('   1. Create wallet sets: POST /api/v1/circle/wallet-set/create');
    console.log('   2. Create wallets: POST /api/v1/circle/wallet/create');
    console.log('   3. Initiate transactions');
    console.log('\n⚠️  Remember: Save your entity secret and recovery file securely!');

  } catch (error: any) {
    const errorData = error.response?.data || error.message;
    const errorMessage = errorData?.message || errorData;
    
    console.error('\n❌ Registration failed:', errorMessage);
    
    if (error.response?.status === 400) {
      const errorMsg = errorMessage?.toLowerCase() || '';
      if (errorMsg.includes('already registered') || errorMsg.includes('already exists')) {
        console.error('\n💡 Entity secret is already registered.');
        console.error('   If you need to rotate it, use the rotation endpoint.');
        console.error('   If this is unexpected, verify your entity secret matches what was registered.');
      }
    } else if (error.response?.status === 401) {
      console.error('\n💡 Possible causes:');
      console.error('   1. API key is incorrect or doesn\'t have Developer Services permissions');
      console.error('   2. API key format is incorrect (should be: TEST_API_KEY:key-id:key-secret)');
      console.error('   3. Environment mismatch (sandbox key with production or vice versa)');
      console.error('   4. Entity secret format is incorrect');
      console.error('\n   Solution:');
      console.error('   - Verify API key in Circle Console → Developer Services → API Keys');
      console.error('   - Ensure API key has Developer Services scope/permissions');
    }
    
    process.exit(1);
  }
}

registerEntitySecret();

