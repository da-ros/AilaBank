/**
 * ExchangeRate-API Provider
 * Real-time FX rates from exchangerate-api.com
 * Free tier: 1,500 requests/month
 */

import axios from 'axios';
import { FXProvider, QuoteRequest, QuoteResponse, CorridorConstraints } from './types';
import { v4 as uuidv4 } from 'uuid';

export class ExchangeRateAPIProvider implements FXProvider {
  name = 'exchangerate-api';
  private apiKey: string;
  private baseURL = 'https://v6.exchangerate-api.com/v6';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.EXCHANGERATE_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('⚠️  EXCHANGERATE_API_KEY not set - ExchangeRate-API provider will not be available');
    }
  }

  async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    if (!this.apiKey) {
      throw new Error('ExchangeRate-API key not configured');
    }

    const { from, to, amount, corridor } = request;

    try {
      // ExchangeRate-API uses base currency in URL
      // For crypto (USDC), we'll use USD as base and adjust
      const baseCurrency = from.toUpperCase();
      const targetCurrency = to.toUpperCase() === 'USDC' ? 'USD' : to.toUpperCase();

      // Fetch exchange rate
      const url = `${this.baseURL}/${this.apiKey}/latest/${baseCurrency}`;
      const response = await axios.get(url, {
        timeout: 5000,
      });

      const rates = response.data?.conversion_rates;
      if (!rates || !rates[targetCurrency]) {
        throw new Error(`Exchange rate not available for ${from} to ${targetCurrency}`);
      }

      // Get base rate
      const baseRate = rates[targetCurrency];

      // Apply spread (0.3% for real provider)
      const spreadPercent = 0.3;
      const rate = baseRate * (1 - spreadPercent / 100);

      // For USDC, rate is 1:1 with USD
      const finalRate = to.toUpperCase() === 'USDC' ? rate : baseRate * (1 - spreadPercent / 100);

      // Calculate converted amount
      const convertedAmount = amount * finalRate;

      // Calculate fees
      const providerFee = convertedAmount * 0.0015; // 0.15% provider fee
      const networkFee = to.toUpperCase() === 'USDC' ? 0.5 : 0; // Network fee for crypto
      const totalFees = providerFee + networkFee;

      // Calculate total amount
      const totalAmount = convertedAmount - totalFees;

      // ETA based on currency pair and corridor
      let eta = 120; // Default 2 minutes for real provider
      if (corridor) {
        const corridorETAs: Record<string, number> = {
          'EUR-US': 180, // 3 minutes
          'GBP-EU': 240, // 4 minutes
          'USD-EU': 150, // 2.5 minutes
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
        rate: finalRate,
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
          source: 'exchangerate-api.com',
          timestamp: new Date().toISOString(),
          confidence: 0.95,
        },
      };
    } catch (error: any) {
      console.error('❌ ExchangeRate-API error:', error.message);
      throw new Error(`Failed to get quote from ExchangeRate-API: ${error.message}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      // Test API with a simple request
      const url = `${this.baseURL}/${this.apiKey}/latest/USD`;
      await axios.get(url, { timeout: 3000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getSupportedCurrencies(): Promise<string[]> {
    // ExchangeRate-API supports many currencies
    // Common ones for our use case
    return ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'USDC'];
  }

  private getCorridorConstraints(corridor: string): CorridorConstraints {
    // Real corridor constraints (same structure as mock)
    const constraints: Record<string, CorridorConstraints> = {
      'EUR-US': {
        kycRequired: true,
        kybRequired: false,
        sanctionsCheck: true,
        travelRuleRequired: true,
        minAmount: 100,
        maxAmount: 100000,
        supportedCurrencies: ['EUR', 'USD', 'USDC'],
        estimatedDelivery: 180,
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
        estimatedDelivery: 240,
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
        estimatedDelivery: 150,
        complianceLevel: 'medium',
      },
    };

    return constraints[corridor] || {
      kycRequired: false,
      kybRequired: false,
      sanctionsCheck: true,
      travelRuleRequired: false,
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'USDC'],
      estimatedDelivery: 120,
      complianceLevel: 'low',
    };
  }
}

