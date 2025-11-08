/**
 * Corridor Router Types
 * Types for corridor routing, PSP adapters, and policy evaluation
 */

export interface RouteRequest {
  from: string; // Source currency/country
  to: string; // Destination currency/country
  amount: number; // Amount to transfer
  corridor: string; // Corridor identifier (e.g., 'EUR-US', 'GBP-EU')
  userId?: string; // Optional user ID for policy evaluation
  metadata?: {
    purpose?: string;
    recipientInfo?: RecipientInfo;
    [key: string]: any;
  };
}

export interface RecipientInfo {
  name?: string;
  address?: string;
  country?: string;
  accountNumber?: string;
  bankName?: string;
}

export interface RouteResponse {
  routeId: string;
  corridor: string;
  from: string;
  to: string;
  amount: number;
  selectedRoute: Route;
  alternativeRoutes: Route[]; // Backup routes
  policyEvaluation: PolicyEvaluation;
  quote?: {
    rate: number;
    fees: number;
    totalAmount: number;
  };
  expiresAt: string;
}

export interface Route {
  routeId: string;
  psp: PSPAdapter;
  cost: number; // Total cost (fees + spread)
  speed: number; // Estimated delivery time in seconds
  reliability: number; // Reliability score (0-1)
  score: number; // Overall score (weighted combination)
  metadata: {
    provider: string;
    method: string; // 'bank_transfer', 'card', 'crypto', etc.
    estimatedDelivery: number; // seconds
    minAmount?: number;
    maxAmount?: number;
    supportedCurrencies: string[];
  };
}

export interface PolicyEvaluation {
  passed: boolean;
  kycRequired: boolean;
  kybRequired: boolean;
  sanctionsCheck: {
    required: boolean;
    passed: boolean;
    reason?: string;
  };
  travelRule: {
    required: boolean;
    passed: boolean;
    payload?: TravelRulePayload;
  };
  complianceLevel: 'low' | 'medium' | 'high';
  constraints: string[]; // List of constraints that apply
  warnings: string[]; // Non-blocking warnings
  errors: string[]; // Blocking errors
}

export interface TravelRulePayload {
  originator: {
    name: string;
    accountNumber?: string;
    address?: string;
    country: string;
  };
  beneficiary: {
    name: string;
    accountNumber?: string;
    address?: string;
    country: string;
  };
  transaction: {
    amount: number;
    currency: string;
    reference: string;
  };
  timestamp: string;
}

export interface PolicyPack {
  corridor: string;
  kycRequired: boolean;
  kybRequired: boolean;
  sanctionsCheck: boolean;
  travelRuleRequired: boolean;
  minAmount?: number;
  maxAmount?: number;
  supportedCurrencies: string[];
  complianceLevel: 'low' | 'medium' | 'high';
  rules: PolicyRule[];
}

export interface PolicyRule {
  type: 'kyc' | 'kyb' | 'sanctions' | 'travel_rule' | 'amount' | 'currency' | 'custom';
  condition: string; // Condition to evaluate
  action: 'allow' | 'deny' | 'warn' | 'require';
  message: string;
}

export interface PSPAdapter {
  id: string;
  name: string;
  type: 'off_ramp' | 'on_ramp' | 'both';
  corridors: string[]; // Supported corridors
  getRoute(request: RouteRequest): Promise<Route>;
  isAvailable(): Promise<boolean>;
  getSupportedCurrencies(): Promise<string[]>;
  getCapabilities(): PSPCapabilities;
}

export interface PSPCapabilities {
  minAmount: number;
  maxAmount: number;
  supportedCurrencies: string[];
  supportedCountries: string[];
  estimatedDelivery: number; // seconds
  fees: {
    fixed: number;
    percentage: number;
  };
  methods: string[]; // ['bank_transfer', 'card', 'crypto', etc.]
}

export interface RouteScore {
  cost: number; // Normalized cost score (0-1, lower is better)
  speed: number; // Normalized speed score (0-1, higher is better)
  reliability: number; // Reliability score (0-1, higher is better)
  total: number; // Weighted total score
}

