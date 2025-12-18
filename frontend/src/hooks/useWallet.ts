/**
 * Wallet Hook
 * Manages Circle wallet operations and balance
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { walletAPI } from '../lib/api-client';
import { useAuth } from '../contexts/AuthContext';

interface WalletBalance {
  amount: string;
  currency: string;
  token?: {
    symbol?: string;
    name?: string;
  };
}

interface Wallet {
  id: string;
  balances: WalletBalance[];
  state: string;
}

export const useWallet = () => {
  const { user, isAuthenticated } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs to prevent infinite loops
  const loadingWalletRef = useRef(false);
  const loadingBalanceRef = useRef(false);
  const walletLoadedRef = useRef(false);

  const loadBalance = useCallback(async () => {
    if (!isAuthenticated || !wallet?.id) return;
    if (loadingBalanceRef.current) return; // Prevent concurrent calls

    loadingBalanceRef.current = true;
    setBalanceLoading(true);
    setError(null);
    
    try {
      const response = await walletAPI.getBalance();
      if (response.success && response.balances) {
        // Debug: Log the raw response to understand Circle's format
        console.log('🔍 Raw balance response:', JSON.stringify(response.balances, null, 2));
        
        // Handle Circle API response format
        // Circle returns tokenBalances which might have different structure
        const formattedBalances = response.balances.map((balance: any) => {
          // Handle different possible formats from Circle API
          // Preserve the token object so we can access token.symbol for matching
          if (balance.token) {
            // Format: { amount: "5.05", token: { symbol: "USDC-TESTNET", ... } }
            const formatted = {
              amount: balance.amount || '0',
              currency: balance.token?.symbol || balance.currency || 'USDC',
              token: balance.token, // Preserve token object for symbol matching
            };
            console.log('📊 Formatted balance (token format):', formatted);
            return formatted;
          } else if (balance.currency) {
            // Format: { amount: "100.00", currency: "USDC" }
            const formatted = {
              amount: balance.amount || '0',
              currency: balance.currency,
            };
            console.log('📊 Formatted balance (currency format):', formatted);
            return formatted;
          } else {
            // Fallback
            const formatted = {
              amount: balance.amount || '0',
              currency: 'USDC',
            };
            console.log('📊 Formatted balance (fallback):', formatted);
            return formatted;
          }
        });
        
        console.log('✅ Setting balances:', formattedBalances);
        setBalances(formattedBalances);
      }
    } catch (err: any) {
      console.error('Failed to load balance:', err);
      setError(err.message || 'Failed to load balance');
    } finally {
      setBalanceLoading(false);
      loadingBalanceRef.current = false;
    }
  }, [isAuthenticated, wallet?.id]);

  const loadWallet = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    if (loadingWalletRef.current) return; // Prevent concurrent calls

    loadingWalletRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const response = await walletAPI.getWallet();
      if (response.success && response.wallet) {
        setWallet(response.wallet);
        walletLoadedRef.current = true;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load wallet');
      // If wallet doesn't exist, try to create one
      if (err.message?.includes('not found') || err.message?.includes('404')) {
        try {
          await createWallet();
        } catch (createErr) {
          console.error('Failed to create wallet:', createErr);
        }
      }
    } finally {
      setLoading(false);
      loadingWalletRef.current = false;
    }
  }, [isAuthenticated, user?.id]);

  const createWallet = useCallback(async (address?: string) => {
    if (loadingWalletRef.current) return;
    
    loadingWalletRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const response = await walletAPI.createWallet(address);
      if (response.success && response.wallet) {
        setWallet(response.wallet);
        walletLoadedRef.current = true;
        // Load balance after wallet is created
        await loadBalance();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create wallet');
      throw err;
    } finally {
      setLoading(false);
      loadingWalletRef.current = false;
    }
  }, [loadBalance]);

  // Load wallet once when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id && !wallet && !loadingWalletRef.current && !walletLoadedRef.current) {
      loadWallet();
    }
  }, [isAuthenticated, user?.id, wallet, loadWallet]);

  // Load balance once when wallet is loaded
  useEffect(() => {
    if (wallet?.id && isAuthenticated && !loadingBalanceRef.current && balances.length === 0) {
      loadBalance();
    }
  }, [wallet?.id, isAuthenticated, loadBalance, balances.length]);

  const getUSDCBalance = (): number => {
    // Try multiple currency formats that Circle might return
    // Circle returns "USDC-TESTNET" for testnet, "USDC" for mainnet
    const usdcBalance = balances.find(b => {
      const currency = b.currency?.toUpperCase() || b.token?.symbol?.toUpperCase() || '';
      // Match USDC, USD, or any variant like USDC-TESTNET, USDC-MAINNET, etc.
      return currency === 'USDC' || 
             currency === 'USD' || 
             currency.startsWith('USDC') ||
             currency.includes('USDC');
    });
    
    if (!usdcBalance) {
      console.log('⚠️ No USDC balance found in:', balances);
      console.log('   Available currencies:', balances.map(b => b.currency || b.token?.symbol));
      return 0;
    }
    
    const amount = usdcBalance.amount || '0';
    const currency = usdcBalance.currency || usdcBalance.token?.symbol || 'USDC';
    console.log('💰 Raw USDC amount:', amount, 'currency:', currency, 'from balance:', usdcBalance);
    
    // Circle API returns amount as string in decimal format (e.g., "5.05")
    // For testnet, it's already in the correct format
    // For mainnet, it might be in smallest units, but typically it's already decimal
    const parsed = parseFloat(amount);
    
    // Check if amount is in smallest units (no decimal point and very large)
    // USDC typically has 6 decimals, but testnet might have 18 decimals
    // If amount is very large (> 1000) and has no decimal point, it might be in smallest units
    if (parsed > 1000 && !amount.includes('.')) {
      // Try 6 decimals first (mainnet USDC standard)
      const converted6 = parsed / 1e6;
      // Try 18 decimals (testnet might use this)
      const converted18 = parsed / 1e18;
      
      // Use the one that makes more sense (between 0.01 and 1000000)
      if (converted6 >= 0.01 && converted6 <= 1000000) {
        console.log('🔄 Converted from smallest units (6 decimals):', parsed, '->', converted6);
        return converted6;
      } else if (converted18 >= 0.01 && converted18 <= 1000000) {
        console.log('🔄 Converted from smallest units (18 decimals):', parsed, '->', converted18);
        return converted18;
      }
    }
    
    console.log('✅ Using parsed amount as-is:', parsed);
    return parsed;
  };

  const transferToArc = useCallback(async (destinationAddress: string, amount: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await walletAPI.transferToArc(destinationAddress, amount);
      if (response.success) {
        // Reload balance after transfer
        await loadBalance();
        return response.transfer;
      }
    } catch (err: any) {
      setError(err.message || 'Transfer failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadBalance]);

  const createDepositAddress = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await walletAPI.createDepositAddress();
      if (response.success) {
        return response;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create deposit address');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate USDC balance
  // Return undefined only if we haven't attempted to load balances yet
  // Return 0 if balances were fetched but no USDC found (or balance is actually 0)
  // Use a flag to track if we've ever successfully loaded balances
  const hasLoadedBalances = balances.length > 0 || (!balanceLoading && wallet?.id);
  const usdcBalance = hasLoadedBalances ? getUSDCBalance() : undefined;

  return {
    wallet,
    balances,
    usdcBalance,
    loading: loading || balanceLoading,
    error,
    loadWallet,
    createWallet,
    loadBalance,
    transferToArc,
    createDepositAddress,
  };
};

