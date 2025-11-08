/**
 * Merchant Toolkit Types
 * Invoices, subscriptions, yield-share, and accounting exports
 */

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled' | 'refunded';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired';
export type SubscriptionFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type PaymentMethod = 'wallet' | 'bank_transfer' | 'card' | 'crypto';

export interface Invoice {
  id: string;
  merchantId: string; // User ID of the merchant
  customerId?: string; // User ID of the customer (optional for public invoices)
  invoiceNumber: string; // Unique invoice number
  status: InvoiceStatus;
  amount: number;
  currency: string;
  description: string;
  lineItems?: InvoiceLineItem[];
  dueDate?: string;
  paidDate?: string;
  paidAmount: number;
  refundedAmount: number;
  metadata?: {
    customerEmail?: string;
    customerName?: string;
    billingAddress?: string;
    notes?: string;
    [key: string]: any;
  };
  paymentMethod?: PaymentMethod;
  txHash?: string; // On-chain transaction hash
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  tax?: number;
}

export interface CreateInvoiceRequest {
  merchantId: string;
  customerId?: string;
  amount: number;
  currency?: string;
  description: string;
  lineItems?: InvoiceLineItem[];
  dueDate?: string;
  metadata?: Record<string, any>;
}

export interface PayInvoiceRequest {
  invoiceId: string;
  customerId: string;
  paymentMethod?: PaymentMethod;
  amount?: number; // Optional: partial payment
}

export interface RefundInvoiceRequest {
  invoiceId: string;
  amount?: number; // Optional: partial refund
  reason?: string;
}

export interface SubscriptionPlan {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  frequency: SubscriptionFrequency;
  trialDays?: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  planId: string;
  merchantId: string;
  customerId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
  amount: number;
  currency: string;
  frequency: SubscriptionFrequency;
  metadata?: Record<string, any>;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionPlanRequest {
  merchantId: string;
  name: string;
  description: string;
  amount: number;
  currency?: string;
  frequency: SubscriptionFrequency;
  trialDays?: number;
  metadata?: Record<string, any>;
}

export interface SubscribeRequest {
  planId: string;
  customerId: string;
  paymentMethod?: PaymentMethod;
  metadata?: Record<string, any>;
}

export interface YieldShareAccumulator {
  id: string;
  merchantId: string;
  invoiceId?: string;
  subscriptionId?: string;
  transactionId: string;
  settlementAmount: number; // Original settlement amount
  yieldAccumulated: number; // Micro-yield accumulated
  yieldRate: number; // APY rate used
  status: 'accumulating' | 'payout_pending' | 'paid_out';
  payoutDate?: string;
  payoutTxHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountingExport {
  id: string;
  merchantId: string;
  type: 'csv' | 'quickbooks';
  period: {
    start: string;
    end: string;
  };
  format: 'csv' | 'json' | 'xml';
  status: 'pending' | 'generating' | 'completed' | 'failed';
  fileUrl?: string;
  recordCount: number;
  metadata?: Record<string, any>;
  createdAt: string;
  completedAt?: string;
}

export interface AccountingRecord {
  date: string;
  type: 'invoice' | 'subscription' | 'refund' | 'yield_payout';
  reference: string; // Invoice ID, subscription ID, etc.
  description: string;
  amount: number;
  currency: string;
  debitAccount?: string;
  creditAccount?: string;
  txHash?: string;
  metadata?: Record<string, any>;
}

