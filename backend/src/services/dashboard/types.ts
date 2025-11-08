/**
 * Public Dashboard Types
 * KPIs and metrics for public reliability & cost dashboard
 */

export interface CorridorKPI {
  corridor: string; // e.g., 'EUR-US', 'GBP-EU'
  from: string; // Source currency/country
  to: string; // Destination currency/country
  metrics: {
    allInCost200: number; // All-in cost for $200 transfer (in USD)
    medianDelivery: number; // Median delivery time in seconds
    successRate: number; // Success rate (0-1)
    totalExecutions: number; // Total number of route executions
    successfulExecutions: number; // Number of successful executions
    failedExecutions: number; // Number of failed executions
  };
  costBreakdown: {
    averageFees: number; // Average fees in USD
    averageSpread: number; // Average spread in USD
    averageTotal: number; // Average total cost in USD
  };
  deliveryStats: {
    min: number; // Minimum delivery time (seconds)
    max: number; // Maximum delivery time (seconds)
    median: number; // Median delivery time (seconds)
    p95: number; // 95th percentile delivery time (seconds)
    p99: number; // 99th percentile delivery time (seconds)
  };
  lastUpdated: string; // ISO timestamp of last update
}

export interface RouteExecution {
  id: string;
  routeId: string;
  corridor: string;
  from: string;
  to: string;
  amount: number;
  pspId: string;
  pspName: string;
  status: 'success' | 'failed' | 'pending';
  cost: number; // Total cost (fees + spread)
  fees: number; // Fees only
  spread: number; // Spread only
  estimatedDelivery: number; // Estimated delivery time (seconds)
  actualDelivery?: number; // Actual delivery time (seconds) - if completed
  startedAt: string; // ISO timestamp
  completedAt?: string; // ISO timestamp - if completed
  error?: string; // Error message if failed
  receiptId?: string; // Link to receipt if available
}

export interface SystemStatus {
  status: 'operational' | 'degraded' | 'down';
  uptime: number; // Uptime percentage (0-100)
  lastIncident?: {
    timestamp: string;
    description: string;
    resolved: boolean;
  };
  corridors: {
    total: number;
    operational: number;
    degraded: number;
    down: number;
  };
  psp: {
    total: number;
    operational: number;
    degraded: number;
    down: number;
  };
  timestamp: string; // ISO timestamp
}

