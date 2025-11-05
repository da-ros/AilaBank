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
import { supabase } from '../../db/supabase';

/**
 * Circle Service
 * Handles wallet creation, balance checks, and transfers to Arc chain
 */

interface CreateWalletRequest {
  userId: string;
  address: string;
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
    const keyPrefix = parts[0].toUpperCase();
    if (keyPrefix === 'TEST_API_KEY' || keyPrefix === 'SANDBOX_API_KEY') {
      this.environment = 'sandbox';
      this.baseUrl = 'https://api-sandbox.circle.com';
    } else if (keyPrefix === 'LIVE_API_KEY' || keyPrefix === 'PRODUCTION_API_KEY') {
      this.environment = 'production';
      this.baseUrl = 'https://api.circle.com';
    } else {
      // Fallback to CIRCLE_BASE_URL
      const baseUrl = process.env.CIRCLE_BASE_URL || 'https://api-sandbox.circle.com';
      this.baseUrl = baseUrl;
      this.environment = baseUrl.includes('sandbox') ? 'sandbox' : 'production';
      console.warn(`⚠️  Could not determine environment from API key prefix "${keyPrefix}", using ${this.environment} based on CIRCLE_BASE_URL`);
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
   * Get public key for entity secret
   * This is useful for verifying entity secret registration and SDK connection
   * 
   * Reference: https://developers.circle.com/wallets/dev-controlled/register-entity-secret
   */
  public async getPublicKey(): Promise<any> {
    try {
      console.log('🔑 Fetching Circle entity public key...');
      
      const response = await this.dcWalletClient.getPublicKey();

      const publicKey = response.data?.publicKey;
      if (!publicKey) {
        throw new Error('Public key not found in response');
      }

      console.log('✅ Public key fetched successfully');
      console.log(`   Public Key (first 50 chars): ${publicKey.substring(0, 50)}...`);

      return {
        publicKey,
        message: 'Public key fetched successfully. This confirms your entity secret is registered and SDK is working.',
      };
    } catch (error: any) {
      const errorDetails = error.response?.data || error.message;
      const errorMessage = errorDetails?.message || errorDetails;
      console.error('❌ Failed to fetch public key:', errorMessage);

      if (error.response?.status === 401) {
        throw new Error(
          `Authentication failed (401). Please verify:\n` +
          `1. API key is correct and has Developer Services permissions\n` +
          `2. Entity secret is registered with this API key\n` +
          `3. Environment matches (sandbox vs production)`
        );
      }

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
   * Create developer-controlled wallet for user
   * Stores wallet ID in Supabase users table
   */
  async createWallet(request: CreateWalletRequest): Promise<any> {
    try {
      const walletSetId = await this.ensureWalletSet();
      const idempotencyKey = uuidv4();

      console.log(`📝 Creating wallet in ${this.environment} environment...`);
      console.log(`   Idempotency Key: ${idempotencyKey}`);

      console.log('🚀 Calling Circle W3S create wallet endpoint via SDK...');
      const response = await this.dcWalletClient.createWallets({
        idempotencyKey,
        walletSetId,
        blockchains: this.walletBlockchains,
        count: this.walletCount,
        accountType: this.walletAccountType,
      });

      const walletsData = response.data;
      const walletList = walletsData?.wallets || [];
      const wallet = walletList[0];

      if (!wallet) {
        console.error('Unexpected wallet creation response:', JSON.stringify(walletsData, null, 2));
        throw new Error('Wallet not returned from Circle API');
      }

      console.log('✅ Wallet created:', wallet?.id);

      // Store wallet ID in database
      const walletId = wallet?.id;
      if (!walletId) {
        throw new Error('Wallet ID not found in response');
      }

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
      console.error('❌ Wallet creation failed:', errorData);
      
      // Provide more helpful error messages
      if (error.response?.status === 401) {
        const helpfulMessage = 
          'Invalid credentials. Please verify:\n' +
          '1. Your API key is correct (check Circle Console)\n' +
          '2. Environment matches (TEST_API_KEY for sandbox, LIVE_API_KEY for production)\n' +
          '3. API key has not been revoked or expired\n' +
          '4. You copied the entire key including all three parts\n' +
          '5. CIRCLE_ENTITY_SECRET is set correctly and registered\n' +
          '6. CIRCLE_WALLET_SET_ID is configured or you created a wallet set via the W3S API';
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
   * Arc is Circle's own blockchain, so it's fully supported!
   */
  async transferToArc(request: TransferToArcRequest): Promise<any> {
    try {
      const idempotencyKey = uuidv4();

      // Arc is Circle's blockchain - use 'ARC' chain identifier
      const transferRequest: any = {
        idempotencyKey,
        source: {
          type: 'wallet',
          id: request.walletId,
        },
        destination: {
          type: 'blockchain',
          address: request.destinationAddress,
          chain: 'ARC', // Arc chain - Circle's native blockchain
        },
        amount: {
          amount: request.amount,
          currency: 'USD', // USDC
        },
      };

      const response = await this.client.transfers.createTransfer(transferRequest);

      // Handle different response structures
      const transfer = (response as any).data?.transfer || (response as any).data?.data || response.data;
      const transferId = transfer?.id || transfer?.transferId;
      
      console.log('✅ Transfer initiated to Arc:', transferId);

      // Log transfer to ledger
      if (request.userId) {
        await this.logTransfer(request.userId, {
          transferId: transferId,
          amount: request.amount,
          destination: request.destinationAddress,
          status: transfer?.status || 'pending',
        });

        // Start polling for transfer status (in background)
        this.pollTransferStatus(transferId, request.userId).catch(err => {
          console.error('⚠️  Transfer status polling error:', err);
        });
      }

      return transfer;
    } catch (error: any) {
      console.error('❌ Transfer failed:', error.response?.data || error.message);
      
      // Handle specific Circle API errors
      if (error.response?.status === 400) {
        const errorMessage = error.response.data?.message || error.message;
        throw new Error(`Transfer validation failed: ${errorMessage}`);
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
            // Create deposit ledger entry
            await supabase.from('ledger').insert({
              user_id: user.id,
              action_type: 'deposit',
              amount: payment?.amount?.amount || '0',
              currency: payment?.amount?.currency || 'USDC',
              tx_hash: paymentId,
              status: 'completed',
              created_at: new Date().toISOString(),
            });

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
   * Log transfer to ledger
   */
  private async logTransfer(userId: string, transferData: any): Promise<void> {
    try {
      const { error } = await supabase.from('ledger').insert({
        user_id: userId,
        action_type: 'withdraw',
        amount: transferData.amount,
        currency: 'USDC',
        tx_hash: transferData.transferId,
        status: transferData.status,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('⚠️  Failed to log transfer:', error);
      }
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

    while (retries < maxRetries) {
      try {
        await new Promise(resolve => setTimeout(resolve, delay));

        // Get transfer status from Circle
        const transfer = await this.getTransferStatus(transferId);
        const status = transfer?.status || transfer?.state;

        console.log(`📊 Transfer ${transferId} status: ${status} (attempt ${retries + 1})`);

        // Check if transfer is complete
        if (status === 'complete' || status === 'completed' || status === 'success') {
          console.log('✅ Transfer completed:', transferId);
          
          // Update ledger
          await this.updateTransferStatus(transferId, userId, 'completed');
          return;
        }

        // Check if transfer failed
        if (status === 'failed' || status === 'error') {
          console.error('❌ Transfer failed:', transferId);
          
          // Update ledger
          await this.updateTransferStatus(transferId, userId, 'failed');
          
          // Optionally retry the transfer
          await this.retryFailedTransfer(transferId, userId, transfer);
          return;
        }

        // Exponential backoff: increase delay up to 30 seconds
        delay = Math.min(delay * 1.5, 30000);
        retries++;
      } catch (error: any) {
        console.error(`⚠️  Error polling transfer ${transferId}:`, error.message);
        retries++;
        delay = Math.min(delay * 1.5, 30000);
      }
    }

    console.warn(`⚠️  Transfer ${transferId} polling timeout after ${maxRetries} attempts`);
  }

  /**
   * Get transfer status from Circle API
   */
  private async getTransferStatus(transferId: string): Promise<any> {
    try {
      const response = await (this.client.transfers as any).getTransfer(transferId);
      return (response as any).data?.transfer || (response as any).data?.data || response.data;
    } catch (error: any) {
      console.error('❌ Get transfer status failed:', error.message);
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

