/**
 * FX Quote Service
 * Orchestrates multiple FX providers and returns best quotes
 */

import { FXProvider, QuoteRequest, QuoteResponse } from './types';
import { MockFXProvider } from './mockProvider';
import { ExchangeRateAPIProvider } from './exchangerateProvider';
import { redis } from '../redis/redisClient';

export class QuoteService {
  private providers: FXProvider[] = [];
  private cacheTTL = 60; // Cache quotes for 60 seconds

  constructor() {
    // Always include mock provider
    this.providers.push(new MockFXProvider());

    // Add real provider if available
    const exchangeRateProvider = new ExchangeRateAPIProvider();
    exchangeRateProvider.isAvailable().then(available => {
      if (available) {
        this.providers.push(exchangeRateProvider);
        console.log('✅ ExchangeRate-API provider initialized');
      } else {
        console.log('⚠️  ExchangeRate-API provider not available (API key missing or service down)');
      }
    }).catch(() => {
      console.log('⚠️  ExchangeRate-API provider not available');
    });
  }

  /**
   * Get quote from available providers
   * Returns the best quote (highest totalAmount)
   */
  async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    // Validate request
    this.validateRequest(request);

    // Check cache first
    const cacheKey = this.getCacheKey(request);
    const cachedQuote = await this.getCachedQuote(cacheKey);
    if (cachedQuote) {
      console.log(`📋 Using cached quote for ${request.from} → ${request.to}`);
      return cachedQuote;
    }

    // Get quotes from all available providers
    const quotes = await Promise.allSettled(
      this.providers.map(provider => provider.getQuote(request))
    );

    // Filter successful quotes
    const successfulQuotes = quotes
      .filter((result): result is PromiseFulfilledResult<QuoteResponse> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);

    if (successfulQuotes.length === 0) {
      throw new Error('No FX providers available to generate quote');
    }

    // Select best quote (highest totalAmount after fees)
    const bestQuote = successfulQuotes.reduce((best, current) => {
      return current.totalAmount > best.totalAmount ? current : best;
    });

    // Cache the quote
    await this.cacheQuote(cacheKey, bestQuote);

    console.log(`✅ Best quote from ${bestQuote.provider}: ${request.amount} ${request.from} → ${bestQuote.totalAmount.toFixed(2)} ${request.to}`);

    return bestQuote;
  }

  /**
   * Get quotes from all providers (for comparison)
   */
  async getAllQuotes(request: QuoteRequest): Promise<QuoteResponse[]> {
    this.validateRequest(request);

    const quotes = await Promise.allSettled(
      this.providers.map(provider => provider.getQuote(request))
    );

    return quotes
      .filter((result): result is PromiseFulfilledResult<QuoteResponse> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value)
      .sort((a, b) => b.totalAmount - a.totalAmount); // Sort by best first
  }

  /**
   * Get available providers
   */
  async getAvailableProviders(): Promise<string[]> {
    const availability = await Promise.all(
      this.providers.map(async provider => ({
        name: provider.name,
        available: await provider.isAvailable(),
      }))
    );

    return availability
      .filter(p => p.available)
      .map(p => p.name);
  }

  /**
   * Get supported currencies from all providers
   */
  async getSupportedCurrencies(): Promise<string[]> {
    const allCurrencies = await Promise.all(
      this.providers.map(provider => provider.getSupportedCurrencies())
    );

    // Merge and deduplicate
    const uniqueCurrencies = new Set<string>();
    allCurrencies.forEach(currencies => {
      currencies.forEach(currency => uniqueCurrencies.add(currency));
    });

    return Array.from(uniqueCurrencies).sort();
  }

  private validateRequest(request: QuoteRequest): void {
    if (!request.from || !request.to) {
      throw new Error('from and to currencies are required');
    }

    if (!request.amount || request.amount <= 0) {
      throw new Error('amount must be greater than 0');
    }

    // Validate currency codes (3-4 characters, uppercase)
    const currencyRegex = /^[A-Z]{3,4}$/;
    if (!currencyRegex.test(request.from.toUpperCase()) || !currencyRegex.test(request.to.toUpperCase())) {
      throw new Error('Invalid currency code format');
    }
  }

  private getCacheKey(request: QuoteRequest): string {
    return `fx:quote:${request.from.toUpperCase()}:${request.to.toUpperCase()}:${request.amount}`;
  }

  private async getCachedQuote(cacheKey: string): Promise<QuoteResponse | null> {
    try {
      if (!redis) return null;

      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as QuoteResponse;
      }
    } catch (error) {
      console.warn('⚠️  Failed to get cached quote:', error);
    }
    return null;
  }

  private async cacheQuote(cacheKey: string, quote: QuoteResponse): Promise<void> {
    try {
      if (!redis) return;

      await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(quote));
    } catch (error) {
      console.warn('⚠️  Failed to cache quote:', error);
    }
  }
}

// Singleton instance
let quoteServiceInstance: QuoteService | null = null;

export function getQuoteService(): QuoteService {
  if (!quoteServiceInstance) {
    quoteServiceInstance = new QuoteService();
  }
  return quoteServiceInstance;
}

