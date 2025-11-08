/**
 * Mock FX Provider
 * Provides deterministic quotes for testing
 */

import { FXProvider, QuoteRequest, QuoteResponse, CorridorConstraints } from './types';
import { v4 as uuidv4 } from 'uuid';

export class MockFXProvider implements FXProvider {
  name = 'mock';

  // Mock exchange rates (1 base currency = X target currency)
  private mockRates: Record<string, Record<string, number>> = {
    EUR: {
      USDC: 1.082,
      USD: 1.082,
      GBP: 0.857,
    },
    USD: {
      USDC: 1.0,
      EUR: 0.924,
      GBP: 0.792,
    },
    GBP: {
      USDC: 1.262,
      USD: 1.262,
      EUR: 1.166,
    },
    USDC: {
      USD: 1.0,
      EUR: 0.924,
      GBP: 0.792,
    },
  };

  // Mock spreads (percentage)
  private mockSpreads: Record<string, Record<string, number>> = {
    EUR: {
      USDC: 0.5, // 0.5% spread
      USD: 0.3,
      GBP: 0.4,
    },
    USD: {
      USDC: 0.1,
      EUR: 0.3,
      GBP: 0.4,
    },
    GBP: {
      USDC: 0.5,
      USD: 0.3,
      EUR: 0.3,
    },
    USDC: {
      USD: 0.0,
      EUR: 0.3,
      GBP: 0.4,
    },
  };

  async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    const { from, to, amount, corridor } = request;

    // Get base rate
    const baseRate = this.mockRates[from.toUpperCase()]?.[to.toUpperCase()];
    if (!baseRate) {
      throw new Error(`Exchange rate not available for ${from} to ${to}`);
    }

    // Get spread
    const spreadPercent = this.mockSpreads[from.toUpperCase()]?.[to.toUpperCase()] || 0.5;
    
    // Apply spread (buy rate is lower, sell rate is higher)
    const rate = baseRate * (1 - spreadPercent / 100);

    // Calculate converted amount
    const convertedAmount = amount * rate;

    // Calculate fees
    const providerFee = convertedAmount * 0.001; // 0.1% provider fee
    const networkFee = to === 'USDC' ? 0.5 : 0; // Network fee for crypto
    const totalFees = providerFee + networkFee;

    // Calculate total amount
    const totalAmount = convertedAmount - totalFees;

    // ETA based on currency pair and corridor
    let eta = 60; // Default 1 minute
    if (corridor) {
      // Mock ETA based on corridor
      const corridorETAs: Record<string, number> = {
        'EUR-US': 120, // 2 minutes
        'GBP-EU': 180, // 3 minutes
        'USD-EU': 90,  // 1.5 minutes
      };
      eta = corridorETAs[corridor] || eta;
    }

    // Get corridor constraints if provided
    let corridorConstraints: CorridorConstraints | undefined;
    if (corridor) {
      corridorConstraints = this.getCorridorConstraints(corridor);
    }

    const quoteId = uuidv4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes expiry

    return {
      quoteId,
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      amount,
      rate,
      convertedAmount,
      spread: spreadPercent,
      fees: {
        provider: providerFee,
        network: networkFee || undefined,
        total: totalFees,
      },
      totalAmount,
      eta,
      expiresAt,
      provider: this.name,
      corridor: corridor ? {
        id: corridor,
        constraints: corridorConstraints!,
      } : undefined,
      metadata: {
        source: 'mock',
        timestamp: new Date().toISOString(),
        confidence: 1.0,
      },
    };
  }

  async isAvailable(): Promise<boolean> {
    return true; // Mock is always available
  }

  async getSupportedCurrencies(): Promise<string[]> {
    return ['EUR', 'USD', 'GBP', 'USDC'];
  }

  private getCorridorConstraints(corridor: string): CorridorConstraints {
    // Mock corridor constraints
    const constraints: Record<string, CorridorConstraints> = {
      'EUR-US': {
        kycRequired: true,
        kybRequired: false,
        sanctionsCheck: true,
        travelRuleRequired: true,
        minAmount: 100,
        maxAmount: 100000,
        supportedCurrencies: ['EUR', 'USD', 'USDC'],
        estimatedDelivery: 120,
        complianceLevel: 'high',
      },
      'GBP-EU': {
        kycRequired: true,
        kybRequired: false,
        sanctionsCheck: true,
        travelRuleRequired: true,
        minAmount: 50,
        maxAmount: 50000,
        supportedCurrencies: ['GBP', 'EUR', 'USDC'],
        estimatedDelivery: 180,
        complianceLevel: 'high',
      },
      'USD-EU': {
        kycRequired: true,
        kybRequired: false,
        sanctionsCheck: true,
        travelRuleRequired: false,
        minAmount: 100,
        maxAmount: 100000,
        supportedCurrencies: ['USD', 'EUR', 'USDC'],
        estimatedDelivery: 90,
        complianceLevel: 'medium',
      },
    };

    return constraints[corridor] || {
      kycRequired: false,
      kybRequired: false,
      sanctionsCheck: true,
      travelRuleRequired: false,
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'USDC'],
      estimatedDelivery: 60,
      complianceLevel: 'low',
    };
  }
}

