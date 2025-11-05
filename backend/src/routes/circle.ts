import express, { Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import CircleService from '../services/circle/circleService';

const router = express.Router();
const circleService = new CircleService();

/**
 * GET /api/v1/circle/wallet
 * Get user's Circle wallet information
 */
router.get('/wallet', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const wallet = await circleService.getWalletByUserId(userId);

    res.json({
      success: true,
      wallet: {
        id: wallet?.id || wallet?.walletId,
        balances: wallet?.balances || [],
        state: wallet?.state || wallet?.status,
      },
    });
  } catch (error: any) {
    console.error('Get wallet error:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'Wallet not found',
    });
  }
});

/**
 * GET /api/v1/circle/public-key
 * Get Circle entity public key (useful for verifying SDK connection and entity secret registration)
 * 
 * This endpoint confirms:
 * - API key is valid and has Developer Services permissions
 * - Entity secret is registered
 * - SDK connection is working
 */
router.get('/public-key', authenticateUser, async (req: Request, res: Response) => {
  try {
    const result = await circleService.getPublicKey();

    res.json({
      success: true,
      publicKey: result.publicKey,
      message: result.message,
      note: 'If you see this, your SDK connection is working and entity secret is registered!',
    });
  } catch (error: any) {
    console.error('Get public key error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to fetch public key',
    });
  }
});

/**
 * POST /api/v1/circle/register-entity-secret
 * Register entity secret with Circle (required before creating wallet sets/wallets)
 * 
 * This is a one-time setup step. The SDK automatically handles encryption.
 * 
 * Reference: https://developers.circle.com/wallets/dev-controlled/register-entity-secret
 * 
 * Body (optional):
 *   {
 *     "recoveryFileDownloadPath": "./recovery-file.json",  // Optional: path to save recovery file
 *     "forceOverwrite": false  // Optional: set to true to explicitly overwrite existing registration
 *   }
 * 
 * Response:
 *   {
 *     "success": true,
 *     "message": "Entity secret registered successfully!",
 *     "recoveryFile": { ... },  // Save this securely!
 *     "warning": "⚠️  Save the recovery file securely - you'll need it if you lose your entity secret!"
 *   }
 */
router.post('/register-entity-secret', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { recoveryFileDownloadPath, forceOverwrite } = req.body;
    const result = await circleService.registerEntitySecret(recoveryFileDownloadPath, forceOverwrite);

    res.json({
      success: true,
      message: 'Entity secret registered successfully!',
      recoveryFile: result?.recoveryFile,
      warning: '⚠️  Save the recovery file securely - you\'ll need it if you lose your entity secret!',
      nextSteps: [
        'Create a wallet set: POST /api/v1/circle/wallet-set/create',
        'Create wallets: POST /api/v1/circle/wallet/create',
      ],
    });
  } catch (error: any) {
    console.error('Register entity secret error:', error);
    
    // Handle already registered case
    if (error.message?.includes('already registered')) {
      res.status(400).json({
        success: false,
        error: error.message,
        note: 'Entity secret is already registered. You can proceed with wallet creation.',
      });
    } else {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to register entity secret',
      });
    }
  }
});

/**
 * POST /api/v1/circle/wallet-set/create
 * Create a Circle wallet set (developer-controlled wallets)
 * Note: Wallet sets are project-scoped; create once and store the ID in env
 * IMPORTANT: Entity secret must be registered first!
 */
router.post('/wallet-set/create', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const walletSet = await circleService.createWalletSet(name);

    res.json({
      success: true,
      walletSet,
      message: 'Wallet set created. Update your environment with CIRCLE_WALLET_SET_ID to reuse it.',
    });
  } catch (error: any) {
    console.error('Create wallet set error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create wallet set',
    });
  }
});

/**
 * POST /api/v1/circle/wallet/create
 * Create a new Circle wallet for authenticated user
 */
router.post('/wallet/create', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userEmail = (req as any).user.email;
    const address = req.body.address || (req as any).user.address;

    console.log(`📝 Wallet creation request - User ID: ${userId}, Email: ${userEmail}`);

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address is required',
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const wallet = await circleService.createWallet({
      userId,
      address,
    });

    res.json({
      success: true,
      wallet: {
        id: wallet?.id || wallet?.walletId,
        state: wallet?.state || wallet?.status,
      },
    });
  } catch (error: any) {
    console.error('Create wallet error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create wallet',
    });
  }
});

/**
 * GET /api/v1/circle/wallet/balance
 * Get wallet balance
 */
router.get('/wallet/balance', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const wallet = await circleService.getWalletByUserId(userId);
    const walletId = wallet?.id || wallet?.walletId;
    const balances = await circleService.getWalletBalance(walletId);

    res.json({
      success: true,
      balances,
    });
  } catch (error: any) {
    console.error('Get balance error:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'Failed to get balance',
    });
  }
});

/**
 * POST /api/v1/circle/wallet/deposit-address
 * Create a deposit address for user wallet
 */
router.post('/wallet/deposit-address', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const wallet = await circleService.getWalletByUserId(userId);
    const walletId = wallet?.id || wallet?.walletId;
    const address = await circleService.createDepositAddress(walletId);

    res.json({
      success: true,
      address: address.address,
      chain: address.chain,
    });
  } catch (error: any) {
    console.error('Create deposit address error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create deposit address',
    });
  }
});

/**
 * POST /api/v1/circle/transfer/arc
 * Transfer USDC from Circle wallet to Arc chain
 */
router.post('/transfer/arc', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { destinationAddress, amount } = req.body;

    if (!destinationAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: 'destinationAddress and amount are required',
      });
    }

    // Get user's wallet
    const wallet = await circleService.getWalletByUserId(userId);
    const walletId = wallet?.id || wallet?.walletId;

    // Initiate transfer
    const transfer = await circleService.transferToArc({
      walletId,
      destinationAddress,
      amount: amount.toString(),
      userId,
    });

    res.json({
      success: true,
      transfer: {
        id: transfer?.id || transfer?.transferId,
        status: transfer?.status || 'pending',
        amount: transfer?.amount?.amount || amount,
        destination: transfer?.destination?.address || destinationAddress,
      },
    });
  } catch (error: any) {
    console.error('Transfer error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Transfer failed',
    });
  }
});

/**
 * POST /api/v1/circle/webhook
 * Handle Circle webhook notifications
 * Note: This endpoint should be publicly accessible (no auth middleware)
 * but should verify webhook signatures
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['circle-signature'] as string;
    const payload = req.body;

    // Process webhook
    await circleService.handleWebhook(payload, signature);

    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    // Still return 200 to prevent Circle from retrying
    res.status(200).json({ received: true, error: error.message });
  }
});

export default router;

