/**
 * FX Quote Service Types
 * Normalized quote model for currency exchange
 */

export interface QuoteRequest {
  from: string; // Source currency (e.g., 'EUR', 'USD')
  to: string; // Destination currency (e.g., 'USDC', 'USD')
  amount: number; // Amount to convert
  corridor?: string; // Optional corridor identifier (e.g., 'EUR-US', 'GBP-EU')
}

export interface QuoteResponse {
  quoteId: string; // Unique quote identifier
  from: string;
  to: string;
  amount: number; // Original amount
  rate: number; // Exchange rate (1 from = rate to)
  convertedAmount: number; // Amount after conversion
  spread: number; // Spread percentage (e.g., 0.5 for 0.5%)
  fees: {
    provider: number; // Provider fee
    network?: number; // Network fee (for crypto)
    total: number; // Total fees
  };
  totalAmount: number; // Final amount after fees
  eta: number; // Estimated time to arrival in seconds
  expiresAt: string; // ISO timestamp when quote expires
  provider: string; // Provider name (e.g., 'mock', 'exchangerate-api')
  corridor?: {
    id: string;
    constraints: CorridorConstraints;
  };
  metadata?: {
    source: string; // Data source
    timestamp: string; // Quote timestamp
    confidence?: number; // Confidence score (0-1)
  };
}

export interface CorridorConstraints {
  kycRequired: boolean;
  kybRequired: boolean;
  sanctionsCheck: boolean;
  travelRuleRequired: boolean;
  minAmount?: number;
  maxAmount?: number;
  supportedCurrencies: string[];
  estimatedDelivery: number; // seconds
  complianceLevel: 'low' | 'medium' | 'high';
}

export interface FXProvider {
  name: string;
  getQuote(request: QuoteRequest): Promise<QuoteResponse>;
  isAvailable(): Promise<boolean>;
  getSupportedCurrencies(): Promise<string[]>;
}

