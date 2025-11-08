/**
 * RateSweep Service
 * Orchestrates idle balance detection, policy evaluation, and allocation execution
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../db/supabase';
import { BalanceDetector } from './balanceDetector';
import { PolicyAgent } from './policyAgent';
import { AllocationExecutor } from './allocationExecutor';
import {
  RateSweepResult,
  TreasuryPolicy,
  PolicyEvaluation,
  AllocationRequest,
  ExecutionResult,
} from './types';

export class RateSweepService {
  private balanceDetector: BalanceDetector;
  private policyAgent: PolicyAgent;
  private allocationExecutor: AllocationExecutor;

  constructor() {
    this.balanceDetector = new BalanceDetector();
    this.policyAgent = new PolicyAgent();
    this.allocationExecutor = new AllocationExecutor();
  }

  /**
   * Run RateSweep: detect idle balances, evaluate policies, execute allocations
   */
  async runRateSweep(
    dryRun: boolean = false,
    policyIds?: string[]
  ): Promise<RateSweepResult> {
    const runId = uuidv4();
    const timestamp = new Date().toISOString();

    console.log(`🚀 Starting RateSweep run: ${runId}`);

    try {
      // Step 1: Get balance snapshots
      console.log('📊 Step 1: Getting balance snapshots...');
      const balances = await this.balanceDetector.getBalanceSnapshots();
      console.log(`✅ Found ${balances.length} balance sources`);

      // Step 2: Detect idle balances
      console.log('🔍 Step 2: Detecting idle balances...');
      const idleBalances = await this.balanceDetector.detectIdleBalances();
      console.log(`✅ Found ${idleBalances.length} idle balance sources`);

      // Step 3: Get active policies
      console.log('📋 Step 3: Loading policies...');
      const policies = await this.getPolicies(policyIds);
      console.log(`✅ Loaded ${policies.length} policies`);

      // Step 4: Evaluate policies with AI agent
      console.log('🤖 Step 4: Evaluating policies with AI agent...');
      const evaluations: PolicyEvaluation[] = [];
      for (const policy of policies) {
        const evaluation = await this.policyAgent.evaluatePolicy(
          policy,
          balances,
          idleBalances
        );
        evaluations.push(evaluation);
        console.log(`   Policy "${policy.name}": ${evaluation.triggered ? '✅ Triggered' : '⏸️  Not triggered'}`);
      }

      // Step 5: Determine actions to take
      console.log('🎯 Step 5: Determining actions...');
      const actions = this.determineActions(evaluations, idleBalances);
      console.log(`✅ Determined ${actions.length} actions`);

      // Step 6: Execute actions (if not dry run)
      let executionResults: ExecutionResult[] = [];
      if (!dryRun && actions.length > 0) {
        console.log('⚡ Step 6: Executing allocations...');
        executionResults = await this.executeActions(actions);
        console.log(`✅ Executed ${executionResults.filter(r => r.success).length}/${executionResults.length} actions`);
      } else if (dryRun) {
        console.log('🔍 Dry run mode: Skipping execution');
      }

      // Step 7: Calculate summary
      const summary = this.calculateSummary(balances, idleBalances, executionResults);

      const result: RateSweepResult = {
        runId,
        timestamp,
        balances,
        idleBalances,
        evaluations,
        actions: actions.map(a => a.action),
        executed: !dryRun,
        executionResults: executionResults.length > 0 ? executionResults : undefined,
        summary,
      };

      // Store result in database
      await this.storeRateSweepResult(result);

      console.log(`✅ RateSweep completed: ${runId}`);
      return result;
    } catch (error: any) {
      console.error('❌ RateSweep failed:', error);
      throw error;
    }
  }

  /**
   * Get treasury policies from database
   */
  async getPolicies(policyIds?: string[]): Promise<TreasuryPolicy[]> {
    try {
      let query = supabase
        .from('treasury_policies')
        .select('*')
        .eq('status', 'active')
        .order('priority', { ascending: false });

      if (policyIds && policyIds.length > 0) {
        query = query.in('id', policyIds);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get policies: ${error.message}`);
      }

      return (data || []).map(row => this.mapDbToPolicy(row));
    } catch (error: any) {
      console.error('❌ Failed to get policies:', error);
      return [];
    }
  }

  /**
   * Determine actions from policy evaluations
   */
  private determineActions(
    evaluations: PolicyEvaluation[],
    idleBalances: any[]
  ): AllocationRequest[] {
    const actions: AllocationRequest[] = [];

    // Get triggered evaluations, sorted by confidence
    const triggered = evaluations
      .filter(e => e.triggered)
      .sort((a, b) => b.confidence - a.confidence);

    // Calculate total idle amount
    const totalIdle = idleBalances.reduce((sum, ib) => sum + ib.amount, 0);

    for (const evaluation of triggered) {
      const action = evaluation.recommendedAction;
      if (action === 'no_action') continue;

      // Get amount from parameters or use idle balance
      const amount = evaluation.parameters?.amount || 
                    (totalIdle * 0.8); // Default: 80% of idle

      actions.push({
        action,
        amount: Math.min(amount, totalIdle), // Don't exceed available
        currency: 'USDC',
        source: idleBalances[0]?.source || 'arc_vault',
        destination: action === 'topup_buffer' ? 'arc_buffer' : 'arc_yield',
        parameters: evaluation.parameters,
      });
    }

    return actions;
  }

  /**
   * Execute allocation actions
   */
  private async executeActions(actions: AllocationRequest[]): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const action of actions) {
      try {
        const result = await this.allocationExecutor.executeAllocation(action);
        results.push(result);
      } catch (error: any) {
        results.push({
          action: action.action,
          success: false,
          amount: action.amount,
          currency: action.currency,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return results;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(
    balances: any[],
    idleBalances: any[],
    executionResults: ExecutionResult[]
  ) {
    const totalIdle = idleBalances.reduce((sum, ib) => sum + ib.amount, 0);
    const totalAllocated = executionResults
      .filter(r => r.success && r.action === 'allocate_to_yield')
      .reduce((sum, r) => sum + r.amount, 0);
    const totalYield = balances.find(b => b.source === 'arc_yield')?.balance || 0;
    const totalBuffer = balances.find(b => b.source === 'arc_buffer')?.balance || 0;

    return {
      totalIdle,
      totalAllocated,
      totalYield,
      totalBuffer,
    };
  }

  /**
   * Store RateSweep result in database
   */
  private async storeRateSweepResult(result: RateSweepResult): Promise<void> {
    try {
      const { error } = await supabase
        .from('ratesweep_runs')
        .insert({
          id: result.runId,
          timestamp: result.timestamp,
          balances: result.balances,
          idle_balances: result.idleBalances,
          evaluations: result.evaluations,
          actions: result.actions,
          executed: result.executed,
          execution_results: result.executionResults,
          summary: result.summary,
          created_at: result.timestamp,
        });

      if (error) {
        console.warn('⚠️  Failed to store RateSweep result:', error);
      }
    } catch (error: any) {
      console.warn('⚠️  Failed to store RateSweep result:', error);
    }
  }

  /**
   * Map database row to TreasuryPolicy
   */
  private mapDbToPolicy(row: any): TreasuryPolicy {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status as 'active' | 'paused' | 'archived',
      rules: row.rules || [],
      priority: row.priority || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Singleton instance
let rateSweepServiceInstance: RateSweepService | null = null;

export function getRateSweepService(): RateSweepService {
  if (!rateSweepServiceInstance) {
    rateSweepServiceInstance = new RateSweepService();
  }
  return rateSweepServiceInstance;
}

