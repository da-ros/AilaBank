/**
 * Ledger & Audit API Routes
 * GET /api/v1/ledger/stats
 * GET /api/v1/ledger/user/:id
 */

import express, { Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { getLedgerService } from '../services/ledger/ledgerService';
import { LedgerEntryType } from '../services/ledger/types';

const router = express.Router();
const ledgerService = getLedgerService();

/**
 * GET /api/v1/ledger/stats
 * Get ledger statistics (optionally filtered by user, date range)
 * 
 * Query parameters:
 * - userId: Optional user ID filter
 * - startDate: Optional start date (ISO format)
 * - endDate: Optional end date (ISO format)
 */
router.get('/ledger/stats', authenticateUser, async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as any).user?.id;
    const { userId, startDate, endDate } = req.query;

    // Users can only see their own stats unless they're admin
    const targetUserId = userId && (req as any).user?.role === 'admin' 
      ? userId as string 
      : currentUserId;

    if (!targetUserId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const stats = await ledgerService.getLedgerStats(
      targetUserId,
      startDate as string | undefined,
      endDate as string | undefined
    );

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Get ledger stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get ledger stats',
    });
  }
});

/**
 * GET /api/v1/ledger/user/:id
 * Get ledger entries for a specific user
 * 
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Entries per page (default: 50)
 * - entryType: Filter by entry type (deposit, withdraw, etc.)
 * - startDate: Optional start date (ISO format)
 * - endDate: Optional end date (ISO format)
 */
router.get('/ledger/user/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = (req as any).user?.id;
    const { page, limit, entryType, startDate, endDate } = req.query;

    // Users can only see their own ledger unless they're admin
    if (id !== currentUserId && (req as any).user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;

    const ledger = await ledgerService.getUserLedger(
      id,
      pageNum,
      limitNum,
      entryType as LedgerEntryType | undefined,
      startDate as string | undefined,
      endDate as string | undefined
    );

    res.json({
      success: true,
      ledger,
    });
  } catch (error: any) {
    console.error('Get user ledger error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user ledger',
    });
  }
});

/**
 * GET /api/v1/ledger
 * Get current user's ledger entries (convenience endpoint)
 */
router.get('/ledger', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const { page, limit, entryType, startDate, endDate } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;

    const ledger = await ledgerService.getUserLedger(
      userId,
      pageNum,
      limitNum,
      entryType as LedgerEntryType | undefined,
      startDate as string | undefined,
      endDate as string | undefined
    );

    res.json({
      success: true,
      ledger,
    });
  } catch (error: any) {
    console.error('Get ledger error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get ledger',
    });
  }
});

export default router;

