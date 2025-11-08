/**
 * Treasury & RateSweep Types
 */

export type PolicyStatus = 'active' | 'paused' | 'archived';
export type AllocationAction = 'allocate_to_yield' | 'topup_buffer' | 'rebalance' | 'no_action';

export interface TreasuryPolicy {
  id: string;
  name: string;
  description: string;
  status: PolicyStatus;
  rules: PolicyRule[];
  priority: number; // Higher priority = evaluated first
  createdAt: string;
  updatedAt: string;
}

export interface PolicyRule {
  type: 'buffer_percent' | 'apy_threshold' | 'depeg_control' | 'idle_balance' | 'custom';
  condition: string; // e.g., "bufferPercent < 10"
  action: AllocationAction;
  parameters?: Record<string, any>;
}

export interface BalanceSnapshot {
  source: 'circle' | 'arc_vault' | 'arc_buffer' | 'arc_yield';
  balance: number;
  currency: string;
  timestamp: string;
  address?: string;
  walletId?: string;
}

export interface IdleBalance {
  source: 'circle' | 'arc_vault';
  amount: number;
  currency: string;
  address?: string;
  walletId?: string;
  idleSince: string; // ISO timestamp
  idleDuration: number; // seconds
}

export interface PolicyEvaluation {
  policyId: string;
  policyName: string;
  triggered: boolean;
  matchedRules: PolicyRule[];
  recommendedAction: AllocationAction;
  reasoning: string;
  confidence: number; // 0-1
  parameters?: Record<string, any>;
}

export interface RateSweepResult {
  runId: string;
  timestamp: string;
  balances: BalanceSnapshot[];
  idleBalances: IdleBalance[];
  evaluations: PolicyEvaluation[];
  actions: AllocationAction[];
  executed: boolean;
  executionResults?: ExecutionResult[];
  summary: {
    totalIdle: number;
    totalAllocated: number;
    totalYield: number;
    totalBuffer: number;
  };
}

export interface ExecutionResult {
  action: AllocationAction;
  success: boolean;
  amount: number;
  currency: string;
  txHash?: string;
  error?: string;
  timestamp: string;
}

export interface AllocationRequest {
  action: AllocationAction;
  amount: number;
  currency: string;
  source: 'circle' | 'arc_vault';
  destination: 'arc_vault' | 'arc_buffer' | 'arc_yield';
  parameters?: Record<string, any>;
}

