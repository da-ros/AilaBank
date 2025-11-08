/**
 * Treasury & RateSweep API Routes
 * POST /api/v1/ratesweep/run
 * GET /api/v1/treasury/policies
 */

import express, { Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { getRateSweepService } from '../services/treasury/rateSweepService';
import { BalanceDetector } from '../services/treasury/balanceDetector';
import { supabase } from '../db/supabase';
import { TreasuryPolicy } from '../services/treasury/types';

const router = express.Router();
const rateSweepService = getRateSweepService();

/**
 * POST /api/v1/ratesweep/run
 * Run RateSweep: detect idle balances, evaluate policies, execute allocations
 * 
 * Query parameters:
 * - dryRun: boolean (default: false) - If true, don't execute allocations
 * - policyIds: comma-separated list of policy IDs to evaluate (optional)
 */
router.post('/ratesweep/run', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { dryRun, policyIds } = req.query;
    const dryRunBool = dryRun === 'true' || dryRun === '1';
    const policyIdsArray = policyIds 
      ? (policyIds as string).split(',').map(id => id.trim())
      : undefined;

    console.log(`🚀 RateSweep run requested - Dry run: ${dryRunBool}`);

    const result = await rateSweepService.runRateSweep(dryRunBool, policyIdsArray);

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('RateSweep run error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to run RateSweep',
    });
  }
});

/**
 * GET /api/v1/treasury/policies
 * Get treasury policies
 * 
 * Query parameters:
 * - status: Filter by status (active, paused, archived)
 * - policyId: Get specific policy by ID
 */
router.get('/treasury/policies', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { status, policyId } = req.query;

    let query = supabase
      .from('treasury_policies')
      .select('*')
      .order('priority', { ascending: false });

    if (policyId) {
      query = query.eq('id', policyId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get policies: ${error.message}`);
    }

    const policies: TreasuryPolicy[] = (data || []).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status as 'active' | 'paused' | 'archived',
      rules: row.rules || [],
      priority: row.priority || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({
      success: true,
      policies,
    });
  } catch (error: any) {
    console.error('Get policies error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get policies',
    });
  }
});

/**
 * POST /api/v1/treasury/policies
 * Create a new treasury policy
 */
router.post('/treasury/policies', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { name, description, rules, priority, status } = req.body;

    if (!name || !rules || !Array.isArray(rules)) {
      return res.status(400).json({
        success: false,
        error: 'Name and rules are required',
      });
    }

    const { data, error } = await supabase
      .from('treasury_policies')
      .insert({
        name,
        description: description || '',
        rules,
        priority: priority || 0,
        status: status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create policy: ${error.message}`);
    }

    const policy: TreasuryPolicy = {
      id: data.id,
      name: data.name,
      description: data.description,
      status: data.status,
      rules: data.rules,
      priority: data.priority,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    res.json({
      success: true,
      policy,
    });
  } catch (error: any) {
    console.error('Create policy error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create policy',
    });
  }
});

/**
 * GET /api/v1/treasury/balances
 * Get current balance snapshots
 */
router.get('/treasury/balances', authenticateUser, async (req: Request, res: Response) => {
  try {
    const balanceDetector = new BalanceDetector();

    const balances = await balanceDetector.getBalanceSnapshots();
    const idleBalances = await balanceDetector.detectIdleBalances();

    res.json({
      success: true,
      balances,
      idleBalances,
    });
  } catch (error: any) {
    console.error('Get balances error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get balances',
    });
  }
});

export default router;

