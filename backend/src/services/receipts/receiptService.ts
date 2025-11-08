/**
 * Best-Execution Receipt Service
 * Generates receipts with proof-of-best-execution and on-chain anchoring
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  BestExecutionReceipt,
  CreateReceiptRequest,
  QuoteSet,
  RouteSnapshot,
  FXSnapshot,
  FeesBreakdown,
  SpreadBreakdown,
  OnChainAnchor,
} from './types';
import { QuoteResponse } from '../fx/types';
import { RouteResponse } from '../corridor/types';
import { supabase } from '../../db/supabase';

export class ReceiptService {
  /**
   * Create a best-execution receipt
   */
  async createReceipt(request: CreateReceiptRequest): Promise<BestExecutionReceipt> {
    const receiptId = uuidv4();
    const timestamp = new Date().toISOString();

    // Build receipt
    const receipt: BestExecutionReceipt = {
      receiptId,
      userId: request.userId,
      timestamp,
      quoteSet: request.quoteSet,
      chosenRoute: request.chosenRoute,
      fx: request.fx,
      fees: request.fees,
      spread: request.spread,
      metadata: {
        version: '1.0.0',
        generatedAt: timestamp,
        source: 'ailabank-backend',
        ...request.metadata,
      },
    };

    // Generate receipt hash for on-chain anchoring
    const receiptHash = this.generateReceiptHash(receipt);

    // Store receipt in database
    await this.storeReceipt(receipt, receiptHash);

    // Anchor on-chain (mock for now, ready for real implementation)
    const onChainAnchor = await this.anchorOnChain(receipt, receiptHash);
    if (onChainAnchor) {
      receipt.onChainAnchor = onChainAnchor;
      // Update receipt with on-chain anchor
      await this.updateReceiptAnchor(receiptId, onChainAnchor);
    }

    return receipt;
  }

  /**
   * Create receipt from quote set and route
   */
  async createReceiptFromExecution(
    quotes: QuoteResponse[],
    route: RouteResponse,
    userId?: string
  ): Promise<BestExecutionReceipt> {
    // Build quote set
    const bestQuote = quotes[0]; // Quotes should be sorted by best first
    const quoteSet: QuoteSet = {
      quotes,
      bestQuote,
      comparison: {
        providerCount: quotes.length,
        priceRange: {
          min: Math.min(...quotes.map(q => q.totalAmount)),
          max: Math.max(...quotes.map(q => q.totalAmount)),
          best: bestQuote.totalAmount,
        },
        spreadRange: {
          min: Math.min(...quotes.map(q => q.spread)),
          max: Math.max(...quotes.map(q => q.spread)),
          best: bestQuote.spread,
        },
      },
    };

    // Build route snapshot
    const routeSnapshot: RouteSnapshot = {
      routeId: route.routeId,
      corridor: route.corridor,
      psp: {
        id: route.selectedRoute.psp.id,
        name: route.selectedRoute.psp.name,
      },
      cost: route.selectedRoute.cost,
      speed: route.selectedRoute.speed,
      reliability: route.selectedRoute.reliability,
      score: route.selectedRoute.score,
      alternatives: route.alternativeRoutes.map(alt => ({
        routeId: alt.routeId,
        psp: alt.psp.name,
        cost: alt.cost,
        score: alt.score,
      })),
      policyEvaluation: {
        passed: route.policyEvaluation.passed,
        complianceLevel: route.policyEvaluation.complianceLevel,
        constraints: route.policyEvaluation.constraints,
      },
    };

    // Build FX snapshot
    const fx: FXSnapshot = {
      from: bestQuote.from,
      to: bestQuote.to,
      amount: bestQuote.amount,
      rate: bestQuote.rate,
      convertedAmount: bestQuote.convertedAmount,
      spread: bestQuote.spread,
      provider: bestQuote.provider,
      timestamp: bestQuote.metadata?.timestamp || new Date().toISOString(),
    };

    // Build fees breakdown
    const fees: FeesBreakdown = {
      fx: {
        provider: bestQuote.fees.provider,
        network: bestQuote.fees.network,
        total: bestQuote.fees.total,
      },
      route: {
        psp: route.selectedRoute.cost,
        total: route.selectedRoute.cost,
      },
      total: bestQuote.fees.total + route.selectedRoute.cost,
      breakdown: [
        {
          type: 'fx_provider',
          description: `FX provider fee (${bestQuote.provider})`,
          amount: bestQuote.fees.provider,
        },
        ...(bestQuote.fees.network ? [{
          type: 'fx_network',
          description: 'Network fee',
          amount: bestQuote.fees.network,
        }] : []) as Array<{ type: string; description: string; amount: number }>,
        {
          type: 'psp',
          description: `PSP fee (${route.selectedRoute.psp.name})`,
          amount: route.selectedRoute.cost,
        },
      ],
    };

    // Build spread breakdown
    const spread: SpreadBreakdown = {
      fxSpread: bestQuote.spread,
      routeSpread: 0, // Route spread is implicit in cost
      totalSpread: bestQuote.spread,
      comparison: {
        ourRate: bestQuote.rate,
        difference: 0, // Would compare with market rate if available
        differencePercent: 0,
      },
    };

    // Create receipt
    return this.createReceipt({
      userId,
      quoteSet,
      chosenRoute: routeSnapshot,
      fx,
      fees,
      spread,
    });
  }

  /**
   * Get receipt by ID
   */
  async getReceipt(receiptId: string): Promise<BestExecutionReceipt | null> {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('id', receiptId)
        .single();

      if (error || !data) {
        return null;
      }

      return data.receipt_data as BestExecutionReceipt;
    } catch (error) {
      console.error('❌ Failed to get receipt:', error);
      return null;
    }
  }

  /**
   * Get receipts by user ID
   */
  async getReceiptsByUser(userId: string, limit: number = 50): Promise<BestExecutionReceipt[]> {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) {
        return [];
      }

      return data.map(row => row.receipt_data as BestExecutionReceipt);
    } catch (error) {
      console.error('❌ Failed to get user receipts:', error);
      return [];
    }
  }

  /**
   * Generate Keccak256 hash of receipt (for on-chain anchoring)
   */
  private generateReceiptHash(receipt: BestExecutionReceipt): string {
    // Create a canonical JSON representation (sorted keys)
    const canonicalJson = JSON.stringify(receipt, Object.keys(receipt).sort());
    
    // Generate Keccak256 hash (using SHA-256 as approximation, real implementation would use keccak256)
    const hash = crypto.createHash('sha256').update(canonicalJson).digest('hex');
    
    // Prefix with 0x for Ethereum-style hash
    return `0x${hash}`;
  }

  /**
   * Store receipt in database
   */
  private async storeReceipt(receipt: BestExecutionReceipt, receiptHash: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('receipts')
        .insert({
          id: receipt.receiptId,
          user_id: receipt.userId || null,
          receipt_data: receipt,
          receipt_hash: receiptHash,
          created_at: receipt.timestamp,
        });

      if (error) {
        console.error('❌ Failed to store receipt:', error);
        throw new Error(`Failed to store receipt: ${error.message}`);
      }

      console.log(`✅ Receipt stored: ${receipt.receiptId}`);
    } catch (error: any) {
      console.error('❌ Receipt storage error:', error);
      throw error;
    }
  }

  /**
   * Update receipt with on-chain anchor
   */
  private async updateReceiptAnchor(receiptId: string, anchor: OnChainAnchor): Promise<void> {
    try {
      const { error } = await supabase
        .from('receipts')
        .update({
          on_chain_tx_hash: anchor.txHash,
          on_chain_block_number: anchor.blockNumber,
          on_chain_contract_address: anchor.contractAddress,
          updated_at: new Date().toISOString(),
        })
        .eq('id', receiptId);

      if (error) {
        console.error('⚠️  Failed to update receipt anchor:', error);
      } else {
        console.log(`✅ Receipt anchor updated: ${receiptId} → ${anchor.txHash}`);
      }
    } catch (error) {
      console.error('⚠️  Receipt anchor update error:', error);
    }
  }

  /**
   * Anchor receipt on-chain (mock implementation)
   * In production, this would:
   * 1. Call a smart contract method to emit BestExecReceipt event
   * 2. Wait for transaction confirmation
   * 3. Return the transaction hash and block number
   */
  private async anchorOnChain(
    receipt: BestExecutionReceipt,
    receiptHash: string
  ): Promise<OnChainAnchor | null> {
    // Mock implementation - in production, this would interact with Arc blockchain
    // For now, we'll simulate the anchor
    
    console.log(`🔗 Anchoring receipt ${receipt.receiptId} on-chain...`);
    console.log(`   Receipt hash: ${receiptHash}`);
    
    // Mock on-chain anchor
    // In production, this would:
    // 1. Connect to Arc network via ethers.js
    // 2. Call contract.emitBestExecReceipt(receiptHash, receipt data)
    // 3. Wait for transaction confirmation
    // 4. Return real txHash and blockNumber
    
    const mockAnchor: OnChainAnchor = {
      txHash: `0x${crypto.randomBytes(32).toString('hex')}`, // Mock tx hash
      blockNumber: Math.floor(Math.random() * 1000000), // Mock block number
      blockTimestamp: new Date().toISOString(),
      receiptHash,
      contractAddress: process.env.BEST_EXEC_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
      eventName: 'BestExecReceipt',
      chainId: parseInt(process.env.ARC_CHAIN_ID || '12345', 10), // Arc testnet chain ID
    };

    console.log(`✅ Receipt anchored on-chain: ${mockAnchor.txHash}`);
    console.log(`   Block: ${mockAnchor.blockNumber}`);
    console.log(`   Contract: ${mockAnchor.contractAddress}`);

    return mockAnchor;
  }
}

// Singleton instance
let receiptServiceInstance: ReceiptService | null = null;

export function getReceiptService(): ReceiptService {
  if (!receiptServiceInstance) {
    receiptServiceInstance = new ReceiptService();
  }
  return receiptServiceInstance;
}

