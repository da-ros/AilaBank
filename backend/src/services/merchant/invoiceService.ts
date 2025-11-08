/**
 * Invoice Service
 * Create, fetch, pay, and refund invoices
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../db/supabase';
import { getLedgerService } from '../ledger/ledgerService';
import {
  Invoice,
  InvoiceStatus,
  CreateInvoiceRequest,
  PayInvoiceRequest,
  RefundInvoiceRequest,
  PaymentMethod,
} from './types';
import CircleService from '../circle/circleService';

export class InvoiceService {
  /**
   * Create a new invoice
   */
  async createInvoice(request: CreateInvoiceRequest): Promise<Invoice> {
    try {
      // Generate unique invoice number
      const invoiceNumber = await this.generateInvoiceNumber(request.merchantId);

      const invoice: Invoice = {
        id: uuidv4(),
        merchantId: request.merchantId,
        customerId: request.customerId,
        invoiceNumber,
        status: 'draft',
        amount: request.amount,
        currency: request.currency || 'USDC',
        description: request.description,
        lineItems: request.lineItems,
        dueDate: request.dueDate,
        paidAmount: 0,
        refundedAmount: 0,
        metadata: request.metadata || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Store in database
      const { error } = await supabase
        .from('invoices')
        .insert({
          id: invoice.id,
          merchant_id: invoice.merchantId,
          customer_id: invoice.customerId,
          invoice_number: invoice.invoiceNumber,
          status: invoice.status,
          amount: invoice.amount.toString(),
          currency: invoice.currency,
          description: invoice.description,
          line_items: invoice.lineItems || [],
          due_date: invoice.dueDate,
          paid_amount: '0',
          refunded_amount: '0',
          metadata: invoice.metadata,
          created_at: invoice.createdAt,
          updated_at: invoice.updatedAt,
        });

      if (error) {
        throw new Error(`Failed to create invoice: ${error.message}`);
      }

      console.log(`✅ Invoice created: ${invoice.invoiceNumber} (${invoice.id})`);
      return invoice;
    } catch (error: any) {
      console.error('❌ Failed to create invoice:', error);
      throw error;
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(`Failed to get invoice: ${error.message}`);
      }

      return this.mapDbToInvoice(data);
    } catch (error: any) {
      console.error('❌ Failed to get invoice:', error);
      throw error;
    }
  }

  /**
   * Get invoices for a merchant
   */
  async getMerchantInvoices(
    merchantId: string,
    status?: InvoiceStatus,
    page: number = 1,
    limit: number = 50
  ): Promise<{ invoices: Invoice[]; total: number; hasMore: boolean }> {
    try {
      let query = supabase
        .from('invoices')
        .select('*', { count: 'exact' })
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to get invoices: ${error.message}`);
      }

      const invoices = (data || []).map(row => this.mapDbToInvoice(row));

      return {
        invoices,
        total: count || 0,
        hasMore: (count || 0) > page * limit,
      };
    } catch (error: any) {
      console.error('❌ Failed to get merchant invoices:', error);
      throw error;
    }
  }

  /**
   * Pay an invoice
   */
  async payInvoice(request: PayInvoiceRequest): Promise<Invoice> {
    try {
      const invoice = await this.getInvoice(request.invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status === 'paid') {
        throw new Error('Invoice is already paid');
      }

      if (invoice.status === 'cancelled' || invoice.status === 'refunded') {
        throw new Error(`Cannot pay invoice with status: ${invoice.status}`);
      }

      const paymentAmount = request.amount || invoice.amount;
      const remainingAmount = invoice.amount - invoice.paidAmount;

      if (paymentAmount > remainingAmount) {
        throw new Error(`Payment amount (${paymentAmount}) exceeds remaining amount (${remainingAmount})`);
      }

      // Get customer wallet
      const { data: customer } = await supabase
        .from('users')
        .select('circle_wallet_id, address')
        .eq('id', request.customerId)
        .single();

      if (!customer?.circle_wallet_id) {
        throw new Error('Customer wallet not found');
      }

      // Get merchant wallet
      const { data: merchant } = await supabase
        .from('users')
        .select('circle_wallet_id, address')
        .eq('id', invoice.merchantId)
        .single();

      if (!merchant?.circle_wallet_id) {
        throw new Error('Merchant wallet not found');
      }

      // Initiate transfer from customer to merchant
      const circleService = new CircleService();
      const transfer = await circleService.transferToArc({
        walletId: customer.circle_wallet_id,
        destinationAddress: merchant.address!,
        amount: paymentAmount.toString(),
        userId: request.customerId,
      });

      // Update invoice
      const newPaidAmount = invoice.paidAmount + paymentAmount;
      const newStatus: InvoiceStatus = newPaidAmount >= invoice.amount ? 'paid' : 'partially_paid';

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          status: newStatus,
          paid_amount: newPaidAmount.toString(),
          paid_date: newStatus === 'paid' ? new Date().toISOString() : null,
          payment_method: request.paymentMethod || 'wallet',
          tx_hash: transfer.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id);

      if (updateError) {
        throw new Error(`Failed to update invoice: ${updateError.message}`);
      }

      // Create ledger entries
      const ledgerService = getLedgerService();
      const correlationId = uuidv4();

      // Customer: debit wallet
      await ledgerService.createEntry(
        request.customerId,
        'transfer',
        'debit',
        paymentAmount,
        invoice.currency,
        'wallet',
        `Invoice payment: ${invoice.invoiceNumber}`,
        invoice.merchantId,
        transfer.id,
        {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
        }
      );

      // Merchant: credit wallet
      await ledgerService.createEntry(
        invoice.merchantId,
        'transfer',
        'credit',
        paymentAmount,
        invoice.currency,
        'wallet',
        `Invoice payment received: ${invoice.invoiceNumber}`,
        request.customerId,
        transfer.id,
        {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
        }
      );

      // Create yield-share accumulator for merchant
      await this.createYieldShareAccumulator({
        merchantId: invoice.merchantId,
        invoiceId: invoice.id,
        transactionId: transfer.id,
        settlementAmount: paymentAmount,
      });

      console.log(`✅ Invoice paid: ${invoice.invoiceNumber} - ${paymentAmount} ${invoice.currency}`);
      
      return (await this.getInvoice(invoice.id))!;
    } catch (error: any) {
      console.error('❌ Failed to pay invoice:', error);
      throw error;
    }
  }

  /**
   * Refund an invoice
   */
  async refundInvoice(request: RefundInvoiceRequest): Promise<Invoice> {
    try {
      const invoice = await this.getInvoice(request.invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.paidAmount === 0) {
        throw new Error('Invoice has no payments to refund');
      }

      const refundAmount = request.amount || invoice.paidAmount;
      if (refundAmount > invoice.paidAmount) {
        throw new Error(`Refund amount (${refundAmount}) exceeds paid amount (${invoice.paidAmount})`);
      }

      // Get merchant wallet
      const { data: merchant } = await supabase
        .from('users')
        .select('circle_wallet_id, address')
        .eq('id', invoice.merchantId)
        .single();

      if (!merchant?.circle_wallet_id) {
        throw new Error('Merchant wallet not found');
      }

      // Get customer wallet (from invoice metadata or customerId)
      const customerId = invoice.customerId;
      if (!customerId) {
        throw new Error('Customer ID not found for refund');
      }

      const { data: customer } = await supabase
        .from('users')
        .select('circle_wallet_id, address')
        .eq('id', customerId)
        .single();

      if (!customer?.circle_wallet_id) {
        throw new Error('Customer wallet not found');
      }

      // Initiate refund transfer from merchant to customer
      const circleService = new CircleService();
      const transfer = await circleService.transferToArc({
        walletId: merchant.circle_wallet_id,
        destinationAddress: customer.address!,
        amount: refundAmount.toString(),
        userId: invoice.merchantId,
      });

      // Update invoice
      const newRefundedAmount = invoice.refundedAmount + refundAmount;
      const newStatus: InvoiceStatus = newRefundedAmount >= invoice.paidAmount ? 'refunded' : invoice.status;

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          status: newStatus,
          refunded_amount: newRefundedAmount.toString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id);

      if (updateError) {
        throw new Error(`Failed to update invoice: ${updateError.message}`);
      }

      // Create ledger entries for refund
      const ledgerService = getLedgerService();

      // Merchant: debit wallet (refund)
      await ledgerService.createEntry(
        invoice.merchantId,
        'refund',
        'debit',
        refundAmount,
        invoice.currency,
        'wallet',
        `Invoice refund: ${invoice.invoiceNumber}`,
        customerId,
        transfer.id,
        {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          reason: request.reason,
        }
      );

      // Customer: credit wallet (refund received)
      await ledgerService.createEntry(
        customerId,
        'refund',
        'credit',
        refundAmount,
        invoice.currency,
        'wallet',
        `Invoice refund received: ${invoice.invoiceNumber}`,
        invoice.merchantId,
        transfer.id,
        {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
        }
      );

      console.log(`✅ Invoice refunded: ${invoice.invoiceNumber} - ${refundAmount} ${invoice.currency}`);
      
      return (await this.getInvoice(invoice.id))!;
    } catch (error: any) {
      console.error('❌ Failed to refund invoice:', error);
      throw error;
    }
  }

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(merchantId: string): Promise<string> {
    const prefix = 'INV';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Create yield-share accumulator
   */
  private async createYieldShareAccumulator(data: {
    merchantId: string;
    invoiceId?: string;
    subscriptionId?: string;
    transactionId: string;
    settlementAmount: number;
  }): Promise<void> {
    try {
      const { getYieldShareService } = await import('./yieldShareService');
      const yieldShareService = getYieldShareService();
      
      await yieldShareService.createAccumulator({
        merchantId: data.merchantId,
        invoiceId: data.invoiceId,
        subscriptionId: data.subscriptionId,
        transactionId: data.transactionId,
        settlementAmount: data.settlementAmount,
      });
    } catch (error: any) {
      console.error('⚠️  Failed to create yield-share accumulator:', error);
      // Don't throw - yield-share is non-critical
    }
  }

  /**
   * Map database row to Invoice
   */
  private mapDbToInvoice(row: any): Invoice {
    return {
      id: row.id,
      merchantId: row.merchant_id,
      customerId: row.customer_id,
      invoiceNumber: row.invoice_number,
      status: row.status as InvoiceStatus,
      amount: parseFloat(row.amount),
      currency: row.currency,
      description: row.description,
      lineItems: row.line_items || [],
      dueDate: row.due_date,
      paidDate: row.paid_date,
      paidAmount: parseFloat(row.paid_amount || '0'),
      refundedAmount: parseFloat(row.refunded_amount || '0'),
      metadata: row.metadata || {},
      paymentMethod: row.payment_method as PaymentMethod | undefined,
      txHash: row.tx_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Singleton instance
let invoiceServiceInstance: InvoiceService | null = null;

export function getInvoiceService(): InvoiceService {
  if (!invoiceServiceInstance) {
    invoiceServiceInstance = new InvoiceService();
  }
  return invoiceServiceInstance;
}

