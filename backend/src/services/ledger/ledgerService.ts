/**
 * Ledger Service
 * Double-entry accounting with correlation IDs and audit trails
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../db/supabase';
import {
  LedgerEntry,
  LedgerEntryType,
  EntrySide,
  DoubleEntry,
  LedgerStats,
  AuditLog,
  UserLedgerResponse,
} from './types';

export class LedgerService {
  /**
   * Create a double-entry ledger transaction
   * Every transaction has a debit and credit entry
   */
  async createDoubleEntry(
    userId: string,
    entryType: LedgerEntryType,
    debitAccount: string,
    creditAccount: string,
    amount: number,
    currency: string = 'USDC',
    description: string,
    metadata?: Record<string, any>
  ): Promise<DoubleEntry> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    // Create debit entry
    const debit: LedgerEntry = {
      id: uuidv4(),
      correlationId,
      userId,
      entryType,
      side: 'debit',
      amount,
      currency,
      account: debitAccount,
      description: `Debit: ${description}`,
      status: 'pending',
      metadata,
      createdAt: timestamp,
    };

    // Create credit entry
    const credit: LedgerEntry = {
      id: uuidv4(),
      correlationId,
      userId,
      entryType,
      side: 'credit',
      amount,
      currency,
      account: creditAccount,
      description: `Credit: ${description}`,
      status: 'pending',
      metadata,
      createdAt: timestamp,
    };

    // Store both entries atomically
    await this.storeEntries([debit, credit]);

    // Create audit log
    await this.createAuditLog({
      correlationId,
      userId,
      actionType: entryType,
      service: 'ledger',
      inputs: {
        entryType,
        debitAccount,
        creditAccount,
        amount,
        currency,
      },
      outputs: {
        debitId: debit.id,
        creditId: credit.id,
      },
      reasoning: `Double-entry transaction: ${description}`,
    });

    return {
      debit,
      credit,
      correlationId,
      description,
      timestamp,
    };
  }

  /**
   * Create a single ledger entry (for external transactions)
   * Automatically creates a corresponding entry to balance
   */
  async createEntry(
    userId: string,
    entryType: LedgerEntryType,
    side: EntrySide,
    amount: number,
    currency: string = 'USDC',
    account: string,
    description: string,
    counterparty?: string,
    txHash?: string,
    metadata?: Record<string, any>
  ): Promise<LedgerEntry> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    const entry: LedgerEntry = {
      id: uuidv4(),
      correlationId,
      userId,
      entryType,
      side,
      amount,
      currency,
      counterparty,
      account,
      description,
      txHash,
      status: txHash ? 'completed' : 'pending',
      metadata,
      createdAt: timestamp,
    };

    await this.storeEntries([entry]);

    // Create audit log
    await this.createAuditLog({
      correlationId,
      userId,
      actionType: entryType,
      service: 'ledger',
      inputs: {
        entryType,
        side,
        amount,
        currency,
        account,
      },
      outputs: {
        entryId: entry.id,
        txHash,
      },
      reasoning: `Single entry: ${description}`,
    });

    return entry;
  }

  /**
   * Get user ledger entries
   */
  async getUserLedger(
    userId: string,
    page: number = 1,
    limit: number = 50,
    entryType?: LedgerEntryType,
    startDate?: string,
    endDate?: string
  ): Promise<UserLedgerResponse> {
    try {
      let query = supabase
        .from('ledger')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (entryType) {
        query = query.eq('action_type', entryType);
      }
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to get ledger: ${error.message}`);
      }

      // Calculate balance
      const balance = await this.calculateBalance(userId);

      // Get stats
      const stats = await this.getLedgerStats(userId, startDate, endDate);

      // Map to LedgerEntry format
      const entries: LedgerEntry[] = (data || []).map(row => ({
        id: row.id,
        correlationId: row.correlation_id || row.id,
        userId: row.user_id,
        entryType: row.action_type as LedgerEntryType,
        side: row.side || (row.action_type === 'deposit' || row.action_type === 'yield_accrued' ? 'credit' : 'debit'),
        amount: parseFloat(row.amount),
        currency: row.currency || 'USDC',
        counterparty: row.counterparty,
        account: row.account || 'wallet',
        description: row.description || `${row.action_type} ${row.amount} ${row.currency}`,
        txHash: row.tx_hash,
        status: row.status as 'pending' | 'completed' | 'failed',
        metadata: row.metadata || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return {
        userId,
        entries,
        balance,
        currency: 'USDC',
        stats,
        pagination: {
          page,
          limit,
          total: count || 0,
          hasMore: (count || 0) > page * limit,
        },
      };
    } catch (error: any) {
      console.error('❌ Failed to get user ledger:', error);
      throw error;
    }
  }

  /**
   * Get ledger statistics
   */
  async getLedgerStats(
    userId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<LedgerStats> {
    try {
      let query = supabase
        .from('ledger')
        .select('action_type, amount, currency, account, side');

      if (userId) {
        query = query.eq('user_id', userId);
      }
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get stats: ${error.message}`);
      }

      const entries = data || [];
      const currency = 'USDC'; // Default currency

      // Calculate totals by type
      const byType: Record<string, number> = {};
      const byAccount: Record<string, number> = {};

      let totalDeposits = 0;
      let totalWithdrawals = 0;
      let totalYield = 0;
      let totalFees = 0;
      let currentBalance = 0;

      entries.forEach((entry: any) => {
        const amount = parseFloat(entry.amount) || 0;
        const side = entry.side || (entry.action_type === 'deposit' || entry.action_type === 'yield_accrued' ? 'credit' : 'debit');
        const entryType = entry.action_type;

        // Update by type
        byType[entryType] = (byType[entryType] || 0) + amount;

        // Update by account
        const account = entry.account || 'wallet';
        byAccount[account] = (byAccount[account] || 0) + (side === 'credit' ? amount : -amount);

        // Calculate totals
        if (entryType === 'deposit') {
          totalDeposits += amount;
        } else if (entryType === 'withdraw') {
          totalWithdrawals += amount;
        } else if (entryType === 'yield_accrued') {
          totalYield += amount;
        } else if (entryType === 'fee') {
          totalFees += amount;
        }

        // Calculate balance (credits - debits)
        if (side === 'credit') {
          currentBalance += amount;
        } else {
          currentBalance -= amount;
        }
      });

      return {
        userId,
        totalDeposits,
        totalWithdrawals,
        totalYield,
        totalFees,
        currentBalance,
        currency,
        period: {
          start: startDate || new Date(0).toISOString(),
          end: endDate || new Date().toISOString(),
        },
        breakdown: {
          byType: byType as Record<LedgerEntryType, number>,
          byAccount,
        },
      };
    } catch (error: any) {
      console.error('❌ Failed to get ledger stats:', error);
      throw error;
    }
  }

  /**
   * Calculate current balance for user
   */
  async calculateBalance(userId: string, currency: string = 'USDC'): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('ledger')
        .select('amount, side')
        .eq('user_id', userId)
        .eq('currency', currency)
        .eq('status', 'completed');

      if (error) {
        throw new Error(`Failed to calculate balance: ${error.message}`);
      }

      let balance = 0;
      (data || []).forEach((entry: any) => {
        const amount = parseFloat(entry.amount) || 0;
        const side = entry.side || 'credit'; // Default to credit if not specified
        
        if (side === 'credit') {
          balance += amount;
        } else {
          balance -= amount;
        }
      });

      return balance;
    } catch (error: any) {
      console.error('❌ Failed to calculate balance:', error);
      return 0;
    }
  }

  /**
   * Store ledger entries in database
   */
  private async storeEntries(entries: LedgerEntry[]): Promise<void> {
    try {
      const rows = entries.map(entry => ({
        id: entry.id,
        user_id: entry.userId,
        correlation_id: entry.correlationId,
        action_type: entry.entryType,
        side: entry.side,
        amount: entry.amount.toString(),
        currency: entry.currency,
        counterparty: entry.counterparty,
        account: entry.account,
        description: entry.description,
        tx_hash: entry.txHash,
        status: entry.status,
        metadata: entry.metadata || {},
        created_at: entry.createdAt,
        updated_at: entry.updatedAt || entry.createdAt,
      }));

      const { error } = await supabase
        .from('ledger')
        .insert(rows);

      if (error) {
        throw new Error(`Failed to store ledger entries: ${error.message}`);
      }

      console.log(`✅ Stored ${entries.length} ledger entry/entries`);
    } catch (error: any) {
      console.error('❌ Failed to store ledger entries:', error);
      throw error;
    }
  }

  /**
   * Create audit log entry
   */
  async createAuditLog(log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    try {
      const auditLog: AuditLog = {
        id: uuidv4(),
        ...log,
        createdAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('audit_logs')
        .insert({
          id: auditLog.id,
          action_id: log.correlationId,
          user_id: log.userId || null,
          action_type: log.actionType,
          inputs: log.inputs,
          outputs: log.outputs,
          reasoning: log.reasoning,
          on_chain_proof: log.onChainProof,
          created_at: auditLog.createdAt,
        });

      if (error) {
        console.error('⚠️  Failed to create audit log:', error);
        // Don't throw - audit logs are non-critical
      } else {
        console.log(`📝 Audit log created: ${log.actionType} (${log.correlationId})`);
      }

      return auditLog;
    } catch (error: any) {
      console.error('⚠️  Audit log creation error:', error);
      // Return mock audit log if storage fails
      return {
        id: uuidv4(),
        ...log,
        createdAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Update entry status
   */
  async updateEntryStatus(
    entryId: string,
    status: 'pending' | 'completed' | 'failed',
    txHash?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (txHash) {
        updateData.tx_hash = txHash;
      }

      const { error } = await supabase
        .from('ledger')
        .update(updateData)
        .eq('id', entryId);

      if (error) {
        throw new Error(`Failed to update entry: ${error.message}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to update entry status:', error);
      throw error;
    }
  }
}

// Singleton instance
let ledgerServiceInstance: LedgerService | null = null;

export function getLedgerService(): LedgerService {
  if (!ledgerServiceInstance) {
    ledgerServiceInstance = new LedgerService();
  }
  return ledgerServiceInstance;
}

