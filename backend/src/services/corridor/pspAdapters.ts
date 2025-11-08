/**
 * PSP (Payment Service Provider) Adapters
 * Mock implementations for off-ramp providers
 */

import { PSPAdapter, RouteRequest, Route, PSPCapabilities } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mock PSP Adapter 1: FastPay (Fast but expensive)
 */
export class FastPayAdapter implements PSPAdapter {
  id = 'fastpay';
  name = 'FastPay';
  type = 'off_ramp' as const;
  corridors = ['EUR-US', 'GBP-EU', 'USD-EU'];

  async getRoute(request: RouteRequest): Promise<Route> {
    const { amount, corridor } = request;

    // FastPay: Fast delivery but higher fees
    const fixedFee = 5;
    const percentageFee = 0.02; // 2%
    const cost = fixedFee + (amount * percentageFee);

    // Fast delivery: 60-120 seconds
    const speed = 90;
    const reliability = 0.95; // 95% success rate

    const score = this.calculateScore(cost, speed, reliability);

    return {
      routeId: uuidv4(),
      psp: this,
      cost,
      speed,
      reliability,
      score,
      metadata: {
        provider: this.name,
        method: 'bank_transfer',
        estimatedDelivery: speed,
        minAmount: 50,
        maxAmount: 50000,
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'USDC'],
      },
    };
  }

  async isAvailable(): Promise<boolean> {
    return true; // Mock is always available
  }

  async getSupportedCurrencies(): Promise<string[]> {
    return ['USD', 'EUR', 'GBP', 'USDC'];
  }

  getCapabilities(): PSPCapabilities {
    return {
      minAmount: 50,
      maxAmount: 50000,
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'USDC'],
      supportedCountries: ['US', 'GB', 'DE', 'FR', 'IT', 'ES'],
      estimatedDelivery: 90,
      fees: {
        fixed: 5,
        percentage: 0.02,
      },
      methods: ['bank_transfer', 'card'],
    };
  }

  private calculateScore(cost: number, speed: number, reliability: number): number {
    // Weighted scoring: cost (40%), speed (30%), reliability (30%)
    // Normalize cost (lower is better, inverted)
    const normalizedCost = 1 / (1 + cost / 100);
    // Normalize speed (higher is better, inverted since lower seconds = faster)
    const normalizedSpeed = 1 / (1 + speed / 300);
    // Reliability is already 0-1

    return (normalizedCost * 0.4) + (normalizedSpeed * 0.3) + (reliability * 0.3);
  }
}

/**
 * Mock PSP Adapter 2: CheapTransfer (Cheap but slower)
 */
export class CheapTransferAdapter implements PSPAdapter {
  id = 'cheaptransfer';
  name = 'CheapTransfer';
  type = 'off_ramp' as const;
  corridors = ['EUR-US', 'GBP-EU', 'USD-EU'];

  async getRoute(request: RouteRequest): Promise<Route> {
    const { amount, corridor } = request;

    // CheapTransfer: Lower fees but slower delivery
    const fixedFee = 2;
    const percentageFee = 0.01; // 1%
    const cost = fixedFee + (amount * percentageFee);

    // Slower delivery: 180-300 seconds
    const speed = 240;
    const reliability = 0.92; // 92% success rate

    const score = this.calculateScore(cost, speed, reliability);

    return {
      routeId: uuidv4(),
      psp: this,
      cost,
      speed,
      reliability,
      score,
      metadata: {
        provider: this.name,
        method: 'bank_transfer',
        estimatedDelivery: speed,
        minAmount: 100,
        maxAmount: 100000,
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'USDC'],
      },
    };
  }

  async isAvailable(): Promise<boolean> {
    return true; // Mock is always available
  }

  async getSupportedCurrencies(): Promise<string[]> {
    return ['USD', 'EUR', 'GBP', 'USDC'];
  }

  getCapabilities(): PSPCapabilities {
    return {
      minAmount: 100,
      maxAmount: 100000,
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'USDC'],
      supportedCountries: ['US', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE'],
      estimatedDelivery: 240,
      fees: {
        fixed: 2,
        percentage: 0.01,
      },
      methods: ['bank_transfer'],
    };
  }

  private calculateScore(cost: number, speed: number, reliability: number): number {
    // Weighted scoring: cost (40%), speed (30%), reliability (30%)
    const normalizedCost = 1 / (1 + cost / 100);
    const normalizedSpeed = 1 / (1 + speed / 300);
    return (normalizedCost * 0.4) + (normalizedSpeed * 0.3) + (reliability * 0.3);
  }
}

/**
 * Mock PSP Adapter 3: ReliableRoute (Balanced)
 */
export class ReliableRouteAdapter implements PSPAdapter {
  id = 'reliableroute';
  name = 'ReliableRoute';
  type = 'off_ramp' as const;
  corridors = ['EUR-US', 'GBP-EU', 'USD-EU'];

  async getRoute(request: RouteRequest): Promise<Route> {
    const { amount, corridor } = request;

    // ReliableRoute: Balanced fees and speed
    const fixedFee = 3;
    const percentageFee = 0.015; // 1.5%
    const cost = fixedFee + (amount * percentageFee);

    // Balanced delivery: 120-180 seconds
    const speed = 150;
    const reliability = 0.98; // 98% success rate (highest)

    const score = this.calculateScore(cost, speed, reliability);

    return {
      routeId: uuidv4(),
      psp: this,
      cost,
      speed,
      reliability,
      score,
      metadata: {
        provider: this.name,
        method: 'bank_transfer',
        estimatedDelivery: speed,
        minAmount: 50,
        maxAmount: 75000,
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'USDC'],
      },
    };
  }

  async isAvailable(): Promise<boolean> {
    return true; // Mock is always available
  }

  async getSupportedCurrencies(): Promise<string[]> {
    return ['USD', 'EUR', 'GBP', 'USDC'];
  }

  getCapabilities(): PSPCapabilities {
    return {
      minAmount: 50,
      maxAmount: 75000,
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'USDC'],
      supportedCountries: ['US', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH'],
      estimatedDelivery: 150,
      fees: {
        fixed: 3,
        percentage: 0.015,
      },
      methods: ['bank_transfer', 'crypto'],
    };
  }

  private calculateScore(cost: number, speed: number, reliability: number): number {
    // Weighted scoring: cost (40%), speed (30%), reliability (30%)
    const normalizedCost = 1 / (1 + cost / 100);
    const normalizedSpeed = 1 / (1 + speed / 300);
    return (normalizedCost * 0.4) + (normalizedSpeed * 0.3) + (reliability * 0.3);
  }
}

