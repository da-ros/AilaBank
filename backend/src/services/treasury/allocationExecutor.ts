/**
 * Allocation Executor Service
 * Rule-based execution of allocation actions on Arc contracts
 */

import { ethers } from 'ethers';
import { AllocationRequest, ExecutionResult } from './types';
import CircleService from '../circle/circleService';

export class AllocationExecutor {
  private arcProvider: ethers.JsonRpcProvider;
  private signer?: ethers.Wallet;
  private vaultAddress?: string;
  private bufferAddress?: string;
  private yieldAllocatorAddress?: string;
  private usdcAddress?: string;
  private circleService: CircleService;

  constructor() {
    this.circleService = new CircleService();
    
    // Initialize Arc provider
    const arcRpcUrl = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network';
    this.arcProvider = new ethers.JsonRpcProvider(arcRpcUrl);

    // Initialize signer if private key is available
    const privateKey = process.env.ARC_PRIVATE_KEY;
    if (privateKey) {
      this.signer = new ethers.Wallet(privateKey, this.arcProvider);
    }

    // Load contract addresses
    this.vaultAddress = process.env.ARC_VAULT_ADDRESS;
    this.bufferAddress = process.env.ARC_BUFFER_ADDRESS;
    this.yieldAllocatorAddress = process.env.ARC_YIELD_ALLOCATOR_ADDRESS;
    this.usdcAddress = process.env.ARC_USDC_ADDRESS;
  }

  /**
   * Execute an allocation request
   */
  async executeAllocation(request: AllocationRequest): Promise<ExecutionResult> {
    const timestamp = new Date().toISOString();

    try {
      switch (request.action) {
        case 'allocate_to_yield':
          return await this.allocateToYield(request);
        
        case 'topup_buffer':
          return await this.topupBuffer(request);
        
        case 'rebalance':
          return await this.rebalance(request);
        
        case 'no_action':
          return {
            action: 'no_action',
            success: true,
            amount: 0,
            currency: request.currency,
            timestamp,
          };
        
        default:
          throw new Error(`Unknown action: ${request.action}`);
      }
    } catch (error: any) {
      console.error(`❌ Allocation execution failed:`, error);
      return {
        action: request.action,
        success: false,
        amount: request.amount,
        currency: request.currency,
        error: error.message,
        timestamp,
      };
    }
  }

  /**
   * Allocate funds to yield pool
   */
  private async allocateToYield(request: AllocationRequest): Promise<ExecutionResult> {
    if (!this.yieldAllocatorAddress || !this.usdcAddress || !this.signer) {
      throw new Error('Yield allocator not configured');
    }

    try {
      // If source is Circle, transfer to Arc first
      if (request.source === 'circle') {
        // This would require Circle wallet ID and transfer logic
        // For now, assume funds are already on Arc
        console.warn('⚠️  Circle to Arc transfer not fully implemented');
      }

      // Allocate to yield allocator contract
      const yieldAllocator = new ethers.Contract(
        this.yieldAllocatorAddress,
        [
          'function allocate(uint256 amount) external',
          'function deposit(uint256 amount) external',
        ],
        this.signer
      );

      const amountWei = ethers.parseUnits(request.amount.toString(), 6); // USDC has 6 decimals

      // Approve USDC spending
      const usdcContract = new ethers.Contract(
        this.usdcAddress,
        [
          'function approve(address spender, uint256 amount) external returns (bool)',
        ],
        this.signer
      );

      const approveTx = await usdcContract.approve(this.yieldAllocatorAddress, amountWei);
      await approveTx.wait();

      // Allocate to yield
      const allocateTx = await yieldAllocator.allocate(amountWei);
      const receipt = await allocateTx.wait();

      return {
        action: 'allocate_to_yield',
        success: true,
        amount: request.amount,
        currency: request.currency,
        txHash: receipt.hash,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Failed to allocate to yield: ${error.message}`);
    }
  }

  /**
   * Top up liquidity buffer
   */
  private async topupBuffer(request: AllocationRequest): Promise<ExecutionResult> {
    if (!this.bufferAddress || !this.usdcAddress || !this.signer) {
      throw new Error('Liquidity buffer not configured');
    }

    try {
      const bufferContract = new ethers.Contract(
        this.bufferAddress,
        [
          'function rebalanceBuffer(uint256 amount) external',
        ],
        this.signer
      );

      const amountWei = ethers.parseUnits(request.amount.toString(), 6);

      // Approve USDC spending
      const usdcContract = new ethers.Contract(
        this.usdcAddress,
        [
          'function approve(address spender, uint256 amount) external returns (bool)',
        ],
        this.signer
      );

      const approveTx = await usdcContract.approve(this.bufferAddress, amountWei);
      await approveTx.wait();

      // Top up buffer
      const topupTx = await bufferContract.rebalanceBuffer(amountWei);
      const receipt = await topupTx.wait();

      return {
        action: 'topup_buffer',
        success: true,
        amount: request.amount,
        currency: request.currency,
        txHash: receipt.hash,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Failed to top up buffer: ${error.message}`);
    }
  }

  /**
   * Rebalance allocations
   */
  private async rebalance(request: AllocationRequest): Promise<ExecutionResult> {
    if (!this.yieldAllocatorAddress || !this.signer) {
      throw new Error('Yield allocator not configured');
    }

    try {
      const yieldAllocator = new ethers.Contract(
        this.yieldAllocatorAddress,
        [
          'function rebalancePools(uint256 vaultTVL) external',
        ],
        this.signer
      );

      // Get current TVL (would need to query vault)
      const vaultTVL = request.parameters?.vaultTVL || 0;
      const vaultTVLWei = ethers.parseUnits(vaultTVL.toString(), 6);

      const rebalanceTx = await yieldAllocator.rebalancePools(vaultTVLWei);
      const receipt = await rebalanceTx.wait();

      return {
        action: 'rebalance',
        success: true,
        amount: request.amount,
        currency: request.currency,
        txHash: receipt.hash,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Failed to rebalance: ${error.message}`);
    }
  }
}

