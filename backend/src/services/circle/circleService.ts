import { Circle, CircleEnvironments } from '@circle-fin/circle-sdk';
import {
  initiateDeveloperControlledWalletsClient,
  CircleDeveloperControlledWalletsClient,
  AccountType as CircleAccountType,
  Blockchain as CircleBlockchain,
  registerEntitySecretCiphertext,
} from '@circle-fin/developer-controlled-wallets';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import axios from 'axios';
import { supabase } from '../../db/supabase';

/**
 * Circle Service
 * Handles wallet creation, balance checks, and transfers to Arc chain
 */

interface CreateWalletRequest {
  userId: string;
  address?: string; // Optional - Circle generates the wallet address
}

interface TransferToArcRequest {
  walletId: string;
  destinationAddress: string;
  amount: string;
  userId?: string;
}

export class CircleService {
  private client: Circle;
  private environment: 'sandbox' | 'production';
  private entitySecret: string;
  private apiKey: string;
  private baseUrl: string;
  private walletSetId?: string;
  private walletBlockchains: CircleBlockchain[];
  private walletAccountType: CircleAccountType;
  private walletCount: number;
  private dcWalletClient: CircleDeveloperControlledWalletsClient;
  private entityPublicKey?: string; // Cached public key from .env or API

  constructor() {
    const apiKey = process.env.CIRCLE_API_KEY;
    if (!apiKey) {
      throw new Error('CIRCLE_API_KEY must be set in .env');
    }
    this.apiKey = apiKey;

    // Validate Circle API key format (should be: TEST_API_KEY:key-id:key-secret or LIVE_API_KEY:key-id:key-secret)
    const parts = apiKey.split(':');
    if (parts.length !== 3) {
      throw new Error(
        'Invalid Circle API key format. Expected format: TEST_API_KEY:key-id:key-secret or LIVE_API_KEY:key-id:key-secret\n' +
        'Get a new API key from https://console.circle.com → API Keys → Create API Key'
      );
    }

    // Determine environment from API key prefix or CIRCLE_BASE_URL
    // Allow override via CIRCLE_BASE_URL env var (for testing with production URL)
    const baseUrlOverride = process.env.CIRCLE_BASE_URL;
    
    if (baseUrlOverride) {
      // Explicit override from .env
      this.baseUrl = baseUrlOverride;
      this.environment = baseUrlOverride.includes('sandbox') ? 'sandbox' : 'production';
      console.log(`⚠️  Using CIRCLE_BASE_URL override: ${this.baseUrl}`);
    } else {
      // Auto-detect from API key prefix
      const keyPrefix = parts[0].toUpperCase();
      if (keyPrefix === 'TEST_API_KEY' || keyPrefix === 'SANDBOX_API_KEY') {
        this.environment = 'sandbox';
        this.baseUrl = 'https://api-sandbox.circle.com';
      } else if (keyPrefix === 'LIVE_API_KEY' || keyPrefix === 'PRODUCTION_API_KEY') {
        this.environment = 'production';
        this.baseUrl = 'https://api.circle.com';
      } else {
        // Default to sandbox for safety
        this.baseUrl = 'https://api-sandbox.circle.com';
        this.environment = 'sandbox';
        console.warn(`⚠️  Could not determine environment from API key prefix "${keyPrefix}", defaulting to sandbox`);
      }
    }

    this.client = new Circle(
      apiKey,
      this.environment === 'sandbox' ? CircleEnvironments.sandbox : CircleEnvironments.production
    );

    const blockchainsEnv = process.env.CIRCLE_WALLET_BLOCKCHAINS || 'ETH-SEPOLIA';
    const parsedBlockchains = blockchainsEnv
      .split(',')
      .map(chain => chain.trim())
      .filter(chain => chain.length > 0);

    this.walletBlockchains = (parsedBlockchains.length > 0 ? parsedBlockchains : ['ETH-SEPOLIA']) as CircleBlockchain[];

    const accountTypeEnv = (process.env.CIRCLE_WALLET_ACCOUNT_TYPE || 'SCA').toUpperCase();
    this.walletAccountType = (accountTypeEnv === 'EOA' ? 'EOA' : 'SCA') as CircleAccountType;

    const walletCountEnv = parseInt(process.env.CIRCLE_WALLET_COUNT || '1', 10);
    this.walletCount = Number.isNaN(walletCountEnv)
      ? 1
      : Math.min(Math.max(walletCountEnv, 1), 20); // Circle maximum count is 20

    // Load entity secret (hex-encoded 32-byte secret)
    // IMPORTANT: The SDK requires the UNENCRYPTED secret, not the ciphertext!
    // The SDK automatically generates fresh ciphertexts for each API request.
    const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
    const entitySecretCiphertext = process.env.CIRCLE_ENTITY_SECRET_CIPHERTEXT;

    if (!entitySecret) {
      if (entitySecretCiphertext) {
        throw new Error(
          'CIRCLE_ENTITY_SECRET (unencrypted) must be set in .env for developer-controlled wallets.\n' +
          'You have CIRCLE_ENTITY_SECRET_CIPHERTEXT set, but the SDK requires the unencrypted secret.\n\n' +
          'Why? The SDK automatically generates fresh ciphertexts for each API request.\n' +
          'The ciphertext is only used for direct API calls (not when using the SDK).\n\n' +
          'To fix:\n' +
          '1. If you have the original unencrypted secret, set CIRCLE_ENTITY_SECRET=<unencrypted-secret>\n' +
          '2. If you don\'t have it, generate a new one: ts-node test/generate-entity-secret.ts\n' +
          '3. Then register it: ts-node test/register-entity-secret.ts\n\n' +
          'Note: If you registered via Console, you still need the unencrypted secret for SDK operations.'
        );
      } else {
        throw new Error(
          'CIRCLE_ENTITY_SECRET must be set in .env for developer-controlled wallets.\n' +
          'Generate one with: ts-node test/generate-entity-secret.ts\n' +
          'Or: openssl rand -hex 32'
        );
      }
    }

    if (!/^[0-9a-fA-F]{64}$/.test(entitySecret)) {
      throw new Error(
        'Invalid CIRCLE_ENTITY_SECRET format. Expected 64-character hex string (32 bytes).\n' +
        'Generate one with: openssl rand -hex 32\n' +
        'Or: ts-node test/generate-entity-secret.ts'
      );
    }

    this.entitySecret = entitySecret;

    // Load entity public key from .env if available (avoids API calls)
    const entityPublicKey = process.env.CIRCLE_ENTITY_PUBLIC_KEY;
    if (entityPublicKey) {
      this.entityPublicKey = entityPublicKey;
      console.log('✅ Using CIRCLE_ENTITY_PUBLIC_KEY from .env (skipping API call)');
    } else {
      console.log('⚠️  CIRCLE_ENTITY_PUBLIC_KEY not set in .env - will fetch from API when needed');
    }

    // Log a warning if ciphertext is also set (it's not used by SDK)
    if (entitySecretCiphertext) {
      console.warn('⚠️  CIRCLE_ENTITY_SECRET_CIPHERTEXT is set but not used by the SDK.');
      console.warn('   The SDK automatically generates fresh ciphertexts from CIRCLE_ENTITY_SECRET.');
      console.warn('   CIRCLE_ENTITY_SECRET_CIPHERTEXT is only needed for direct API calls.');
    }

    // Initialize the developer-controlled wallets client
    // Note: baseUrl is optional - SDK defaults to https://api.circle.com
    // For sandbox, we need to explicitly set it
    const clientConfig: any = {
      apiKey: this.apiKey,
      entitySecret: this.entitySecret,
    };

    // Only set baseUrl if it's sandbox (SDK defaults to production)
    if (this.environment === 'sandbox') {
      clientConfig.baseUrl = this.baseUrl;
    }

    this.dcWalletClient = initiateDeveloperControlledWalletsClient(clientConfig);

    this.walletSetId = process.env.CIRCLE_WALLET_SET_ID || undefined;

    // Log initialization (without exposing full key)
    const maskedKey = apiKey.split(':').map((part, i) => i === 0 ? part : `${part.substring(0, 4)}...`).join(':');
    console.log(`🔑 Circle SDK initialized: ${this.environment} environment`);
    console.log(`   API Key: ${maskedKey}`);
    console.log(`   Base URL: ${this.baseUrl}`);
    console.log(`   Entity Secret: ${entitySecret.substring(0, 8)}... (64 hex chars)`);
    console.log(`   ⚠️  If you get 401 errors, verify:`);
    console.log(`      1. API key has Developer Services permissions`);
    console.log(`      2. Entity secret is registered with this API key`);
    console.log(`      3. Environment matches (sandbox vs production)`);
    if (this.walletSetId) {
      console.log(`   Wallet Set ID: ${this.walletSetId}`);
    } else {
      console.log('   Wallet Set ID: not configured (will require creation before wallet operations)');
    }
    console.log(`   Wallet Blockchains: ${this.walletBlockchains.join(', ')}`);
    console.log(`   Wallet Account Type: ${this.walletAccountType}`);
    console.log(`   Wallet Count per request: ${this.walletCount}`);
  }

