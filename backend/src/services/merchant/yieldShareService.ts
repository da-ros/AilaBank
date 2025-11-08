/**
 * Yield-Share Accumulator Service
 * Track settlement micro-yield until payout
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../db/supabase';
import { getLedgerService } from '../ledger/ledgerService';
import { YieldShareAccumulator } from './types';

// Default APY for yield calculation (can be configured)
const DEFAULT_APY = 0.05; // 5% APY

export class YieldShareService {
  /**
   * Create a yield-share accumulator for a settlement
   */
  async createAccumulator(data: {
    merchantId: string;
    invoiceId?: string;
    subscriptionId?: string;
    transactionId: string;
    settlementAmount: number;
  }): Promise<YieldShareAccumulator> {
    try {
      // Get current yield rate (could be from treasury service or config)
      const yieldRate = await this.getCurrentYieldRate();

      const accumulator: YieldShareAccumulator = {
        id: uuidv4(),
        merchantId: data.merchantId,
        invoiceId: data.invoiceId,
        subscriptionId: data.subscriptionId,
        transactionId: data.transactionId,
        settlementAmount: data.settlementAmount,
        yieldAccumulated: 0, // Starts at 0, accumulates over time
        yieldRate: yieldRate,
        status: 'accumulating',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('yield_share_accumulators')
        .insert({
          id: accumulator.id,
          merchant_id: accumulator.merchantId,
          invoice_id: accumulator.invoiceId,
          subscription_id: accumulator.subscriptionId,
          transaction_id: accumulator.transactionId,
          settlement_amount: accumulator.settlementAmount.toString(),
          yield_accumulated: '0',
          yield_rate: accumulator.yieldRate,
          status: accumulator.status,
          created_at: accumulator.createdAt,
          updated_at: accumulator.updatedAt,
        });

      if (error) {
        throw new Error(`Failed to create accumulator: ${error.message}`);
      }

      console.log(`✅ Yield-share accumulator created: ${accumulator.id}`);
      return accumulator;
    } catch (error: any) {
      console.error('❌ Failed to create yield-share accumulator:', error);
      throw error;
    }
  }

  /**
   * Update yield accumulation for all active accumulators
   * This should be called periodically (e.g., daily cron job)
   */
  async updateAccumulations(): Promise<void> {
    try {
      const { data: accumulators, error } = await supabase
        .from('yield_share_accumulators')
        .select('*')
        .eq('status', 'accumulating');

      if (error) {
        throw new Error(`Failed to get accumulators: ${error.message}`);
      }

      const now = new Date();
      let updatedCount = 0;

      for (const acc of accumulators || []) {
        const accumulator = this.mapDbToAccumulator(acc);
        const daysSinceCreation = this.calculateDays(accumulator.createdAt, now.toISOString());

        // Calculate yield: daily yield = settlementAmount * (APY / 365)
        const dailyYield = accumulator.settlementAmount * (accumulator.yieldRate / 365);
        const newYieldAccumulated = accumulator.yieldAccumulated + (dailyYield * daysSinceCreation);

        // Update accumulator
        const { error: updateError } = await supabase
          .from('yield_share_accumulators')
          .update({
            yield_accumulated: newYieldAccumulated.toString(),
            updated_at: now.toISOString(),
          })
          .eq('id', accumulator.id);

        if (updateError) {
          console.error(`⚠️  Failed to update accumulator ${accumulator.id}:`, updateError);
          continue;
        }

        updatedCount++;
      }

      console.log(`✅ Updated ${updatedCount} yield-share accumulators`);
    } catch (error: any) {
      console.error('❌ Failed to update accumulations:', error);
      throw error;
    }
  }

  /**
   * Get accumulators for a merchant
   */
  async getMerchantAccumulators(
    merchantId: string,
    status?: 'accumulating' | 'payout_pending' | 'paid_out'
  ): Promise<YieldShareAccumulator[]> {
    try {
      let query = supabase
        .from('yield_share_accumulators')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get accumulators: ${error.message}`);
      }

      return (data || []).map(row => this.mapDbToAccumulator(row));
    } catch (error: any) {
      console.error('❌ Failed to get merchant accumulators:', error);
      throw error;
    }
  }

  /**
   * Request payout for accumulated yield
   */
  async requestPayout(accumulatorId: string): Promise<YieldShareAccumulator> {
    try {
      const accumulator = await this.getAccumulator(accumulatorId);
      if (!accumulator) {
        throw new Error('Accumulator not found');
      }

      if (accumulator.status !== 'accumulating') {
        throw new Error(`Cannot payout accumulator with status: ${accumulator.status}`);
      }

      if (accumulator.yieldAccumulated <= 0) {
        throw new Error('No yield accumulated to payout');
      }

      // Update status to payout_pending
      const { error } = await supabase
        .from('yield_share_accumulators')
        .update({
          status: 'payout_pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', accumulatorId);

      if (error) {
        throw new Error(`Failed to update accumulator: ${error.message}`);
      }

      console.log(`✅ Payout requested for accumulator: ${accumulatorId}`);
      return (await this.getAccumulator(accumulatorId))!;
    } catch (error: any) {
      console.error('❌ Failed to request payout:', error);
      throw error;
    }
  }

  /**
   * Process payout (transfer yield to merchant)
   */
  async processPayout(accumulatorId: string, txHash: string): Promise<YieldShareAccumulator> {
    try {
      const accumulator = await this.getAccumulator(accumulatorId);
      if (!accumulator) {
        throw new Error('Accumulator not found');
      }

      if (accumulator.status !== 'payout_pending') {
        throw new Error(`Cannot process payout for accumulator with status: ${accumulator.status}`);
      }

      // Update status to paid_out
      const { error } = await supabase
        .from('yield_share_accumulators')
        .update({
          status: 'paid_out',
          payout_date: new Date().toISOString(),
          payout_tx_hash: txHash,
          updated_at: new Date().toISOString(),
        })
        .eq('id', accumulatorId);

      if (error) {
        throw new Error(`Failed to update accumulator: ${error.message}`);
      }

      // Create ledger entry for yield payout
      const ledgerService = getLedgerService();
      await ledgerService.createEntry(
        accumulator.merchantId,
        'yield_accrued',
        'credit',
        accumulator.yieldAccumulated,
        'USDC',
        'wallet',
        `Yield-share payout: ${accumulator.id}`,
        undefined,
        txHash,
        {
          accumulatorId: accumulator.id,
          settlementAmount: accumulator.settlementAmount,
        }
      );

      console.log(`✅ Payout processed for accumulator: ${accumulatorId}`);
      return (await this.getAccumulator(accumulatorId))!;
    } catch (error: any) {
      console.error('❌ Failed to process payout:', error);
      throw error;
    }
  }

  /**
   * Get accumulator by ID
   */
  async getAccumulator(accumulatorId: string): Promise<YieldShareAccumulator | null> {
    try {
      const { data, error } = await supabase
        .from('yield_share_accumulators')
        .select('*')
        .eq('id', accumulatorId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to get accumulator: ${error.message}`);
      }

      return this.mapDbToAccumulator(data);
    } catch (error: any) {
      console.error('❌ Failed to get accumulator:', error);
      throw error;
    }
  }

  /**
   * Get total yield accumulated for a merchant
   */
  async getTotalYieldAccumulated(merchantId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('yield_share_accumulators')
        .select('yield_accumulated')
        .eq('merchant_id', merchantId)
        .eq('status', 'accumulating');

      if (error) {
        throw new Error(`Failed to get total yield: ${error.message}`);
      }

      return (data || []).reduce((sum, acc) => sum + parseFloat(acc.yield_accumulated || '0'), 0);
    } catch (error: any) {
      console.error('❌ Failed to get total yield:', error);
      return 0;
    }
  }

  /**
   * Get current yield rate (APY)
   * In production, this would fetch from treasury service or yield pool
   */
  private async getCurrentYieldRate(): Promise<number> {
    // TODO: Fetch from treasury service or yield pool
    // For now, return default APY
    return DEFAULT_APY;
  }

  /**
   * Calculate days between two dates
   */
  private calculateDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Map database row to YieldShareAccumulator
   */
  private mapDbToAccumulator(row: any): YieldShareAccumulator {
    return {
      id: row.id,
      merchantId: row.merchant_id,
      invoiceId: row.invoice_id,
      subscriptionId: row.subscription_id,
      transactionId: row.transaction_id,
      settlementAmount: parseFloat(row.settlement_amount),
      yieldAccumulated: parseFloat(row.yield_accumulated || '0'),
      yieldRate: parseFloat(row.yield_rate),
      status: row.status as 'accumulating' | 'payout_pending' | 'paid_out',
      payoutDate: row.payout_date,
      payoutTxHash: row.payout_tx_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Singleton instance
let yieldShareServiceInstance: YieldShareService | null = null;

export function getYieldShareService(): YieldShareService {
  if (!yieldShareServiceInstance) {
    yieldShareServiceInstance = new YieldShareService();
  }
  return yieldShareServiceInstance;
}

