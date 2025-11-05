#!/usr/bin/env ts-node
/**
 * Generate Entity Secret for Circle Developer Controlled Wallets
 * 
 * This script generates a new 32-byte entity secret using Circle's SDK.
 * Save this secret securely - you'll need it to register with Circle and create wallets.
 * 
 * Usage:
 *   ts-node test/generate-entity-secret.ts
 * 
 * Alternative (using OpenSSL):
 *   openssl rand -hex 32
 */

import { generateEntitySecret } from '@circle-fin/developer-controlled-wallets';

console.log('🔐 Generating Entity Secret for Circle Developer Controlled Wallets...\n');

try {
  generateEntitySecret();
  
  console.log('\n✅ Entity Secret generated successfully!');
  console.log('\n📝 Next steps:');
  console.log('   1. Copy the entity secret above');
  console.log('   2. Add it to your .env file as CIRCLE_ENTITY_SECRET=<secret>');
  console.log('   3. Register it with Circle:');
  console.log('      POST /api/v1/circle/register-entity-secret');
  console.log('      OR use Circle Console → Developer Services → Configuration');
  console.log('\n⚠️  IMPORTANT: Save this secret securely! You\'ll need it to:');
  console.log('   - Register with Circle');
  console.log('   - Create wallet sets and wallets');
  console.log('   - Initiate transactions');
  console.log('\n💡 If you lose it, you\'ll need the recovery file to reset it.');
} catch (error: any) {
  console.error('❌ Failed to generate entity secret:', error.message);
  process.exit(1);
}