  /**
   * Register entity secret with Circle
   * This must be done before creating wallet sets or wallets
   * The SDK automatically handles encryption (no manual encryption needed)
   * 
   * NOTE: If you previously registered an incorrect/malformed entity secret ciphertext,
   * calling this with a NEW unencrypted entity secret will overwrite the old registration.
   * 
   * Reference: https://developers.circle.com/wallets/dev-controlled/register-entity-secret
   */
  public async registerEntitySecret(recoveryFileDownloadPath?: string, forceOverwrite: boolean = false): Promise<any> {
    try {
      console.log('📝 Registering entity secret with Circle...');
      console.log(`   Environment: ${this.environment}`);
      console.log(`   Entity Secret: ${this.entitySecret?.substring(0, 8)}... (64 hex chars)`);
      
      if (forceOverwrite) {
        console.log('   ⚠️  Force overwrite mode: This will replace any existing entity secret registration');
      }
      
      const registrationConfig: any = {
        apiKey: this.apiKey,
        entitySecret: this.entitySecret,
      };

      if (this.environment === 'sandbox') {
        registrationConfig.baseUrl = this.baseUrl;
      }

      if (recoveryFileDownloadPath) {
        registrationConfig.recoveryFileDownloadPath = recoveryFileDownloadPath;
        console.log(`   Recovery file path: ${recoveryFileDownloadPath}`);
      } else {
        console.log('   ⚠️  No recovery file path specified - recovery file will be returned in response');
      }

      const response = await registerEntitySecretCiphertext(registrationConfig);

      console.log('✅ Entity secret registered successfully!');
      console.log('   💡 If you had an incorrect registration before, it has been overwritten.');
      
      const recoveryFile = response.data?.recoveryFile;
      if (recoveryFile) {
        if (recoveryFileDownloadPath) {
          console.log(`   📄 Recovery file saved to: ${recoveryFileDownloadPath}`);
        } else {
          console.log('   📄 Recovery file generated - save it securely!');
          console.log('   ⚠️  You\'ll need this file to reset your entity secret if you lose it!');
        }
      }

      return response.data;
    } catch (error: any) {
      const errorDetails = error.response?.data || error.message;
      const errorMessage = errorDetails?.message || errorDetails;
      console.error('❌ Entity secret registration failed:', errorMessage);
      
      // Handle already registered case - but note that SDK registration should overwrite
      if (error.response?.status === 400) {
        const errorMsg = errorMessage?.toLowerCase() || '';
        if (errorMsg.includes('already registered') || errorMsg.includes('already exists')) {
          console.warn('   ⚠️  Entity secret appears to be already registered.');
          console.warn('   💡 The SDK registration should overwrite it. If this error persists, you may need to:');
          console.warn('      1. Generate a completely new entity secret');
          console.warn('      2. Use the recovery file to reset (if you have it)');
          console.warn('      3. Contact Circle support if the old registration is blocking you');
          throw new Error(
            `Entity secret registration returned "already registered" error.\n` +
            `If you previously registered an incorrect/malformed entity secret:\n` +
            `1. Generate a NEW entity secret: ts-node test/generate-entity-secret.ts\n` +
            `2. Try registering again with the new secret\n` +
            `3. If still failing, you may need to use the recovery file to reset or contact Circle support`
          );
        }
      }
      
      if (error.response?.status === 401) {
        throw new Error(
          `Authentication failed (401) during registration.\n` +
          `Your API key is valid (we confirmed this), but the entity secret registration failed.\n\n` +
          `This might mean:\n` +
          `1. You registered an incorrect/malformed entity secret ciphertext before\n` +
          `2. The old registration is blocking the new one\n\n` +
          `Solution:\n` +
          `1. Generate a NEW entity secret: ts-node test/generate-entity-secret.ts\n` +
          `2. Set it in .env as CIRCLE_ENTITY_SECRET\n` +
          `3. Try registering again: ts-node test/register-entity-secret.ts\n` +
          `4. If it still fails, you may need the recovery file to reset the entity secret`
        );
      }

      throw new Error(`Failed to register entity secret: ${error.message}`);
    }
  }

