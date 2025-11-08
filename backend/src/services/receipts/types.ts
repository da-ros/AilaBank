/**
 * Best-Execution Receipt Types
 * Proof-of-Best-Execution receipt with quote set, route, FX, fees, and on-chain anchor
 */

import { QuoteResponse } from '../fx/types';
import { RouteResponse } from '../corridor/types';

export interface BestExecutionReceipt {
  receiptId: string; // Unique receipt identifier
  userId?: string; // Optional user ID
  timestamp: string; // ISO timestamp when receipt was created
  quoteSet: QuoteSet; // All quotes considered
  chosenRoute: RouteSnapshot; // Selected route snapshot
  fx: FXSnapshot; // FX conversion details
  fees: FeesBreakdown; // Complete fee breakdown
  spread: SpreadBreakdown; // Spread analysis
  onChainAnchor?: OnChainAnchor; // On-chain proof anchor
  metadata: ReceiptMetadata;
}

export interface QuoteSet {
  quotes: QuoteResponse[]; // All quotes from all providers
  bestQuote: QuoteResponse; // Best quote selected
  comparison: {
    providerCount: number;
    priceRange: {
      min: number;
      max: number;
      best: number;
    };
    spreadRange: {
      min: number;
      max: number;
      best: number;
    };
  };
}

export interface RouteSnapshot {
  routeId: string;
  corridor: string;
  psp: {
    id: string;
    name: string;
  };
  cost: number;
  speed: number; // seconds
  reliability: number; // 0-1
  score: number; // Overall score
  alternatives: Array<{
    routeId: string;
    psp: string;
    cost: number;
    score: number;
  }>;
  policyEvaluation: {
    passed: boolean;
    complianceLevel: string;
    constraints: string[];
  };
}

export interface FXSnapshot {
  from: string;
  to: string;
  amount: number;
  rate: number;
  convertedAmount: number;
  spread: number; // percentage
  provider: string;
  timestamp: string;
}

export interface FeesBreakdown {
  fx: {
    provider: number;
    network?: number;
    total: number;
  };
  route: {
    psp: number;
    total: number;
  };
  total: number; // All fees combined
  breakdown: Array<{
    type: string; // 'fx_provider', 'fx_network', 'psp', etc.
    description: string;
    amount: number;
  }>;
}

export interface SpreadBreakdown {
  fxSpread: number; // FX spread percentage
  routeSpread: number; // Route spread (implicit in cost)
  totalSpread: number; // Combined spread
  comparison: {
    marketRate?: number; // Market rate if available
    ourRate: number;
    difference: number; // Difference from market
    differencePercent: number; // Percentage difference
  };
}

export interface OnChainAnchor {
  txHash: string; // Transaction hash on-chain
  blockNumber: number; // Block number
  blockTimestamp: string; // Block timestamp
  receiptHash: string; // Keccak256 hash of receipt JSON
  contractAddress: string; // Contract address that emitted the event
  eventName: string; // Event name (e.g., 'BestExecReceipt')
  chainId: number; // Chain ID (Arc testnet/mainnet)
}

export interface ReceiptMetadata {
  version: string; // Receipt format version
  generatedAt: string; // ISO timestamp
  expiresAt?: string; // Optional expiry
  correlationId?: string; // Correlation ID for tracking
  source: string; // Source system (e.g., 'ailabank-backend')
  tags?: string[]; // Optional tags for categorization
}

export interface CreateReceiptRequest {
  userId?: string;
  quoteSet: QuoteSet;
  chosenRoute: RouteSnapshot;
  fx: FXSnapshot;
  fees: FeesBreakdown;
  spread: SpreadBreakdown;
  metadata?: Partial<ReceiptMetadata>;
}

