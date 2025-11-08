/**
 * Corridor Route Service
 * Orchestrates route selection, policy evaluation, and failover logic
 */

import {
  RouteRequest,
  RouteResponse,
  Route,
  PolicyEvaluation,
  TravelRulePayload,
  PSPAdapter,
} from './types';
import { getPolicyRegistry } from './policyPacks';
import {
  FastPayAdapter,
  CheapTransferAdapter,
  ReliableRouteAdapter,
} from './pspAdapters';
import { getQuoteService } from '../fx/quoteService';
import { v4 as uuidv4 } from 'uuid';

export class RouteService {
  private pspAdapters: PSPAdapter[] = [];
  private policyRegistry = getPolicyRegistry();

  constructor() {
    // Initialize PSP adapters
    this.pspAdapters = [
      new FastPayAdapter(),
      new CheapTransferAdapter(),
      new ReliableRouteAdapter(),
    ];
  }

  /**
   * Choose best route for a transfer request
   * Returns selected route with policy evaluation and alternatives
   */
  async chooseRoute(request: RouteRequest): Promise<RouteResponse> {
    // Validate request
    this.validateRequest(request);

    // Get policy pack for corridor
    const policyPack = this.policyRegistry.getPolicyPack(request.corridor) ||
      this.policyRegistry.getPolicyPack('DEFAULT');

    if (!policyPack) {
      throw new Error(`No policy pack found for corridor: ${request.corridor}`);
    }

    // Evaluate policy
    const policyEvaluation = await this.evaluatePolicy(
      policyPack,
      request.amount,
      request.userId,
      request.metadata
    );

    // If policy evaluation failed, return error
    if (!policyEvaluation.passed) {
      throw new Error(`Policy evaluation failed: ${policyEvaluation.errors.join(', ')}`);
    }

    // Get available PSP adapters for this corridor
    const availableAdapters = await this.getAvailableAdapters(request.corridor);

    if (availableAdapters.length === 0) {
      throw new Error(`No PSP adapters available for corridor: ${request.corridor}`);
    }

    // Get routes from all available adapters
    const routes = await Promise.all(
      availableAdapters.map(adapter => adapter.getRoute(request))
    );

    // Score and sort routes
    const scoredRoutes = routes.sort((a, b) => b.score - a.score);

    // Select best route
    const selectedRoute = scoredRoutes[0];
    const alternativeRoutes = scoredRoutes.slice(1, 3); // Top 2 alternatives

    // Get FX quote if needed
    let quote;
    if (request.from !== request.to) {
      try {
        const fxQuote = await getQuoteService().getQuote({
          from: request.from,
          to: request.to,
          amount: request.amount,
          corridor: request.corridor,
        });
        quote = {
          rate: fxQuote.rate,
          fees: fxQuote.fees.total,
          totalAmount: fxQuote.totalAmount,
        };
      } catch (error) {
        console.warn('⚠️  Failed to get FX quote:', error);
      }
    }

    const routeId = uuidv4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    return {
      routeId,
      corridor: request.corridor,
      from: request.from,
      to: request.to,
      amount: request.amount,
      selectedRoute,
      alternativeRoutes,
      policyEvaluation,
      quote,
      expiresAt,
    };
  }

  /**
   * Get available PSP adapters for a corridor
   */
  private async getAvailableAdapters(corridor: string): Promise<PSPAdapter[]> {
    const available: PSPAdapter[] = [];

    for (const adapter of this.pspAdapters) {
      // Check if adapter supports this corridor
      if (adapter.corridors.includes(corridor)) {
        // Check if adapter is available
        const isAvailable = await adapter.isAvailable();
        if (isAvailable) {
          available.push(adapter);
        }
      }
    }

    return available;
  }

  /**
   * Evaluate policy against request
   */
  private async evaluatePolicy(
    policyPack: any,
    amount: number,
    userId?: string,
    metadata?: any
  ): Promise<PolicyEvaluation> {
    const evaluation = this.policyRegistry.evaluatePolicy(policyPack, amount, userId);

    // Build policy evaluation response
    const policyEvaluation: PolicyEvaluation = {
      passed: evaluation.passed,
      kycRequired: policyPack.kycRequired && amount > 1000,
      kybRequired: policyPack.kybRequired,
      sanctionsCheck: {
        required: policyPack.sanctionsCheck,
        passed: true, // Mock: always pass (in production, call sanctions API)
        reason: policyPack.sanctionsCheck ? 'Sanctions check passed' : undefined,
      },
      travelRule: {
        required: policyPack.travelRuleRequired && amount > 1000,
        passed: true, // Mock: always pass
        payload: this.buildTravelRulePayload(amount, metadata),
      },
      complianceLevel: policyPack.complianceLevel,
      constraints: [],
      warnings: evaluation.warnings,
      errors: evaluation.errors,
    };

    // Add constraints
    if (policyPack.minAmount) {
      policyEvaluation.constraints.push(`Minimum amount: ${policyPack.minAmount}`);
    }
    if (policyPack.maxAmount) {
      policyEvaluation.constraints.push(`Maximum amount: ${policyPack.maxAmount}`);
    }
    if (policyEvaluation.kycRequired) {
      policyEvaluation.constraints.push('KYC verification required');
    }
    if (policyEvaluation.travelRule.required) {
      policyEvaluation.constraints.push('Travel Rule compliance required');
    }

    return policyEvaluation;
  }

  /**
   * Build Travel Rule payload
   */
  private buildTravelRulePayload(amount: number, metadata?: any): TravelRulePayload | undefined {
    if (!metadata?.recipientInfo) {
      return undefined;
    }

    const recipient = metadata.recipientInfo;

    return {
      originator: {
        name: metadata.originatorName || 'User',
        accountNumber: metadata.originatorAccount,
        address: metadata.originatorAddress,
        country: metadata.originatorCountry || 'US',
      },
      beneficiary: {
        name: recipient.name || 'Recipient',
        accountNumber: recipient.accountNumber,
        address: recipient.address,
        country: recipient.country || 'US',
      },
      transaction: {
        amount,
        currency: metadata.currency || 'USD',
        reference: uuidv4(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate route request
   */
  private validateRequest(request: RouteRequest): void {
    if (!request.from || !request.to) {
      throw new Error('from and to are required');
    }

    if (!request.corridor) {
      throw new Error('corridor is required');
    }

    if (!request.amount || request.amount <= 0) {
      throw new Error('amount must be greater than 0');
    }
  }

  /**
   * Get all available corridors
   */
  getAvailableCorridors(): string[] {
    const corridors = new Set<string>();
    this.pspAdapters.forEach(adapter => {
      adapter.corridors.forEach(corridor => corridors.add(corridor));
    });
    return Array.from(corridors).sort();
  }

  /**
   * Get PSP adapters
   */
  getPSPAdapters(): PSPAdapter[] {
    return this.pspAdapters;
  }
}

// Singleton instance
let routeServiceInstance: RouteService | null = null;

export function getRouteService(): RouteService {
  if (!routeServiceInstance) {
    routeServiceInstance = new RouteService();
  }
  return routeServiceInstance;
}

