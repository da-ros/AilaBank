/**
 * KPI Service
 * Calculates and aggregates KPIs per corridor for public dashboard
 */

import { supabase } from '../../db/supabase';
import { CorridorKPI, RouteExecution } from './types';

export class KPIService {
  /**
   * Get KPIs for all corridors
   */
  async getCorridorKPIs(): Promise<CorridorKPI[]> {
    try {
      // Get all unique corridors from route executions
      const { data: corridors, error } = await supabase
        .from('route_executions')
        .select('corridor, from_currency, to_currency')
        .not('corridor', 'is', null);

      if (error) {
        throw new Error(`Failed to get corridors: ${error.message}`);
      }

      // Get unique corridors
      const uniqueCorridors = new Map<string, { from: string; to: string }>();
      (corridors || []).forEach((row: any) => {
        if (!uniqueCorridors.has(row.corridor)) {
          uniqueCorridors.set(row.corridor, {
            from: row.from_currency || row.corridor.split('-')[0],
            to: row.to_currency || row.corridor.split('-')[1],
          });
        }
      });

      // Calculate KPIs for each corridor
      const kpis: CorridorKPI[] = [];
      for (const [corridor, currencies] of uniqueCorridors) {
        const kpi = await this.calculateCorridorKPI(corridor, currencies.from, currencies.to);
        kpis.push(kpi);
      }

      // Sort by corridor name
      kpis.sort((a, b) => a.corridor.localeCompare(b.corridor));

      return kpis;
    } catch (error: any) {
      console.error('❌ Failed to get corridor KPIs:', error);
      throw error;
    }
  }

  /**
   * Get KPI for a specific corridor
   */
  async getCorridorKPI(corridor: string): Promise<CorridorKPI | null> {
    try {
      // Get corridor info from first execution
      const { data: firstExec } = await supabase
        .from('route_executions')
        .select('from_currency, to_currency')
        .eq('corridor', corridor)
        .limit(1)
        .single();

      if (!firstExec) {
        return null;
      }

      const from = firstExec.from_currency || corridor.split('-')[0];
      const to = firstExec.to_currency || corridor.split('-')[1];

      return await this.calculateCorridorKPI(corridor, from, to);
    } catch (error: any) {
      console.error(`❌ Failed to get KPI for corridor ${corridor}:`, error);
      return null;
    }
  }