  /**
   * Generate a fresh entity secret ciphertext
   * This is useful for debugging or if you need to manually generate ciphertext
   * Note: The SDK should automatically generate fresh ciphertexts for each API request
   * 
   * Reference: https://developers.circle.com/wallets/dev-controlled/register-entity-secret
   */
  public async generateEntitySecretCiphertext(): Promise<string> {
    try {
      console.log('🔐 Generating fresh entity secret ciphertext...');
      
      const ciphertext = await this.dcWalletClient.generateEntitySecretCiphertext();
      
      console.log('✅ Ciphertext generated successfully');
      console.log(`   Length: ${ciphertext.length} characters`);
      console.log(`   First 50 chars: ${ciphertext.substring(0, 50)}...`);
      console.log('   ⚠️  Note: This ciphertext should only be used once per API request');
      
      return ciphertext;
    } catch (error: any) {
      const errorDetails = error.response?.data || error.message;
      const errorMessage = errorDetails?.message || errorDetails;
      console.error('❌ Failed to generate ciphertext:', errorMessage);

      if (error.response?.status === 401) {
        throw new Error(
          `Authentication failed (401). Please verify:\n` +
          `1. API key is correct and has Developer Services permissions\n` +
          `2. Entity secret is registered with this API key\n` +
          `3. Environment matches (sandbox vs production)`
        );
      }

      throw new Error(`Failed to generate ciphertext: ${error.message}`);
    }
  }

  /**
   * Get public key for entity secret via direct API call
   * This works even when the SDK fails
   */
  private async getPublicKeyViaAPI(): Promise<string> {
    try {
      console.log('🔑 Fetching Circle entity public key via direct API...');
      
      const url = `${this.baseUrl}/v1/w3s/config/entity/publicKey`;
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const publicKey = response.data?.data?.publicKey;
      if (!publicKey) {
        throw new Error('Public key not found in response');
      }

      console.log('✅ Public key fetched successfully via API');
      return publicKey;
    } catch (error: any) {
      const errorDetails = error.response?.data || error.message;
      const errorMessage = errorDetails?.message || errorDetails;
      console.error('❌ Failed to fetch public key via API:', errorMessage);

      if (error.response?.status === 401) {
        throw new Error(
          `Authentication failed (401) when fetching public key. Please verify:\n` +
          `1. API key is correct and has Developer Services permissions\n` +
          `2. Environment matches (sandbox vs production)`
        );
      }

      throw new Error(`Failed to fetch public key via API: ${error.message}`);
    }
  }

