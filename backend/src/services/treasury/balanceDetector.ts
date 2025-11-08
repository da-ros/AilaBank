/**
 * Balance Detector Service
 * Rule-based idle balance detection across Circle and Arc
 */

import CircleService from '../circle/circleService';
import { BalanceSnapshot, IdleBalance } from './types';
import { ethers } from 'ethers';

export class BalanceDetector {
  private circleService: CircleService;
  private arcProvider: ethers.JsonRpcProvider;
  private vaultAddress?: string;
  private bufferAddress?: string;
  private yieldAllocatorAddress?: string;
  private usdcAddress?: string;

  constructor() {
    this.circleService = new CircleService();
    
    // Initialize Arc provider
    const arcRpcUrl = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network';
    this.arcProvider = new ethers.JsonRpcProvider(arcRpcUrl);

    // Load contract addresses from env
    this.vaultAddress = process.env.ARC_VAULT_ADDRESS;
    this.bufferAddress = process.env.ARC_BUFFER_ADDRESS;
    this.yieldAllocatorAddress = process.env.ARC_YIELD_ALLOCATOR_ADDRESS;
    this.usdcAddress = process.env.ARC_USDC_ADDRESS;
  }

  /**
   * Get all balance snapshots from Circle and Arc
   */
  async getBalanceSnapshots(): Promise<BalanceSnapshot[]> {
    const snapshots: BalanceSnapshot[] = [];
    const timestamp = new Date().toISOString();

    try {
      // Get Circle balances
      const circleBalances = await this.getCircleBalances();
      snapshots.push(...circleBalances.map(b => ({
        ...b,
        timestamp,
      })));

      // Get Arc vault balance
      if (this.vaultAddress) {
        const vaultBalance = await this.getArcVaultBalance();
        if (vaultBalance) {
          snapshots.push({
            ...vaultBalance,
            timestamp,
          });
        }
      }

      // Get Arc buffer balance
      if (this.bufferAddress) {
        const bufferBalance = await this.getArcBufferBalance();
        if (bufferBalance) {
          snapshots.push({
            ...bufferBalance,
            timestamp,
          });
        }
      }

      // Get Arc yield allocator balance
      if (this.yieldAllocatorAddress) {
        const yieldBalance = await this.getArcYieldBalance();
        if (yieldBalance) {
          snapshots.push({
            ...yieldBalance,
            timestamp,
          });
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to get balance snapshots:', error);
    }

    return snapshots;
  }

  /**
   * Detect idle balances (funds that haven't moved in threshold time)
   */
  async detectIdleBalances(
    idleThresholdSeconds: number = 3600 // Default: 1 hour
  ): Promise<IdleBalance[]> {
    const idleBalances: IdleBalance[] = [];
    const now = new Date();

    try {
      // Get Circle wallets
      const circleBalances = await this.getCircleBalances();
      
      for (const balance of circleBalances) {
        // For Circle, we consider funds idle if balance > threshold and no recent activity
        // In production, you'd check transaction history
        if (balance.balance > 100) { // Threshold: $100 USDC
          idleBalances.push({
            source: 'circle',
            amount: balance.balance,
            currency: balance.currency,
            walletId: balance.walletId,
            idleSince: new Date(now.getTime() - idleThresholdSeconds * 1000).toISOString(),
            idleDuration: idleThresholdSeconds,
          });
        }
      }

      // Get Arc vault balance
      if (this.vaultAddress) {
        const vaultBalance = await this.getArcVaultBalance();
        if (vaultBalance && vaultBalance.balance > 100) {
          idleBalances.push({
            source: 'arc_vault',
            amount: vaultBalance.balance,
            currency: vaultBalance.currency,
            address: vaultBalance.address,
            idleSince: new Date(now.getTime() - idleThresholdSeconds * 1000).toISOString(),
            idleDuration: idleThresholdSeconds,
          });
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to detect idle balances:', error);
    }

    return idleBalances;
  }

  /**
   * Get Circle wallet balances
   */
  private async getCircleBalances(): Promise<BalanceSnapshot[]> {
    try {
      // Get wallets from database (users with circle_wallet_id)
      const { supabase } = await import('../../db/supabase.js');
      const { data: users, error } = await supabase
        .from('users')
        .select('circle_wallet_id, address')
        .not('circle_wallet_id', 'is', null);

      if (error) {
        console.error('⚠️  Failed to get users:', error);
        return [];
      }

      const balances: BalanceSnapshot[] = [];
      
      for (const user of users || []) {
        if (!user.circle_wallet_id) continue;

        try {
          // Get wallet balance
          const walletDetails = await this.circleService.getWallet(user.circle_wallet_id);
          
          if (walletDetails?.balances) {
            for (const balance of walletDetails.balances) {
              balances.push({
                source: 'circle',
                balance: parseFloat(balance.amount || '0'),
                currency: balance.currency || 'USDC',
                walletId: user.circle_wallet_id,
                address: user.address || walletDetails.address,
                timestamp: new Date().toISOString(),
              });
            }
          }
        } catch (error: any) {
          console.warn(`⚠️  Failed to get balance for wallet ${user.circle_wallet_id}:`, error.message);
          continue;
        }
      }

      return balances;
    } catch (error: any) {
      console.error('⚠️  Failed to get Circle balances:', error);
      return [];
    }
  }

  /**
   * Get Arc vault balance
   */
  private async getArcVaultBalance(): Promise<BalanceSnapshot | null> {
    if (!this.vaultAddress || !this.usdcAddress) {
      return null;
    }

    try {
      // Simple ERC20 balance check
      const usdcContract = new ethers.Contract(
        this.usdcAddress,
        ['function balanceOf(address) view returns (uint256)'],
        this.arcProvider
      );

      const balance = await usdcContract.balanceOf(this.vaultAddress);
      const balanceFormatted = parseFloat(ethers.formatUnits(balance, 6)); // USDC has 6 decimals

      return {
        source: 'arc_vault',
        balance: balanceFormatted,
        currency: 'USDC',
        address: this.vaultAddress,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('⚠️  Failed to get Arc vault balance:', error);
      return null;
    }
  }

  /**
   * Get Arc buffer balance
   */
  private async getArcBufferBalance(): Promise<BalanceSnapshot | null> {
    if (!this.bufferAddress || !this.usdcAddress) {
      return null;
    }

    try {
      const usdcContract = new ethers.Contract(
        this.usdcAddress,
        ['function balanceOf(address) view returns (uint256)'],
        this.arcProvider
      );

      const balance = await usdcContract.balanceOf(this.bufferAddress);
      const balanceFormatted = parseFloat(ethers.formatUnits(balance, 6));

      return {
        source: 'arc_buffer',
        balance: balanceFormatted,
        currency: 'USDC',
        address: this.bufferAddress,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('⚠️  Failed to get Arc buffer balance:', error);
      return null;
    }
  }

  /**
   * Get Arc yield allocator balance
   */
  private async getArcYieldBalance(): Promise<BalanceSnapshot | null> {
    if (!this.yieldAllocatorAddress || !this.usdcAddress) {
      return null;
    }

    try {
      const usdcContract = new ethers.Contract(
        this.usdcAddress,
        ['function balanceOf(address) view returns (uint256)'],
        this.arcProvider
      );

      const balance = await usdcContract.balanceOf(this.yieldAllocatorAddress);
      const balanceFormatted = parseFloat(ethers.formatUnits(balance, 6));

      return {
        source: 'arc_yield',
        balance: balanceFormatted,
        currency: 'USDC',
        address: this.yieldAllocatorAddress,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('⚠️  Failed to get Arc yield balance:', error);
      return null;
    }
  }
}

