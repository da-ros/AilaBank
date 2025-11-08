/**
 * Best-Execution Receipts API Routes
 * POST /api/v1/receipts/best-exec
 * GET /api/v1/receipts/:id
 */

import express, { Request, Response } from 'express';
import { getReceiptService } from '../services/receipts/receiptService';
import { getQuoteService } from '../services/fx/quoteService';
import { getRouteService } from '../services/corridor/routeService';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();
const receiptService = getReceiptService();

/**
 * POST /api/v1/receipts/best-exec
 * Create a best-execution receipt from quote set and route
 * 
 * Body:
 * {
 *   "from": "EUR",
 *   "to": "USD",
 *   "amount": 1000,
 *   "corridor": "EUR-US",
 *   "userId": "optional-user-id"
 * }
 */
router.post('/receipts/best-exec', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || req.body.userId;
    const { from, to, amount, corridor } = req.body;

    // Validate required parameters
    if (!from || !to || !amount || !corridor) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: from, to, amount, and corridor are required',
        example: {
          from: 'EUR',
          to: 'USD',
          amount: 1000,
          corridor: 'EUR-US',
        },
      });
    }

    // Parse amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'amount must be a positive number',
      });
    }

    console.log(`📝 Creating best-execution receipt...`);
    console.log(`   User: ${userId || 'anonymous'}`);
    console.log(`   ${amountNum} ${from} → ${to} via ${corridor}`);

    // Get all quotes for comparison
    const quoteService = getQuoteService();
    const quotes = await quoteService.getAllQuotes({
      from,
      to,
      amount: amountNum,
      corridor,
    });

    if (quotes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No quotes available for this currency pair',
      });
    }

    // Get best route
    const routeService = getRouteService();
    const route = await routeService.chooseRoute({
      from,
      to,
      amount: amountNum,
      corridor,
      userId,
    });

    // Create receipt
    const receipt = await receiptService.createReceiptFromExecution(
      quotes,
      route,
      userId
    );

    console.log(`✅ Best-execution receipt created: ${receipt.receiptId}`);
    if (receipt.onChainAnchor) {
      console.log(`   On-chain anchor: ${receipt.onChainAnchor.txHash}`);
    }

    res.json({
      success: true,
      receipt,
    });
  } catch (error: any) {
    console.error('Receipt creation error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create receipt',
    });
  }
});

/**
 * GET /api/v1/receipts/:id
 * Get receipt by ID
 */
router.get('/receipts/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const receipt = await receiptService.getReceipt(id);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found',
      });
    }

    // Check if user has access (if receipt has userId)
    if (receipt.userId && receipt.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      receipt,
    });
  } catch (error: any) {
    console.error('Get receipt error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get receipt',
    });
  }
});

/**
 * GET /api/v1/receipts
 * Get receipts for authenticated user
 */
router.get('/receipts', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const receipts = await receiptService.getReceiptsByUser(userId, limit);

    res.json({
      success: true,
      receipts,
      count: receipts.length,
    });
  } catch (error: any) {
    console.error('Get receipts error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get receipts',
    });
  }
});

export default router;