  /**
   * Encrypt entity secret with RSA public key to generate ciphertext
   * Uses Node.js built-in crypto module (RSA-OAEP with SHA-256)
   */
  private async encryptEntitySecret(publicKeyPem: string): Promise<string> {
    try {
      // Convert hex entity secret to Buffer
      const entitySecretBuffer = Buffer.from(this.entitySecret!, 'hex');
      
      // Import the public key
      const publicKey = crypto.createPublicKey(publicKeyPem);
      
      // Encrypt using RSA-OAEP with SHA-256
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        entitySecretBuffer
      );
      
      // Return Base64 encoded ciphertext
      return encrypted.toString('base64');
    } catch (error: any) {
      console.error('❌ Failed to encrypt entity secret:', error.message);
      throw new Error(`Failed to encrypt entity secret: ${error.message}`);
    }
  }

  /**
   * Get public key (from .env or API)
   */
  private async getPublicKey(): Promise<string> {
    // Use cached public key from .env if available
    if (this.entityPublicKey) {
      console.log('🔑 Using public key from .env (CIRCLE_ENTITY_PUBLIC_KEY)');
      return this.entityPublicKey;
    }

    // Fallback to API call
    console.log('🔑 Public key not in .env, fetching from API...');
    const publicKey = await this.getPublicKeyViaAPI();
    
    // Cache it for future use
    this.entityPublicKey = publicKey;
    
    return publicKey;
  }

  /**
   * Generate a fresh entity secret ciphertext for API requests
   * Uses public key from .env or fetches from API, then encrypts the entity secret
   */
  public async generateFreshCiphertext(): Promise<string> {
    try {
      console.log('🔐 Generating fresh entity secret ciphertext...');
      
      // Get public key (from .env or API)
      const publicKey = await this.getPublicKey();
      
      // Encrypt entity secret
      const ciphertext = await this.encryptEntitySecret(publicKey);
      
      console.log('✅ Fresh ciphertext generated');
      console.log(`   Length: ${ciphertext.length} characters`);
      
      return ciphertext;
    } catch (error: any) {
      console.error('❌ Failed to generate ciphertext:', error.message);
      throw error;
    }
  }

  /**
   * Get public key for entity secret (for API responses)
   * This is useful for verifying entity secret registration and SDK connection
   * 
   * Reference: https://developers.circle.com/wallets/dev-controlled/register-entity-secret
   */
  public async getPublicKeyForAPI(): Promise<any> {
    try {
      // First check if we have it in .env
      if (this.entityPublicKey) {
        return {
          publicKey: this.entityPublicKey,
          message: 'Public key from .env (CIRCLE_ENTITY_PUBLIC_KEY).',
          source: 'env',
        };
      }

      // Try SDK first, fallback to direct API
      try {
        console.log('🔑 Fetching Circle entity public key via SDK...');
        const response = await this.dcWalletClient.getPublicKey();
        const publicKey = response.data?.publicKey;
        if (publicKey) {
          console.log('✅ Public key fetched successfully via SDK');
          // Cache it
          this.entityPublicKey = publicKey;
          return {
            publicKey,
            message: 'Public key fetched successfully. This confirms your entity secret is registered and SDK is working.',
            source: 'sdk',
          };
        }
      } catch (sdkError: any) {
        console.warn('⚠️  SDK getPublicKey failed, trying direct API...');
      }
      
      // Fallback to direct API
      const publicKey = await this.getPublicKeyViaAPI();
      // Cache it
      this.entityPublicKey = publicKey;
      return {
        publicKey,
        message: 'Public key fetched successfully via direct API.',
        source: 'api',
      };
    } catch (error: any) {
      const errorDetails = error.response?.data || error.message;
      const errorMessage = errorDetails?.message || errorDetails;
      console.error('❌ Failed to fetch public key:', errorMessage);

      throw new Error(`Failed to fetch public key: ${error.message}`);
    }
  }

  /**
   * Ensure wallet set ID is available (from env or prior creation)
   */
  private async ensureWalletSet(): Promise<string> {
    if (this.walletSetId) {
      return this.walletSetId;
    }

    const envWalletSetId = process.env.CIRCLE_WALLET_SET_ID;
    if (envWalletSetId) {
      this.walletSetId = envWalletSetId;
      return envWalletSetId;
    }

    throw new Error(
      'CIRCLE_WALLET_SET_ID not set. Create a wallet set first (POST /api/v1/circle/wallet-set/create) or configure CIRCLE_WALLET_SET_ID in .env'
    );
  }

  /**
   * Create a developer-controlled wallet set via Circle W3S API
   */
  public async createWalletSet(name?: string): Promise<any> {
    try {
      const idempotencyKey = uuidv4();
      const payload = {
        idempotencyKey,
        name: name || process.env.CIRCLE_WALLET_SET_NAME || 'Aila Wallet Set',
      };

      console.log('🧰 Creating Circle wallet set via W3S SDK...');
      console.log(`   API Key: ${this.apiKey.substring(0, 20)}...`);
      console.log(`   Environment: ${this.environment}`);
      
      const response = await this.dcWalletClient.createWalletSet(payload);

      const walletSetData = response.data;
      const walletSet = walletSetData?.walletSet;
      const walletSetId = walletSet?.id;

      if (!walletSetId) {
        console.error('Wallet set creation response:', JSON.stringify(walletSetData, null, 2));
        throw new Error('Wallet set ID missing from Circle response');
      }

      this.walletSetId = walletSetId;
      console.log(`✅ Wallet set created: ${walletSetId}`);
      console.log('   ⚠️  Add this value to your .env: CIRCLE_WALLET_SET_ID=${walletSetId}');

      return walletSet;
    } catch (error: any) {
      const errorDetails = error.response?.data || error.message;
      console.error('❌ Wallet set creation failed:', errorDetails);
      console.error('   Full error:', JSON.stringify(error.response?.data || error, null, 2));
      
      if (error.response?.status === 401) {
        throw new Error(
          `Authentication failed (401). The entity secret may not be registered.\n` +
          `\n` +
          `💡 Solution: Register your entity secret first:\n` +
          `   POST /api/v1/circle/register-entity-secret\n` +
          `   OR use Circle Console → Developer Services → Configuration → Register Entity Secret\n` +
          `\n` +
          `Other possible causes:\n` +
          `1. API key is incorrect or doesn't have Developer Services permissions\n` +
          `2. Entity secret doesn't match the registered secret\n` +
          `3. Entity secret was registered with a different API key\n` +
          `4. Environment mismatch (sandbox vs production)`
        );
      }
      
      throw new Error(`Failed to create wallet set: ${error.message}`);
    }
  }

  /**
   * List wallets from Circle API
   * Used to find existing wallets by address
   * Uses the correct endpoint: /v1/w3s/wallets (not /v1/w3s/developer/wallets)
   */
  private async listWallets(walletSetId?: string): Promise<any[]> {
    try {
      console.log('🔍 Listing wallets from Circle...');
      
      const url = `${this.baseUrl}/v1/w3s/wallets`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const responseData = response.data;
      const walletList = responseData?.wallets || responseData?.data?.wallets || [];
      
      // Filter by walletSetId if provided
      let filteredWallets = Array.isArray(walletList) ? walletList : [];
      if (walletSetId && filteredWallets.length > 0) {
        const beforeCount = filteredWallets.length;
        filteredWallets = filteredWallets.filter((w: any) => w.walletSetId === walletSetId);
        console.log(`   Filtered from ${beforeCount} to ${filteredWallets.length} wallet(s) in wallet set ${walletSetId}`);
      } else {
        console.log(`   Found ${filteredWallets.length} wallet(s) total`);
      }
      
      return filteredWallets;
    } catch (error: any) {
      console.error('❌ Failed to list wallets:', error.response?.data || error.message);
      console.error('   This might mean:');
      console.error('   1. API key doesn\'t have permissions to list wallets');
      console.error('   2. The endpoint requires different authentication');
      console.error('   3. Network or API issue');
      // Don't throw - return empty array if listing fails
      return [];
    }
  }

  /**
   * Find existing wallet by address
   * Searches through all wallets in the wallet set
   */
  private async findWalletByAddress(address: string): Promise<any | null> {
    try {
      if (!address) return null;
      
      const normalizedAddress = address.toLowerCase().trim();
      console.log(`🔍 Searching for existing wallet with address: ${address.substring(0, 10)}...`);
      console.log(`   Normalized address: ${normalizedAddress.substring(0, 10)}...`);
      
      const walletSetId = await this.ensureWalletSet();
      const wallets = await this.listWallets(walletSetId);
      
      console.log(`   Searching through ${wallets.length} wallet(s)...`);
      
      // Log all addresses for debugging
      if (wallets.length > 0) {
        console.log(`   Wallet addresses in set:`);
        wallets.forEach((w: any, index: number) => {
          console.log(`     ${index + 1}. ${w.address || 'N/A'} (ID: ${w.id})`);
        });
      }
      
      const foundWallet = wallets.find((w: any) => {
        const walletAddress = w.address?.toLowerCase().trim();
        const match = walletAddress === normalizedAddress;
        if (match) {
          console.log(`   ✅ Match found! Wallet ID: ${w.id}`);
        }
        return match;
      });
      
      if (foundWallet) {
        console.log(`✅ Found existing wallet: ${foundWallet.id}`);
        console.log(`   Address: ${foundWallet.address}`);
        return foundWallet;
      }
      
      console.log(`ℹ️  No existing wallet found with address: ${address.substring(0, 10)}...`);
      console.log(`   Note: If the wallet was created in Circle Console, it might be in a different wallet set`);
      return null;
    } catch (error: any) {
      console.error('❌ Error searching for wallet by address:', error.message);
      return null;
    }
  }

  /**
   * Create developer-controlled wallet for user
   * Uses direct API calls (not SDK) to ensure fresh ciphertexts
   * If address is provided, checks if wallet already exists in Circle and links it
   * Otherwise creates a new wallet
   * Stores wallet ID in Supabase users table
   */
  async createWallet(request: CreateWalletRequest): Promise<any> {
    try {
      // First, check if user already has a wallet linked
      const { data: user } = await supabase
        .from('users')
        .select('circle_wallet_id')
        .eq('id', request.userId)
        .single();

      if (user?.circle_wallet_id) {
        console.log(`ℹ️  User already has a wallet linked: ${user.circle_wallet_id}`);
        console.log(`   Fetching wallet details...`);
        try {
          const existingWallet = await this.getWallet(user.circle_wallet_id);
          console.log(`✅ Found existing linked wallet`);
          return existingWallet;
        } catch (error: any) {
          console.warn(`⚠️  Linked wallet ${user.circle_wallet_id} not found in Circle, will create/link new one`);
          // Continue to create/link logic below
        }
      }

      // If address is provided, check if wallet already exists in Circle
      if (request.address) {
        console.log(`🔍 Checking if wallet with address ${request.address.substring(0, 10)}... already exists in Circle...`);
        console.log(`   ⚠️  IMPORTANT: If wallet was created in Circle Console, make sure it's in the same wallet set!`);
        console.log(`   Current Wallet Set ID: ${await this.ensureWalletSet()}`);
        
        const existingWallet = await this.findWalletByAddress(request.address);
        
        if (existingWallet) {
          console.log(`✅ Found existing wallet! Linking to user ${request.userId}...`);
          const walletId = existingWallet.id;
          
          // Update database with existing wallet ID and address
          const { error: dbError } = await supabase
            .from('users')
            .update({ 
              circle_wallet_id: walletId,
              address: existingWallet.address || request.address, // Update with Circle's address
              updated_at: new Date().toISOString()
            })
            .eq('id', request.userId);

          if (dbError) {
            console.error('⚠️  Failed to update wallet ID in database:', dbError);
            throw new Error(`Failed to link existing wallet: ${dbError.message}`);
          }

          console.log(`✅ Successfully linked existing wallet ${walletId} to user`);
          console.log(`   Wallet Address: ${existingWallet.address}`);
          return existingWallet;
        }
        
        console.log(`⚠️  No existing wallet found with address ${request.address.substring(0, 10)}...`);
        console.log(`   Possible reasons:`);
        console.log(`   1. Wallet is in a different wallet set`);
        console.log(`   2. Wallet was created with a different API key`);
        console.log(`   3. Address doesn't match exactly`);
        console.log(`   4. List wallets API might not be working correctly`);
        
        throw new Error(
          `Wallet with address ${request.address.substring(0, 10)}... not found in Circle.\n` +
          `If you know the wallet ID, use POST /api/v1/circle/wallet/link with the wallet ID instead.\n` +
          `If the wallet was created in Circle Console, make sure it's in the same wallet set (${await this.ensureWalletSet()}).`
        );
      }

      // Create new wallet
      const walletSetId = await this.ensureWalletSet();
      const idempotencyKey = uuidv4();

      console.log(`📝 Creating new wallet in ${this.environment} environment...`);
      console.log(`   Idempotency Key: ${idempotencyKey}`);
      console.log(`   Wallet Set ID: ${walletSetId}`);

      // Generate fresh ciphertext for this request
      console.log('🔐 Generating fresh entity secret ciphertext...');
      const entitySecretCiphertext = await this.generateFreshCiphertext();

      // Make direct API call to create wallet
      console.log('🚀 Calling Circle W3S create wallet endpoint via direct API...');
      const walletUrl = `${this.baseUrl}/v1/w3s/developer/wallets`;
      console.log(`   URL: ${walletUrl}`);
      console.log(`   Environment: ${this.environment}`);
      console.log(`   API Key prefix: ${this.apiKey.split(':')[0]}`);
      console.log(`   Entity Secret Ciphertext length: ${entitySecretCiphertext.length}`);
      console.log(`   Entity Secret Ciphertext (first 50 chars): ${entitySecretCiphertext.substring(0, 50)}...`);
      
      const requestBody = {
        idempotencyKey,
        accountType: this.walletAccountType,
        blockchains: this.walletBlockchains,
        count: this.walletCount,
        entitySecretCiphertext,
        walletSetId,
      };
      
      console.log(`   Request body (without ciphertext):`, {
        idempotencyKey,
        accountType: this.walletAccountType,
        blockchains: this.walletBlockchains,
        count: this.walletCount,
        walletSetId,
      });
      
      const response = await axios.post(
        walletUrl,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Parse response - Circle returns { data: { wallets: [...] } } structure
      const responseData = response.data;
      
      // Handle both response structures: { wallets: [...] } or { data: { wallets: [...] } }
      let walletList: any[] = [];
      if (responseData?.wallets) {
        // Direct structure: { wallets: [...] }
        walletList = responseData.wallets;
      } else if (responseData?.data?.wallets) {
        // Nested structure: { data: { wallets: [...] } }
        walletList = responseData.data.wallets;
      }
      
      if (!Array.isArray(walletList) || walletList.length === 0) {
        console.error('Unexpected wallet creation response:', JSON.stringify(responseData, null, 2));
        throw new Error('Wallet not returned from Circle API - wallets array is empty or missing');
      }

      const wallet = walletList[0];
      const walletId = wallet?.id;

      if (!walletId) {
        console.error('Wallet object:', JSON.stringify(wallet, null, 2));
        throw new Error('Wallet ID not found in response');
      }

      console.log('✅ Wallet created successfully');
      console.log(`   Wallet ID: ${walletId}`);
      console.log(`   Address: ${wallet?.address || 'N/A'}`);
      console.log(`   Blockchain: ${wallet?.blockchain || 'N/A'}`);
      console.log(`   State: ${wallet?.state || 'N/A'}`);

      // Store wallet ID in database

      const { error: dbError } = await supabase
        .from('users')
        .update({ 
          circle_wallet_id: walletId,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.userId);

      if (dbError) {
        console.error('⚠️  Failed to update wallet ID in database:', dbError);
        // Don't throw - wallet was created successfully
      }

      return wallet;
    } catch (error: any) {
      const errorData = error.response?.data || error.message;
      const errorCode = errorData?.code;
      const errorMessage = errorData?.message || error.message;
      console.error('❌ Wallet creation failed:', errorData);
      
      // Handle ciphertext reuse error (code 156004)
      if (errorCode === 156004 || errorMessage?.includes('Reusing an entity secret ciphertext')) {
        console.error('   ⚠️  Error: Entity secret ciphertext was reused');
        console.error('   💡 The SDK should automatically generate fresh ciphertexts for each request.');
        console.error('   🔍 This might indicate an SDK issue or caching problem.');
        console.error('   💡 Try:');
        console.error('      1. Restart the server to clear any cached state');
        console.error('      2. Ensure you\'re using the latest SDK version');
        console.error('      3. Verify the SDK client is properly initialized with entitySecret');
        throw new Error(
          `Entity secret ciphertext reuse error (code ${errorCode}).\n` +
          `The SDK should automatically generate fresh ciphertexts, but this error suggests it may not be working.\n\n` +
          `Possible solutions:\n` +
          `1. Restart the server to clear any cached state\n` +
          `2. Ensure you're using the latest @circle-fin/developer-controlled-wallets SDK\n` +
          `3. Verify CIRCLE_ENTITY_SECRET is set correctly (unencrypted, 64 hex chars)\n` +
          `4. Try creating a new SDK client instance for each request\n` +
          `5. If the issue persists, contact Circle support`
        );
      }
      
      // Provide more helpful error messages
      if (error.response?.status === 401) {
        const errorDetails = error.response?.data || {};
        console.error('   Full error response:', JSON.stringify(errorDetails, null, 2));
        console.error('   Request URL:', error.config?.url);
        console.error('   API Key used:', `${this.apiKey.split(':')[0]}:${this.apiKey.split(':')[1]?.substring(0, 8)}...`);
        console.error('   Base URL:', this.baseUrl);
        console.error('   Environment:', this.environment);
        
        const helpfulMessage = 
          `Invalid credentials (401). Details:\n` +
          `- URL: ${error.config?.url || 'N/A'}\n` +
          `- Environment: ${this.environment}\n` +
          `- API Key prefix: ${this.apiKey.split(':')[0]}\n\n` +
          `Possible issues:\n` +
          `1. Entity secret ciphertext doesn't match the registered entity secret\n` +
          `2. Entity secret was registered with a different API key\n` +
          `3. Base URL mismatch - TEST_API_KEY should use https://api-sandbox.circle.com\n` +
          `4. The entity secret in CIRCLE_ENTITY_SECRET doesn't match what was registered\n` +
          `5. Try regenerating and re-registering the entity secret`;
        throw new Error(`Wallet creation failed: ${error.message}\n${helpfulMessage}`);
      }
      
      throw new Error(`Wallet creation failed: ${error.message}`);
    }
  }

  /**
   * Get wallet by ID
   */
  async getWallet(walletId: string): Promise<any> {
    try {
      const response = await this.dcWalletClient.getWallet({ id: walletId });
      return response.data?.wallet || response.data;
    } catch (error: any) {
      console.error('❌ Get wallet failed:', error.response?.data || error.message);
      throw new Error(`Failed to get wallet: ${error.message}`);
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(walletId: string): Promise<any> {
    try {
      const response = await this.dcWalletClient.getWalletTokenBalance({ id: walletId });
      return response.data?.tokenBalances || response.data || [];
    } catch (error: any) {
      console.error('❌ Get balance failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get wallet by user ID (from database)
   */
  async getWalletByUserId(userId: string): Promise<any> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('circle_wallet_id')
        .eq('id', userId)
        .single();

      if (error || !user?.circle_wallet_id) {
        throw new Error('Wallet not found for user');
      }

      return this.getWallet(user.circle_wallet_id);
    } catch (error: any) {
      console.error('❌ Get wallet by user ID failed:', error.message);
      throw error;
    }
  }

  /**
   * Transfer USDC from Circle wallet to Arc chain
   * Uses W3S API for developer-controlled wallets
   * Arc is Circle's own blockchain, so it's fully supported!
   */
  async transferToArc(request: TransferToArcRequest): Promise<any> {
    try {
      const idempotencyKey = uuidv4();

      console.log('📤 Initiating transfer to Arc chain...');
      console.log(`   Wallet ID: ${request.walletId}`);
      console.log(`   Destination: ${request.destinationAddress}`);
      console.log(`   Amount: ${request.amount} USDC`);

      // Generate fresh ciphertext for authentication
      const entitySecretCiphertext = await this.generateFreshCiphertext();

      // Use W3S API for developer-controlled wallets
      // Arc chain identifier: 'ARC' for mainnet, 'ARC-TESTNET' for testnet
      const blockchain = this.environment === 'sandbox' ? 'ARC-TESTNET' : 'ARC-TESTNET';
      
      // Build request according to Circle API reference:
      // https://developers.circle.com/api-reference/wallets/developer-controlled-wallets/create-developer-transaction-transfer
      const transferRequest: any = {
        idempotencyKey,
        entitySecretCiphertext,
        walletId: request.walletId, // Required: wallet ID
        destinationAddress: request.destinationAddress, // Required: destination blockchain address
        blockchain: blockchain, // Required: blockchain identifier
        amounts: [request.amount], // Required: array of strings in decimal format
        feeLevel: 'MEDIUM', // Required: fee level (LOW, MEDIUM, or HIGH) - required when gasPrice/gasLimit not set
        // For USDC, we may need to specify tokenId or tokenAddress
        // If not specified, it will transfer native token (if Arc supports it)
        // For USDC on Arc, we might need to add: tokenId or tokenAddress + tokenBlockchain
      };

      console.log(`   Blockchain: ${blockchain}`);
      console.log(`   Environment: ${this.environment}`);
      console.log(`   Amount: ${request.amount} (as array: [${transferRequest.amounts.join(', ')}])`);

      // Use W3S transactions endpoint
      const url = `${this.baseUrl}/v1/w3s/developer/transactions/transfer`;
      
      const response = await axios.post(url, transferRequest, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      // Parse response - API returns { data: { id, state } }
      const responseData = response.data;
      const transferData = responseData?.data || responseData;
      const transferId = transferData?.id;
      const transferState = transferData?.state;
      
      if (!transferId) {
        console.error('Unexpected transfer response:', JSON.stringify(responseData, null, 2));
        throw new Error('Transfer ID not found in response');
      }

      console.log('✅ Transfer initiated to Arc:', transferId);
      console.log(`   State: ${transferState || 'INITIATED'}`);

      // Log transfer to ledger
      if (request.userId) {
        await this.logTransfer(request.userId, {
          transferId: transferId,
          amount: request.amount,
          destination: request.destinationAddress,
          status: transferState || 'INITIATED',
        });

        // Start polling for transfer status (in background)
        this.pollTransferStatus(transferId, request.userId).catch(err => {
          console.error('⚠️  Transfer status polling error:', err);
        });
      }

      return {
        id: transferId,
        state: transferState || 'INITIATED',
        ...transferData,
      };
    } catch (error: any) {
      console.error('❌ Transfer failed:', error.response?.data || error.message);
      
      // Handle specific Circle API errors
      if (error.response?.status === 400) {
        const errorMessage = error.response.data?.message || error.message;
        const errorCode = error.response.data?.code;
        console.error(`   Error code: ${errorCode}`);
        throw new Error(`Transfer validation failed: ${errorMessage}`);
      }
      
      if (error.response?.status === 403) {
        const errorMessage = error.response.data?.message || error.message;
        const errorCode = error.response.data?.code;
        console.error(`   Error code: ${errorCode}`);
        console.error('   Possible issues:');
        console.error('   1. API key doesn\'t have transfer permissions');
        console.error('   2. Wallet doesn\'t have sufficient balance');
        console.error('   3. Wallet is not in the correct state (must be LIVE)');
        console.error('   4. Entity secret ciphertext is invalid or not registered');
        throw new Error(`Transfer forbidden (403): ${errorMessage}`);
      }
      
      // Check if transfer failed due to temporary issues - retry if appropriate
      if (error.response?.status >= 500 || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        console.warn('⚠️  Temporary error - transfer may be retried:', error.message);
        // The error will be caught and can be retried
      }
      
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }

  /**
   * Create deposit address for user wallet
   * Returns an address where users can send USDC to deposit into their wallet
   * Note: Circle SDK may use different method name - check actual API
   */
  async createDepositAddress(walletId: string): Promise<any> {
    console.warn('⚠️  Deposit address creation is not yet implemented for W3S developer-controlled wallets');
    throw new Error('Deposit address creation is not supported for developer-controlled wallets in this build');
  }

  /**
   * Handle webhook notifications from Circle
   * Verifies signature and processes transfer/payment notifications
   * 
   * Circle webhook payload structure:
   * {
   *   notificationType: 'transfers' | 'payments' | 'wallets',
   *   notification: { ... }
   * }
   */
  async handleWebhook(payload: any, signature?: string): Promise<void> {
    try {
      // Verify webhook signature
      const isValid = await this.verifyWebhookSignature(payload, signature);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }
      
      const { notificationType, notification } = payload;

      if (!notificationType || !notification) {
        throw new Error('Invalid webhook payload structure');
      }

      switch (notificationType) {
        case 'transfers':
          await this.handleTransferNotification(notification);
          break;
        case 'payments':
          await this.handlePaymentNotification(notification);
          break;
        case 'wallets':
          await this.handleWalletNotification(notification);
          break;
        default:
          console.log('⚠️  Unhandled notification type:', notificationType);
      }
    } catch (error: any) {
      console.error('❌ Webhook handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   * Circle webhooks use HMAC-SHA256 with the webhook secret
   */
  private async verifyWebhookSignature(payload: any, signature?: string): Promise<boolean> {
    const webhookSecret = process.env.CIRCLE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.warn('⚠️  CIRCLE_WEBHOOK_SECRET not set - skipping signature verification');
      // In development, allow without secret; in production, this should fail
      return process.env.NODE_ENV === 'development';
    }

    if (!signature) {
      console.warn('⚠️  No webhook signature provided');
      return false;
    }

    try {
      // Circle webhook signature format: "sha256=<hash>"
      const signatureHash = signature.replace('sha256=', '');
      
      // Create HMAC hash of the payload
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(payloadString);
      const computedHash = hmac.digest('hex');

      // Compare signatures (constant-time comparison to prevent timing attacks)
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signatureHash, 'hex'),
        Buffer.from(computedHash, 'hex')
      );

      if (!isValid) {
        console.error('❌ Webhook signature verification failed');
      }

      return isValid;
    } catch (error: any) {
      console.error('❌ Webhook signature verification error:', error.message);
      return false;
    }
  }

  /**
   * Handle transfer notification from Circle
   * Updates ledger and creates audit logs
   */
  private async handleTransferNotification(notification: any): Promise<void> {
    try {
      const transferId = notification?.id || notification?.transferId;
      console.log('📥 Transfer notification received:', transferId);

      const transfer = notification;
      const status = transfer?.status || notification?.state;
      
      // Update ledger entry if exists (search by transfer ID)
      const { data: ledgerEntries, error: findError } = await supabase
        .from('ledger')
        .select('*')
        .eq('tx_hash', transferId)
        .limit(1);

      if (ledgerEntries && ledgerEntries.length > 0) {
        const ledgerEntry = ledgerEntries[0];
        const { error: updateError } = await supabase
          .from('ledger')
          .update({
            status: status === 'complete' || status === 'completed' ? 'completed' : status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', ledgerEntry.id);

        if (updateError) {
          console.error('⚠️  Failed to update ledger:', updateError);
        } else {
          console.log('✅ Ledger updated for transfer:', transferId);
        }

        // Create audit log
        await supabase.from('audit_logs').insert({
          action_id: ledgerEntry.id,
          user_id: ledgerEntry.user_id,
          action_type: 'transfer_notification',
          inputs: { transferId, previousStatus: ledgerEntry.status },
          outputs: { transferId, newStatus: status, transfer },
          created_at: new Date().toISOString(),
        });
      } else {
        console.log('⚠️  No ledger entry found for transfer:', transferId);
      }
    } catch (error: any) {
      console.error('❌ Transfer notification handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Handle payment notification from Circle
   * Processes incoming deposits and updates ledger
   */
  private async handlePaymentNotification(notification: any): Promise<void> {
    try {
      const paymentId = notification?.id || notification?.paymentId;
      console.log('💳 Payment notification received:', paymentId);

      const payment = notification;
      const status = payment?.status || notification?.state;
      
      // If payment is completed, create ledger entry for deposit
      if (status === 'complete' || status === 'completed') {
        // Extract user ID from payment metadata or find by wallet
        const walletId = payment?.source?.id || payment?.walletId;
        
        if (walletId) {
          // Find user by wallet ID
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('circle_wallet_id', walletId)
            .single();

          if (user && !userError) {
            // Create deposit ledger entry using double-entry accounting
            const { getLedgerService } = await import('../ledger/ledgerService');
            const ledgerService = getLedgerService();
            
            const amount = parseFloat(payment?.amount?.amount || '0');
            
            // Double-entry: debit external, credit wallet
            await ledgerService.createDoubleEntry(
              user.id,
              'deposit',
              'external', // Debit: money from external source
              'wallet',   // Credit: money enters wallet
              amount,
              payment?.amount?.currency || 'USDC',
              `Deposit from ${payment?.source?.type || 'external source'}`,
              {
                paymentId,
                source: payment?.source,
              }
            );

            // Also create single entry with transaction hash
            await ledgerService.createEntry(
              user.id,
              'deposit',
              'credit',
              amount,
              payment?.amount?.currency || 'USDC',
              'wallet',
              `Deposit: ${amount} ${payment?.amount?.currency || 'USDC'}`,
              undefined,
              paymentId,
              {
                paymentId,
                status: 'completed',
              }
            );

            console.log('✅ Deposit logged for user:', user.id);
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Payment notification handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Handle wallet notification from Circle
   */
  private async handleWalletNotification(notification: any): Promise<void> {
    console.log('👛 Wallet notification:', notification.id);
    // Handle wallet-related events
  }

  /**
   * Log transfer to ledger (using double-entry accounting)
   */
  private async logTransfer(userId: string, transferData: any): Promise<void> {
    try {
      const { getLedgerService } = await import('../ledger/ledgerService');
      const ledgerService = getLedgerService();

      // Create double-entry: debit wallet, credit external (withdrawal)
      await ledgerService.createDoubleEntry(
        userId,
        'withdraw',
        'wallet', // Debit: money leaves wallet
        'external', // Credit: money goes to external address
        parseFloat(transferData.amount),
        'USDC',
        `Transfer to ${transferData.destination || 'external address'}`,
        {
          transferId: transferData.transferId,
          destination: transferData.destination,
          routeId: transferData.routeId,
        }
      );

      // Also create a single entry with transaction hash for tracking
      await ledgerService.createEntry(
        userId,
        'withdraw',
        'debit',
        parseFloat(transferData.amount),
        'USDC',
        'wallet',
        `Withdrawal: ${transferData.amount} USDC`,
        transferData.destination,
        transferData.transferId,
        {
          transferId: transferData.transferId,
          status: transferData.status,
        }
      );
    } catch (error: any) {
      console.error('❌ Log transfer failed:', error.message);
    }
  }

  /**
   * Get supported chains for transfers
   */
  async getSupportedChains(): Promise<string[]> {
    // Circle supports Arc (their own blockchain) and other major chains
    return ['ARC', 'ETH', 'MATIC', 'AVAX', 'TRX'];
  }

  /**
   * Poll transfer status until completion or failure
   * Uses exponential backoff with max retries
   */
  private async pollTransferStatus(
    transferId: string,
    userId: string,
    maxRetries: number = 30,
    initialDelay: number = 2000
  ): Promise<void> {
    let retries = 0;
    let delay = initialDelay;
    let consecutive403Errors = 0;
    const maxConsecutive403Errors = 3; // Stop polling after 3 consecutive 403 errors

    while (retries < maxRetries) {
      try {
        await new Promise(resolve => setTimeout(resolve, delay));

        // Get transfer status from Circle W3S API
        const transfer = await this.getTransferStatus(transferId);
        // W3S API uses 'state' field, not 'status'
        const state = transfer?.state || transfer?.status;

        console.log(`📊 Transfer ${transferId} state: ${state} (attempt ${retries + 1}/${maxRetries})`);

        // Reset 403 error counter on success
        consecutive403Errors = 0;

        // Check if transfer is complete (W3S uses uppercase states: COMPLETE, COMPLETED, CONFIRMED)
        // COMPLETE = fully completed, COMPLETED = also completed, CONFIRMED = confirmed on blockchain
        if (state === 'COMPLETE' || state === 'COMPLETED' || state === 'CONFIRMED' || 
            state === 'complete' || state === 'completed' || state === 'confirmed' || state === 'success') {
          console.log('✅ Transfer completed:', transferId);
          
          // Update ledger
          await this.updateTransferStatus(transferId, userId, 'completed');
          return; // Stop polling - transfer is done
        }

        // Check if transfer failed (W3S uses uppercase states)
        if (state === 'FAILED' || state === 'DENIED' || state === 'CANCELLED' || 
            state === 'failed' || state === 'error' || state === 'denied' || state === 'cancelled') {
          console.error(`❌ Transfer ${state.toLowerCase()}:`, transferId);
          
          // Update ledger
          await this.updateTransferStatus(transferId, userId, 'failed');
          
          // Optionally retry the transfer
          await this.retryFailedTransfer(transferId, userId, transfer);
          return; // Stop polling - transfer failed
        }

        // Exponential backoff: increase delay up to 30 seconds
        delay = Math.min(delay * 1.5, 30000);
        retries++;
      } catch (error: any) {
        const statusCode = error.response?.status;
        
        // Handle 404 errors - transaction might not be immediately available or endpoint doesn't exist
        if (statusCode === 404) {
          consecutive403Errors++; // Reuse counter for 404s too
          if (consecutive403Errors <= 3) {
            // First few 404s might be normal (transaction not immediately available)
            console.log(`ℹ️  Transfer ${transferId} not found yet (404) - will retry (attempt ${consecutive403Errors}/3)`);
          } else {
            console.error(`❌ Stopping polling for transfer ${transferId} - persistent 404 errors`);
            console.error('   💡 The transaction status endpoint may not be available for developer-controlled wallets.');
            console.error('   💡 Transfer was initiated successfully - check status in Circle Console or via webhooks.');
            return;
          }
        }
        // Handle 403 errors specially - likely means endpoint doesn't exist or auth is wrong
        else if (statusCode === 403) {
          consecutive403Errors++;
          console.error(`⚠️  Error polling transfer ${transferId} (403 Forbidden, ${consecutive403Errors}/${maxConsecutive403Errors}):`, error.message);
          
          // Stop polling if we get too many 403 errors (endpoint likely doesn't exist or requires different auth)
          if (consecutive403Errors >= maxConsecutive403Errors) {
            console.error(`❌ Stopping polling for transfer ${transferId} - persistent 403 errors suggest endpoint/auth issue`);
            console.error('   💡 Transfer was initiated successfully, but status polling is not available.');
            console.error('   💡 Check transfer status manually in Circle Console or via webhooks.');
            return;
          }
        } else {
          console.error(`⚠️  Error polling transfer ${transferId}:`, error.message);
          consecutive403Errors = 0; // Reset counter for other errors
        }
        
        retries++;
        delay = Math.min(delay * 1.5, 30000);
      }
    }

    console.warn(`⚠️  Transfer ${transferId} polling timeout after ${maxRetries} attempts`);
  }

  /**
   * Get transfer status from Circle W3S API
   * Uses the correct endpoint: GET /v1/w3s/transactions/{id}
   * Reference: https://developers.circle.com/api-reference/wallets/developer-controlled-wallets/get-transaction
   */
  private async getTransferStatus(transferId: string): Promise<any> {
    try {
      // Use the correct endpoint: /v1/w3s/transactions/{id} (not /developer/transactions)
      const url = `${this.baseUrl}/v1/w3s/transactions/${transferId}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      // Parse response - API returns { data: { transaction: { id, state, ... } } }
      // Reference: https://developers.circle.com/api-reference/wallets/developer-controlled-wallets/get-transaction
      const responseData = response.data;
      const transaction = responseData?.data?.transaction || responseData?.transaction || responseData;
      
      if (!transaction) {
        console.error('Unexpected transaction response:', JSON.stringify(responseData, null, 2));
        throw new Error('Transaction data not found in response');
      }
      
      return transaction;
    } catch (error: any) {
      console.error('❌ Get transfer status failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Update transfer status in ledger
   */
  private async updateTransferStatus(
    transferId: string,
    userId: string,
    status: string
  ): Promise<void> {
    try {
      const { data: ledgerEntries } = await supabase
        .from('ledger')
        .select('*')
        .eq('tx_hash', transferId)
        .limit(1);

      if (ledgerEntries && ledgerEntries.length > 0) {
        await supabase
          .from('ledger')
          .update({
            status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', ledgerEntries[0].id);
      }
    } catch (error: any) {
      console.error('⚠️  Failed to update transfer status:', error);
    }
  }

  /**
   * Retry failed transfer with exponential backoff
   */
  private async retryFailedTransfer(
    transferId: string,
    userId: string,
    failedTransfer: any
  ): Promise<void> {
    const maxRetries = 3;
    let retries = 0;
    let delay = 5000; // Start with 5 seconds

    // Extract original transfer details
    const originalAmount = failedTransfer?.amount?.amount;
    const originalDestination = failedTransfer?.destination?.address;

    if (!originalAmount || !originalDestination) {
      console.error('❌ Cannot retry transfer - missing original details');
      return;
    }

    // Get user's wallet
    const { data: user } = await supabase
      .from('users')
      .select('circle_wallet_id')
      .eq('id', userId)
      .single();

    if (!user?.circle_wallet_id) {
      console.error('❌ Cannot retry transfer - wallet not found');
      return;
    }

    while (retries < maxRetries) {
      try {
        console.log(`🔄 Retrying transfer ${transferId} (attempt ${retries + 1}/${maxRetries})...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));

        // Retry the transfer
        const retryResult = await this.transferToArc({
          walletId: user.circle_wallet_id,
          destinationAddress: originalDestination,
          amount: originalAmount,
          userId,
        });

        console.log('✅ Transfer retry successful:', retryResult?.id || retryResult?.transferId);
        return;

      } catch (error: any) {
        console.error(`⚠️  Transfer retry ${retries + 1} failed:`, error.message);
        retries++;
        delay = Math.min(delay * 2, 60000); // Exponential backoff, max 60 seconds
      }
    }

    console.error(`❌ Transfer ${transferId} failed after ${maxRetries} retry attempts`);
    
    // Create audit log for failed retries
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: 'transfer_retry_failed',
      inputs: { transferId, retries: maxRetries },
      outputs: { error: 'Max retries exceeded' },
      created_at: new Date().toISOString(),
    });
  }
}

export default CircleService;

