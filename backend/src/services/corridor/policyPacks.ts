/**
 * Corridor Policy Packs
 * Defines compliance rules per corridor
 */

import { PolicyPack, PolicyRule } from './types';

export class PolicyPackRegistry {
  private packs: Map<string, PolicyPack> = new Map();

  constructor() {
    this.initializePacks();
  }

  getPolicyPack(corridor: string): PolicyPack | null {
    return this.packs.get(corridor.toUpperCase()) || null;
  }

  getAllPacks(): PolicyPack[] {
    return Array.from(this.packs.values());
  }

  private initializePacks(): void {
    // EUR-US Corridor (High compliance)
    this.packs.set('EUR-US', {
      corridor: 'EUR-US',
      kycRequired: true,
      kybRequired: false,
      sanctionsCheck: true,
      travelRuleRequired: true,
      minAmount: 100,
      maxAmount: 100000,
      supportedCurrencies: ['EUR', 'USD', 'USDC'],
      complianceLevel: 'high',
      rules: [
        {
          type: 'kyc',
          condition: 'amount > 1000',
          action: 'require',
          message: 'KYC verification required for amounts over $1,000',
        },
        {
          type: 'sanctions',
          condition: 'always',
          action: 'require',
          message: 'Sanctions screening required for all transactions',
        },
        {
          type: 'travel_rule',
          condition: 'amount > 1000',
          action: 'require',
          message: 'Travel Rule compliance required for amounts over $1,000',
        },
        {
          type: 'amount',
          condition: 'amount < 100',
          action: 'deny',
          message: 'Minimum amount is $100',
        },
        {
          type: 'amount',
          condition: 'amount > 100000',
          action: 'deny',
          message: 'Maximum amount is $100,000',
        },
      ],
    });

    // GBP-EU Corridor (High compliance)
    this.packs.set('GBP-EU', {
      corridor: 'GBP-EU',
      kycRequired: true,
      kybRequired: false,
      sanctionsCheck: true,
      travelRuleRequired: true,
      minAmount: 50,
      maxAmount: 50000,
      supportedCurrencies: ['GBP', 'EUR', 'USDC'],
      complianceLevel: 'high',
      rules: [
        {
          type: 'kyc',
          condition: 'amount > 1000',
          action: 'require',
          message: 'KYC verification required for amounts over £1,000',
        },
        {
          type: 'sanctions',
          condition: 'always',
          action: 'require',
          message: 'Sanctions screening required',
        },
        {
          type: 'travel_rule',
          condition: 'amount > 1000',
          action: 'require',
          message: 'Travel Rule compliance required for amounts over £1,000',
        },
      ],
    });

    // USD-EU Corridor (Medium compliance)
    this.packs.set('USD-EU', {
      corridor: 'USD-EU',
      kycRequired: true,
      kybRequired: false,
      sanctionsCheck: true,
      travelRuleRequired: false,
      minAmount: 100,
      maxAmount: 100000,
      supportedCurrencies: ['USD', 'EUR', 'USDC'],
      complianceLevel: 'medium',
      rules: [
        {
          type: 'kyc',
          condition: 'amount > 5000',
          action: 'require',
          message: 'KYC verification required for amounts over $5,000',
        },
        {
          type: 'sanctions',
          condition: 'always',
          action: 'require',
          message: 'Sanctions screening required',
        },
      ],
    });

    // Generic Low Compliance Corridor
    this.packs.set('DEFAULT', {
      corridor: 'DEFAULT',
      kycRequired: false,
      kybRequired: false,
      sanctionsCheck: true,
      travelRuleRequired: false,
      minAmount: 10,
      maxAmount: 10000,
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'USDC'],
      complianceLevel: 'low',
      rules: [
        {
          type: 'sanctions',
          condition: 'always',
          action: 'require',
          message: 'Basic sanctions screening required',
        },
      ],
    });
  }

  /**
   * Evaluate policy rules against a request
   */
  evaluatePolicy(pack: PolicyPack, amount: number, userId?: string): {
    passed: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    for (const rule of pack.rules) {
      const conditionMet = this.evaluateCondition(rule.condition, amount, userId);

      if (conditionMet) {
        switch (rule.action) {
          case 'deny':
            errors.push(rule.message);
            break;
          case 'require':
            warnings.push(rule.message);
            break;
          case 'warn':
            warnings.push(rule.message);
            break;
          case 'allow':
            // No action needed
            break;
        }
      }
    }

    return {
      passed: errors.length === 0,
      warnings,
      errors,
    };
  }

  private evaluateCondition(condition: string, amount: number, userId?: string): boolean {
    // Simple condition evaluation
    // In production, use a proper expression evaluator
    if (condition === 'always') {
      return true;
    }

    if (condition.includes('amount >')) {
      const threshold = parseFloat(condition.split('>')[1].trim());
      return amount > threshold;
    }

    if (condition.includes('amount <')) {
      const threshold = parseFloat(condition.split('<')[1].trim());
      return amount < threshold;
    }

    if (condition.includes('amount >=')) {
      const threshold = parseFloat(condition.split('>=')[1].trim());
      return amount >= threshold;
    }

    if (condition.includes('amount <=')) {
      const threshold = parseFloat(condition.split('<=')[1].trim());
      return amount <= threshold;
    }

    return false;
  }
}

// Singleton instance
let policyRegistryInstance: PolicyPackRegistry | null = null;

export function getPolicyRegistry(): PolicyPackRegistry {
  if (!policyRegistryInstance) {
    policyRegistryInstance = new PolicyPackRegistry();
  }
  return policyRegistryInstance;
}

