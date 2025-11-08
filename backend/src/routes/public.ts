/**
 * Public API Routes
 * Public endpoints for reliability & cost dashboard (no authentication required)
 * GET /api/v1/public/kpi/corridors
 * GET /api/v1/public/status
 */

import express, { Request, Response } from 'express';
import { getKPIService } from '../services/dashboard/kpiService';
import { getStatusService } from '../services/dashboard/statusService';

const router = express.Router();

/**
 * GET /api/v1/public/kpi/corridors
 * Get KPIs for all corridors
 * 
 * Query parameters:
 * - corridor: Optional corridor filter (e.g., 'EUR-US')
 */
router.get('/public/kpi/corridors', async (req: Request, res: Response) => {
  try {
    const { corridor } = req.query;
    const kpiService = getKPIService();

    if (corridor) {
      // Get KPI for specific corridor
      const kpi = await kpiService.getCorridorKPI(corridor as string);
      
      if (!kpi) {
        return res.status(404).json({
          success: false,
          error: `Corridor '${corridor}' not found`,
        });
      }

      return res.json({
        success: true,
        kpi,
      });
    }

    // Get KPIs for all corridors
    const kpis = await kpiService.getCorridorKPIs();

    res.json({
      success: true,
      kpis,
      count: kpis.length,
    });
  } catch (error: any) {
    console.error('Get corridor KPIs error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get corridor KPIs',
    });
  }
});

/**
 * GET /api/v1/public/status
 * Get system status and health information
 */
router.get('/public/status', async (req: Request, res: Response) => {
  try {
    const statusService = getStatusService();
    const status = await statusService.getSystemStatus();

    res.json({
      success: true,
      status,
    });
  } catch (error: any) {
    console.error('Get system status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get system status',
    });
  }
});

export default router;

