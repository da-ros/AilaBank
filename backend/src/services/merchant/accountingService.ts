/**
 * Accounting Export Service
 * CSV generation and QuickBooks webhook integration
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../db/supabase';
import { AccountingExport, AccountingRecord } from './types';
import { getInvoiceService } from './invoiceService';
import { getLedgerService } from '../ledger/ledgerService';

export class AccountingService {
  /**
   * Generate CSV export for accounting records
   */
  async generateCSVExport(
    merchantId: string,
    startDate: string,
    endDate: string
  ): Promise<{ csv: string; exportId: string }> {
    try {
      // Get all accounting records for the period
      const records = await this.getAccountingRecords(merchantId, startDate, endDate);

      // Generate CSV
      const headers = [
        'Date',
        'Type',
        'Reference',
        'Description',
        'Amount',
        'Currency',
        'Debit Account',
        'Credit Account',
        'Transaction Hash',
      ];

      const rows = records.map(record => [
        record.date,
        record.type,
        record.reference,
        record.description,
        record.amount.toString(),
        record.currency,
        record.debitAccount || '',
        record.creditAccount || '',
        record.txHash || '',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      // Create export record
      const exportRecord = await this.createExportRecord({
        merchantId,
        type: 'csv',
        period: { start: startDate, end: endDate },
        format: 'csv',
        recordCount: records.length,
      });

      return {
        csv,
        exportId: exportRecord.id,
      };
    } catch (error: any) {
      console.error('❌ Failed to generate CSV export:', error);
      throw error;
    }
  }

  /**
   * Get accounting records for a period
   */
  async getAccountingRecords(
    merchantId: string,
    startDate: string,
    endDate: string
  ): Promise<AccountingRecord[]> {
    try {
      const records: AccountingRecord[] = [];

      // Get invoices
      const invoiceService = getInvoiceService();
      const { invoices } = await invoiceService.getMerchantInvoices(merchantId);

      for (const invoice of invoices) {
        if (invoice.createdAt >= startDate && invoice.createdAt <= endDate) {
          // Invoice creation
          records.push({
            date: invoice.createdAt,
            type: 'invoice',
            reference: invoice.invoiceNumber,
            description: `Invoice: ${invoice.description}`,
            amount: invoice.amount,
            currency: invoice.currency,
            creditAccount: 'accounts_receivable',
            txHash: invoice.txHash,
            metadata: { invoiceId: invoice.id },
          });

          // Invoice payment
          if (invoice.paidAmount > 0) {
            records.push({
              date: invoice.paidDate || invoice.updatedAt,
              type: 'invoice',
              reference: invoice.invoiceNumber,
              description: `Invoice payment: ${invoice.description}`,
              amount: invoice.paidAmount,
              currency: invoice.currency,
              debitAccount: 'accounts_receivable',
              creditAccount: 'revenue',
              txHash: invoice.txHash,
              metadata: { invoiceId: invoice.id },
            });
          }

          // Invoice refund
          if (invoice.refundedAmount > 0) {
            records.push({
              date: invoice.updatedAt,
              type: 'refund',
              reference: invoice.invoiceNumber,
              description: `Invoice refund: ${invoice.description}`,
              amount: invoice.refundedAmount,
              currency: invoice.currency,
              debitAccount: 'revenue',
              creditAccount: 'accounts_receivable',
              txHash: invoice.txHash,
              metadata: { invoiceId: invoice.id },
            });
          }
        }
      }

      // Subscriptions are tracked via ledger entries (see below)

      // Get ledger entries
      const ledgerService = getLedgerService();
      const ledger = await ledgerService.getUserLedger(merchantId, 1, 1000, undefined, startDate, endDate);

      for (const entry of ledger.entries) {
        if (entry.entryType === 'transfer' || entry.entryType === 'yield_accrued') {
          records.push({
            date: entry.createdAt,
            type: entry.entryType === 'yield_accrued' ? 'yield_payout' : 'invoice',
            reference: entry.metadata?.invoiceId || entry.metadata?.subscriptionId || entry.id,
            description: entry.description,
            amount: entry.amount,
            currency: entry.currency,
            debitAccount: entry.side === 'debit' ? entry.account : undefined,
            creditAccount: entry.side === 'credit' ? entry.account : undefined,
            txHash: entry.txHash,
            metadata: entry.metadata,
          });
        }
      }

      // Sort by date
      records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return records;
    } catch (error: any) {
      console.error('❌ Failed to get accounting records:', error);
      throw error;
    }
  }

  /**
   * Create export record
   */
  async createExportRecord(data: {
    merchantId: string;
    type: 'csv' | 'quickbooks';
    period: { start: string; end: string };
    format: 'csv' | 'json' | 'xml';
    recordCount: number;
  }): Promise<AccountingExport> {
    try {
      const exportRecord: AccountingExport = {
        id: uuidv4(),
        merchantId: data.merchantId,
        type: data.type,
        period: data.period,
        format: data.format,
        status: 'generating',
        recordCount: data.recordCount,
        createdAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('accounting_exports')
        .insert({
          id: exportRecord.id,
          merchant_id: exportRecord.merchantId,
          type: exportRecord.type,
          period_start: exportRecord.period.start,
          period_end: exportRecord.period.end,
          format: exportRecord.format,
          status: exportRecord.status,
          record_count: exportRecord.recordCount,
          created_at: exportRecord.createdAt,
        });

      if (error) {
        throw new Error(`Failed to create export record: ${error.message}`);
      }

      return exportRecord;
    } catch (error: any) {
      console.error('❌ Failed to create export record:', error);
      throw error;
    }
  }

  /**
   * Update export status
   */
  async updateExportStatus(
    exportId: string,
    status: 'pending' | 'generating' | 'completed' | 'failed',
    fileUrl?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      if (fileUrl) {
        updateData.file_url = fileUrl;
      }

      const { error } = await supabase
        .from('accounting_exports')
        .update(updateData)
        .eq('id', exportId);

      if (error) {
        throw new Error(`Failed to update export status: ${error.message}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to update export status:', error);
      throw error;
    }
  }

  /**
   * Send export to QuickBooks webhook
   */
  async sendToQuickBooks(
    merchantId: string,
    startDate: string,
    endDate: string,
    webhookUrl: string
  ): Promise<{ exportId: string; status: string }> {
    try {
      // Get accounting records
      const records = await this.getAccountingRecords(merchantId, startDate, endDate);

      // Format for QuickBooks
      const quickbooksData = {
        merchantId,
        period: { start: startDate, end: endDate },
        records: records.map(record => ({
          date: record.date,
          type: record.type,
          reference: record.reference,
          description: record.description,
          amount: record.amount,
          currency: record.currency,
          debitAccount: record.debitAccount,
          creditAccount: record.creditAccount,
          txHash: record.txHash,
        })),
      };

      // Create export record
      const exportRecord = await this.createExportRecord({
        merchantId,
        type: 'quickbooks',
        period: { start: startDate, end: endDate },
        format: 'json',
        recordCount: records.length,
      });

      // Send to QuickBooks webhook
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(quickbooksData),
        });

        if (!response.ok) {
          throw new Error(`QuickBooks webhook failed: ${response.statusText}`);
        }

        await this.updateExportStatus(exportRecord.id, 'completed');

        console.log(`✅ Sent export to QuickBooks: ${exportRecord.id}`);
        return {
          exportId: exportRecord.id,
          status: 'completed',
        };
      } catch (error: any) {
        await this.updateExportStatus(exportRecord.id, 'failed');
        throw error;
      }
    } catch (error: any) {
      console.error('❌ Failed to send to QuickBooks:', error);
      throw error;
    }
  }

  /**
   * Get export by ID
   */
  async getExport(exportId: string): Promise<AccountingExport | null> {
    try {
      const { data, error } = await supabase
        .from('accounting_exports')
        .select('*')
        .eq('id', exportId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to get export: ${error.message}`);
      }

      return this.mapDbToExport(data);
    } catch (error: any) {
      console.error('❌ Failed to get export:', error);
      throw error;
    }
  }

  /**
   * Get exports for a merchant
   */
  async getMerchantExports(merchantId: string): Promise<AccountingExport[]> {
    try {
      const { data, error } = await supabase
        .from('accounting_exports')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get exports: ${error.message}`);
      }

      return (data || []).map(row => this.mapDbToExport(row));
    } catch (error: any) {
      console.error('❌ Failed to get merchant exports:', error);
      throw error;
    }
  }

  /**
   * Map database row to AccountingExport
   */
  private mapDbToExport(row: any): AccountingExport {
    return {
      id: row.id,
      merchantId: row.merchant_id,
      type: row.type as 'csv' | 'quickbooks',
      period: {
        start: row.period_start,
        end: row.period_end,
      },
      format: row.format as 'csv' | 'json' | 'xml',
      status: row.status as 'pending' | 'generating' | 'completed' | 'failed',
      fileUrl: row.file_url,
      recordCount: row.record_count,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      completedAt: row.completed_at,
    };
  }
}

// Singleton instance
let accountingServiceInstance: AccountingService | null = null;

export function getAccountingService(): AccountingService {
  if (!accountingServiceInstance) {
    accountingServiceInstance = new AccountingService();
  }
  return accountingServiceInstance;
}

