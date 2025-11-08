/**
 * Ledger & Audit Types
 * Double-entry accounting and audit trail types
 */

export type LedgerEntryType = 
  | 'deposit' 
  | 'withdraw' 
  | 'transfer' 
  | 'yield_accrued' 
  | 'fee' 
  | 'fx_conversion'
  | 'allocation'
  | 'buffer_topup'
  | 'buffer_withdraw'
  | 'refund';

export type EntrySide = 'debit' | 'credit';

export interface LedgerEntry {
  id: string;
  correlationId: string; // Links related entries across services
  userId: string;
  entryType: LedgerEntryType;
  side: EntrySide; // debit or credit
  amount: number;
  currency: string;
  counterparty?: string; // For transfers: destination user/wallet
  account: string; // Account identifier (e.g., 'wallet', 'buffer', 'yield_pool')
  description: string;
  txHash?: string; // On-chain transaction hash
  status: 'pending' | 'completed' | 'failed';
  metadata?: {
    routeId?: string;
    quoteId?: string;
    receiptId?: string;
    psp?: string;
    fxRate?: number;
    fees?: number;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface DoubleEntry {
  debit: LedgerEntry;
  credit: LedgerEntry;
  correlationId: string;
  description: string;
  timestamp: string;
}

export interface LedgerStats {
  userId?: string;
  totalDeposits: number;
  totalWithdrawals: number;
  totalYield: number;
  totalFees: number;
  currentBalance: number;
  currency: string;
  period: {
    start: string;
    end: string;
  };
  breakdown: {
    byType: Record<LedgerEntryType, number>;
    byAccount: Record<string, number>;
  };
}

export interface AuditLog {
  id: string;
  correlationId: string;
  userId?: string;
  actionType: string;
  service: string; // Service that created the log (e.g., 'circle', 'fx', 'route')
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  reasoning?: string;
  onChainProof?: string;
  createdAt: string;
}

export interface UserLedgerResponse {
  userId: string;
  entries: LedgerEntry[];
  balance: number;
  currency: string;
  stats: LedgerStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

