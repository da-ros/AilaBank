/**
 * Corridor Router API Routes
 * POST /api/v1/route/choose
 */

import express, { Request, Response } from 'express';
import { getRouteService } from '../services/corridor/routeService';
import { getKPIService } from '../services/dashboard/kpiService';
import { RouteRequest } from '../services/corridor/types';

const router = express.Router();
const routeService = getRouteService();

/**
 * POST /api/v1/route/choose
 * Choose best route for a transfer with policy evaluation
 * 
 * Body:
 * {
 *   "from": "EUR",
 *   "to": "USD",
 *   "amount": 1000,
 *   "corridor": "EUR-US",
 *   "userId": "optional-user-id",
 *   "metadata": {
 *     "purpose": "Payment for services",
 *     "recipientInfo": {
 *       "name": "John Doe",
 *       "accountNumber": "123456789",
 *       "country": "US"
 *     }
 *   }
 * }
 */
router.post('/route/choose', async (req: Request, res: Response) => {
  try {
    const { from, to, amount, corridor, userId, metadata } = req.body;

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

    // Build route request
    const routeRequest: RouteRequest = {
      from: from as string,
      to: to as string,
      amount: amountNum,
      corridor: corridor as string,
      userId: userId as string | undefined,
      metadata: metadata || {},
    };

    // Get route
    const routeResponse = await routeService.chooseRoute(routeRequest);

    // Record execution for KPI tracking
    try {
      const kpiService = getKPIService();
      const selectedRoute = routeResponse.selectedRoute;
      const quote = routeResponse.quote;
      
      await kpiService.recordExecution({
        routeId: routeResponse.routeId,
        corridor: routeResponse.corridor,
        from: routeResponse.from,
        to: routeResponse.to,
        amount: routeResponse.amount,
        pspId: selectedRoute.psp.id,
        pspName: selectedRoute.psp.name,
        status: 'pending',
        cost: selectedRoute.cost + (quote?.fees || 0),
        fees: quote?.fees || selectedRoute.cost * 0.5, // Estimate if not available
        spread: selectedRoute.cost * 0.3, // Estimate spread
        estimatedDelivery: selectedRoute.speed,
        startedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.warn('⚠️  Failed to record route execution:', error);
      // Don't fail the request if execution tracking fails
    }

    res.json({
      success: true,
      route: routeResponse,
    });
  } catch (error: any) {
    console.error('Route selection error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to choose route',
    });
  }
});

/**
 * GET /api/v1/route/corridors
 * Get list of available corridors
 */
router.get('/route/corridors', async (req: Request, res: Response) => {
  try {
    const corridors = routeService.getAvailableCorridors();
    
    res.json({
      success: true,
      corridors,
      count: corridors.length,
    });
  } catch (error: any) {
    console.error('Corridors error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get corridors',
    });
  }
});

/**
 * GET /api/v1/route/psps
 * Get list of available PSP adapters
 */
router.get('/route/psps', async (req: Request, res: Response) => {
  try {
    const adapters = routeService.getPSPAdapters();
    
    const psps = adapters.map(adapter => ({
      id: adapter.id,
      name: adapter.name,
      type: adapter.type,
      corridors: adapter.corridors,
      capabilities: adapter.getCapabilities(),
    }));
    
    res.json({
      success: true,
      psps,
      count: psps.length,
    });
  } catch (error: any) {
    console.error('PSPs error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get PSPs',
    });
  }
});

export default router;