  /**
   * Calculate KPI for a specific corridor
   */
  private async calculateCorridorKPI(
    corridor: string,
    from: string,
    to: string
  ): Promise<CorridorKPI> {
    try {
      // Get all executions for this corridor
      const { data: executions, error } = await supabase
        .from('route_executions')
        .select('*')
        .eq('corridor', corridor)
        .order('started_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get executions: ${error.message}`);
      }

      const execs = (executions || []) as any[];

      if (execs.length === 0) {
        // Return empty KPI if no executions
        return {
          corridor,
          from,
          to,
          metrics: {
            allInCost200: 0,
            medianDelivery: 0,
            successRate: 0,
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
          },
          costBreakdown: {
            averageFees: 0,
            averageSpread: 0,
            averageTotal: 0,
          },
          deliveryStats: {
            min: 0,
            max: 0,
            median: 0,
            p95: 0,
            p99: 0,
          },
          lastUpdated: new Date().toISOString(),
        };
      }

      // Calculate metrics
      const successful = execs.filter(e => e.status === 'success');
      const failed = execs.filter(e => e.status === 'failed');
      const successRate = execs.length > 0 ? successful.length / execs.length : 0;

      // Calculate all-in cost for $200
      const allInCost200 = this.calculateAllInCost200(execs);

      // Calculate delivery statistics
      const deliveryTimes = successful
        .filter(e => e.actual_delivery_time)
        .map(e => e.actual_delivery_time)
        .sort((a, b) => a - b);

      const medianDelivery = this.calculateMedian(deliveryTimes);
      const deliveryStats = this.calculateDeliveryStats(deliveryTimes);

      // Calculate cost breakdown
      const costs = successful.map(e => ({
        fees: parseFloat(e.fees || '0'),
        spread: parseFloat(e.spread || '0'),
        total: parseFloat(e.total_cost || '0'),
      }));

      const averageFees = costs.length > 0
        ? costs.reduce((sum, c) => sum + c.fees, 0) / costs.length
        : 0;
      const averageSpread = costs.length > 0
        ? costs.reduce((sum, c) => sum + c.spread, 0) / costs.length
        : 0;
      const averageTotal = costs.length > 0
        ? costs.reduce((sum, c) => sum + c.total, 0) / costs.length
        : 0;

      return {
        corridor,
        from,
        to,
        metrics: {
          allInCost200,
          medianDelivery,
          successRate,
          totalExecutions: execs.length,
          successfulExecutions: successful.length,
          failedExecutions: failed.length,
        },
        costBreakdown: {
          averageFees,
          averageSpread,
          averageTotal,
        },
        deliveryStats,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error(`❌ Failed to calculate KPI for ${corridor}:`, error);
      throw error;
    }
  }

  /**
   * Calculate all-in cost for $200 transfer
   * Normalizes costs from different amounts to $200
   */
  private calculateAllInCost200(executions: any[]): number {
    const successful = executions.filter(e => e.status === 'success');
    if (successful.length === 0) return 0;

    // Get costs normalized to $200
    const normalizedCosts = successful.map(exec => {
      const amount = parseFloat(exec.amount || '200');
      const totalCost = parseFloat(exec.total_cost || '0');
      
      // Normalize to $200: cost_200 = (cost / amount) * 200
      return (totalCost / amount) * 200;
    });

    // Return median normalized cost
    return this.calculateMedian(normalizedCosts);
  }

  /**
   * Calculate median value
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  /**
   * Calculate delivery statistics
   */
  private calculateDeliveryStats(deliveryTimes: number[]): {
    min: number;
    max: number;
    median: number;
    p95: number;
    p99: number;
  } {
    if (deliveryTimes.length === 0) {
      return { min: 0, max: 0, median: 0, p95: 0, p99: 0 };
    }

    const sorted = [...deliveryTimes].sort((a, b) => a - b);
    const median = this.calculateMedian(sorted);
    const p95 = this.percentile(sorted, 0.95);
    const p99 = this.percentile(sorted, 0.99);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median,
      p95,
      p99,
    };
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  /**
   * Record route execution
   */
  async recordExecution(execution: Omit<RouteExecution, 'id'>): Promise<RouteExecution> {
    try {
      const { data, error } = await supabase
        .from('route_executions')
        .insert({
          route_id: execution.routeId,
          corridor: execution.corridor,
          from_currency: execution.from,
          to_currency: execution.to,
          amount: execution.amount.toString(),
          psp_id: execution.pspId,
          psp_name: execution.pspName,
          status: execution.status,
          total_cost: execution.cost.toString(),
          fees: execution.fees.toString(),
          spread: execution.spread.toString(),
          estimated_delivery: execution.estimatedDelivery,
          actual_delivery_time: execution.actualDelivery,
          started_at: execution.startedAt,
          completed_at: execution.completedAt,
          error: execution.error,
          receipt_id: execution.receiptId,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to record execution: ${error.message}`);
      }

      return this.mapDbToExecution(data);
    } catch (error: any) {
      console.error('❌ Failed to record execution:', error);
      throw error;
    }
  }

  /**
   * Update execution status
   */
  async updateExecutionStatus(
    executionId: string,
    status: 'success' | 'failed',
    actualDelivery?: number,
    error?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        completed_at: new Date().toISOString(),
      };

      if (actualDelivery !== undefined) {
        updateData.actual_delivery_time = actualDelivery;
      }

      if (error) {
        updateData.error = error;
      }

      const { error: updateError } = await supabase
        .from('route_executions')
        .update(updateData)
        .eq('id', executionId);

      if (updateError) {
        throw new Error(`Failed to update execution: ${updateError.message}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to update execution status:', error);
      throw error;
    }
  }

  /**
   * Map database row to RouteExecution
   */
  private mapDbToExecution(row: any): RouteExecution {
    return {
      id: row.id,
      routeId: row.route_id,
      corridor: row.corridor,
      from: row.from_currency,
      to: row.to_currency,
      amount: parseFloat(row.amount),
      pspId: row.psp_id,
      pspName: row.psp_name,
      status: row.status,
      cost: parseFloat(row.total_cost || '0'),
      fees: parseFloat(row.fees || '0'),
      spread: parseFloat(row.spread || '0'),
      estimatedDelivery: row.estimated_delivery,
      actualDelivery: row.actual_delivery_time,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      error: row.error,
      receiptId: row.receipt_id,
    };
  }
}

// Singleton instance
let kpiServiceInstance: KPIService | null = null;

export function getKPIService(): KPIService {
  if (!kpiServiceInstance) {
    kpiServiceInstance = new KPIService();
  }
  return kpiServiceInstance;
}

